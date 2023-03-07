module main

import json
import vweb
import regex

const slug_pattern = regex.regex_opt(r'[\A\a\d]+[\w\-]*[\A\a\d]+')!

[table: 'metrics']
struct GeneicMetric {
	id         int    [primary; sql: serial]
	slug       string [nonull; unique]
	metric     f64    [nonull]
	percentage bool   [default: false]
	authkey    string [default: 'gen_random_uuid()'; sql_type: 'uuid'; unique]
}

struct GeneicMetricScheme {
	slug       string [required]
	metric     f64    [required]
	percentage bool
	authkey    string
}

['/metrics/generic/:slug'; get]
pub fn (mut app App) get_metric(slug string) vweb.Result {
	// validate the slug to ensure it's not weird
	if !slug_pattern.matches_string(slug) {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid slug. Slugs must begin and end with a letter or number, and may only contain letters, number, underscores, and hyphens.'
		})
	}

	// using the slug, fetch existing metrics from the database
	metric := sql app.db {
		select from GeneicMetric where slug == slug limit 1
	} or {
		app.set_status(404, '')
		return app.json({
			'error': 'No metric is known with the provided slug.'
		})
	}

	// encode the metric as a Shields.io endpoint payload and return
	numeric := (if metric.percentage { 100 } else { 1 }) * metric.metric
	return app.json(json.encode("{
			'schemaVersion': 1,
			'label': 'metric',
			'message': '${numeric:.0}'
		})"))
}

['/metrics/generic'; post]
pub fn (mut app App) create_metric() vweb.Result {
	// try to parse the incoming payload
	payload := json.decode(GeneicMetricScheme, app.req.data) or {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid metric request. Your payload must include at least a numeric metric and a unique identifying slug.'
		})
	}

	// validate the slug to ensure it's not weird
	if !slug_pattern.matches_string(payload.slug) {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid slug. Slugs must begin and end with a letter or number, and may only contain letters, number, underscores, and hyphens.'
		})
	}

	// using the slug, fetch existing metrics from the database
	metric := sql app.db {
		select from GeneicMetric where slug == payload.slug limit 1
	} or {
		// if the metric doesn't exist (the slug isn't taken), make a new one
		mut metric := GeneicMetric{
			slug: payload.slug
			metric: payload.metric
			percentage: payload.percentage
		}

		// insert the new metric and then query for it in order to get the authkey
		sql app.db {
			insert metric into GeneicMetric
		}
		metric = sql app.db {
			select from GeneicMetric where slug == payload.slug limit 1
		}

		app.set_status(200, '')
		return app.json({
			'status':  'A new metric has been created successfully. To update the metric, use returned authentication key in future requests via the `authkey` field.'
			'authkey': metric.authkey
		})
	}

	// if an existing metric exists, we need to verify the user
	// can update it by comparing the authentication keys
	// TODO: probably need to hmac and constant-time compare these
	if payload.authkey != metric.authkey {
		app.set_status(401, '')
		return app.json({
			'error': "You don't have permission to update this metric."
		})
	}

	// update the metric in the database. we already know the id so use it
	// to update the entry
	sql app.db {
		update GeneicMetric set metric = payload.metric, percentage = payload.percentage
		where id == metric.id
	}

	app.set_status(200, '')
	return app.json({
		'status': 'The metric has been updated successfully.'
	})
}
