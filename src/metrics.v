module main

import db.pg
import json
import os

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

['/metrics/generic'; post]
pub fn (mut app App) generic() vweb.Result {
	// try to parse the incoming payload
	payload := json.decode(GeneicMetricScheme, app.req.data) or {
		app.set_status(422, '')
		return app.json({
			'error': 'Invalid metric request. Your payload must include at least a numeric metric and a unique identifying slug.'
		})
	}

	// open a db connection
	db := pg.connect(pg.Config{
		host: os.getenv_opt('PGHOST') or { 'localhost' }
		port: os.getenv_opt('PGPORT').int() or { 5432 }
		user: os.getenv_opt('PGUSER') or { 'postgres' }
		password: os.getenv_opt('PGPASSWORD') or { 'password' }
		dbname: os.getenv_opt('PGDATABASE') or { 'openendpoints' }
	}) or {
		app.set_status(503, '')
		return app.json({
			'error': "We're looking for some hamburgers. Please try again later."
		})
	}

	// close the connection, but wait until the function returns
	defer {
		db.close()
	}

	// using the slug, fetch existing metrics from the database
	metrics := sql db {
		select from GeneicMetric where slug == payload.slug
	}
	if metrics.len == 1 {
		metric := metrics[0]

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
		sql db {
			update GeneicMetric set metric = payload.metric, percentage = payload.percentage
			where id == metric.id
		}

		app.set_status(200, '')
		return app.json({
			'status': 'The metric has been updated successfully.'
		})
	}

	// if the metric doesn't exist (the slug isn't taken), make a new one
	mut metric := &GeneicMetric{
		slug: payload.slug
		metric: payload.metric
		percentage: payload.percentage
	}

	// insert the new metric and then query for it in order to get the authkey
	sql db {
		insert metric into GeneicMetric
	}
	metric = sql db {
		select from GeneicMetric where slug == payload.slug limit 1
	}

	app.set_status(200, '')
	return app.json({
		'status':  'A new metric has been created successfully. To update the metric, use returned authentication key in future requests via the `authkey` field.'
		'authkey': metric.authkey
	})
}
