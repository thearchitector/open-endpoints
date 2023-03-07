# open-endpoints

It's like Hamburger Helper, but DevOp REST endpoints for projects instead.

A set of arguably useful endpoints for various management, testing, and distribution purposes.

## Endpoints

- [/metrics/generic](src/metrics.v)

    Sending a `POST` request to this endpoint will store the given number alongside the provided slug.
    
    ```json
    {
        "slug": "your-project-name",
        "metric": 47.8,
        "percentage": false,
        "authkey": "<the key returned after initial creation used for updating>"
    }
    ```

    Sending a `GET` request to this endpoint will return a JSON object matching the [Shield.io custom endpoint schema](https://shields.io/endpoint).

    ```sh
    $ curl thearchitector.dev/openendpoints/metrics/generic&slug=YOUR_SLUG
    {
        "schemaVersion": 1,
        "label": "metric",
        "message": "47.8",
    }
    ```

## Development

This project is an experiment / prototype application running on the V language and builtin application server `vweb`. Structurally, each endpoint group is a file that contains both the routes and controlling functions for said group.

## License

This tool is licensed under MIT.
