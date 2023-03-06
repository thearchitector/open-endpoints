module main

import vweb

struct App {
	vweb.Context
}

fn main() {
	vweb.run_at(&App{}, 8000)
}
