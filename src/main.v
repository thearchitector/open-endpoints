module main

import vweb
import db.pg
import os

struct App {
	vweb.Context
pub mut:
	db pg.DB
}

fn main() {
	// open a db connection
	port := os.getenv_opt('PGPORT') or { '5432' }
	db := pg.connect(pg.Config{
		host: os.getenv_opt('PGHOST') or { 'localhost' }
		port: port.int()
		user: os.getenv_opt('PGUSER') or { 'postgres' }
		password: os.getenv_opt('PGPASSWORD') or { 'password' }
		dbname: os.getenv_opt('PGDATABASE') or { 'openendpoints' }
	}) or { panic("We're looking for some hamburgers. Please try again later.") }

	// close the connection, but wait until the app exists
	defer {
		db.close()
	}

	vweb.run(App{
		db: db
	}, 8000)
}
