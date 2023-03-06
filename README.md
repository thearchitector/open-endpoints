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
        "label": "override me",
        "message": "47.8",
        "color": "green"
    }
    ```

## License

This tool is licensed under MIT.
