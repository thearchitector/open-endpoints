# openendpoint-tools

![build status](https://img.shields.io/github/actions/workflow/status/thearchitector/openendpoint-tools/ci.yaml?style=flat-square)
![mit license](https://img.shields.io/github/license/thearchitector/openendpoint-tools?style=flat-square)

It's like Hamburger Helper, but DevOps REST endpoints for projects instead.

A set of arguably useful endpoints for various management, testing, and distribution purposes.

<https://openendpoint.tools>

## Endpoints

- [/ping/](polypong/README.md)

  A better (by some metrics) healthcheck endpoint.

- [/metrics/generic](api/src/metrics.v)

  Sending a `POST` request to this endpoint will store the given number alongside the provided slug. Slugs must be alphanumeric. After creation, you must supply the `authkey` in order to update it.

  ```json
  {
    "slug": "<your project slug>",
    "metric": 47,
    "percentage": false,
    "authkey": "<the key returned after initial creation used for updating>"
  }
  ```

  Sending a `GET` request to this endpoint will return a JSON object matching the [Shield.io custom endpoint schema](https://shields.io/endpoint).

  ```sh
  $ curl /metrics/generic/YOUR_SLUG
  {
      "schemaVersion": 1,
      "label": "metric",
      "message": "47",
  }
  ```

## Development

This project is an experiment / prototype application running on the V language and builtin application server `vweb`. Structurally, each endpoint group is a file that contains both the routes and controlling functions for said group.

There is no builtin way to test vweb server endpoints, so the tests are written as `curl` commands in the `./api/scripts/tests.sh` script. To test:

```sh
$ docker compose down --volumes
$ docker compose run --rm api ./scripts/tests.sh
```

## License

Copyright (c) 2023 Elias Gabriel

This tool and its source code are licensed under MIT. See the license [here](./LICENSE).
