module main

import json
import vweb
import regex

const slug_pattern = regex.regex_opt(r'^[\A\a\d]+$') or { panic('bad pattern') }

[table: 'metrics']
struct GenericMetric {
	id         int    [primary; sql: serial]
	slug       string [nonull; unique]
	metric     int    [nonull]
	percentage bool   [default: 'false'; sql_type: 'boolean']
	authkey    string [default: 'gen_random_uuid()'; sql_type: 'uuid'; unique]
}

struct GenericMetricScheme {
	slug       string [required]
	metric     int    [required]
	percentage bool
	authkey    string
}

['/metrics/generic/:slug'; get]
pub fn (mut app App) get_metric(slug string) vweb.Result {
	// validate the slug to ensure it's not weird
	if !slug_pattern.matches_string(slug) {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid slug. Slugs must only contain letters and numbers.'
		})
	}

	// using the slug, fetch existing metrics from the database
	metrics := sql app.db {
		select from GenericMetric where slug == slug
	}
	if metrics.len == 0 {
		app.set_status(404, '')
		return app.json({
			'error': 'No metric is known with the provided slug.'
		})
	}

	// encode the metric as a Shields.io endpoint payload and return
	numeric_s := '${metrics[0].metric}' + (if metrics[0].percentage { '%' } else { '' })
	// TODO: v maps don't support multiple types
	// is this really the only way of sending a heterogeneously-typed json?
	app.set_content_type('application/json')
	return app.ok('{"schemaVersion":1,"label":"metric","message":"${numeric_s}"}')
}

['/metrics/generic'; post]
pub fn (mut app App) create_update_metric() vweb.Result {
	// try to parse the incoming payload
	// panic(app.req.data)
	payload := json.decode(GenericMetricScheme, app.req.data) or {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid metric request. Your payload must include at least a numeric metric and a unique identifying slug.'
		})
	}

	// validate the slug to ensure it's not weird
	if !slug_pattern.matches_string(payload.slug) {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid slug. Slugs must only contain letters and numbers.'
		})
	}

	// using the slug, fetch existing metrics from the database
	metrics := sql app.db {
		select from GenericMetric where slug == payload.slug
	}
	if metrics.len == 0 {
		// if the metric doesn't exist (the slug isn't taken), make a new one
		mut metric := GenericMetric{
			slug: payload.slug
			metric: payload.metric
			percentage: payload.percentage
		}

		// insert the new metric and then query for it in order to get the authkey
		sql app.db {
			insert metric into GenericMetric
		}
		metric = sql app.db {
			select from GenericMetric where slug == payload.slug limit 1
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
	if payload.authkey != metrics[0].authkey {
		app.set_status(401, '')
		return app.json({
			'error': "You don't have permission to update this metric."
		})
	}

	// update the metric in the database. we already know the id so use it
	// to update the entry
	sql app.db {
		update GenericMetric set metric = payload.metric, percentage = payload.percentage
		where id == metrics[0].id
	}

	app.set_status(200, '')
	return app.json({
		'status': 'The metric has been updated successfully.'
	})
}
