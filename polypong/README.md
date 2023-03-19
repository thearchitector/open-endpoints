# PolyPong

![server status](https://img.shields.io/website?down_message=offline&label=server%20status&style=flat-square&up_message=online&url=https%3A%2F%2Fopenendpoint.tools%2Fping%2F)
![mit license](https://img.shields.io/github/license/thearchitector/openendpoint-tools?style=flat-square)

A better (by metrics that are fun) healthcheck endpoint.

It renders a peer-to-peer 4-player Pong game instead of returning `true` or an HTTP 204.

## Support

If you try to access the page from a browser that doesn't support WebRTC or ES6 modules, you will be presented with an error message indicating so. The code is transpiled (JS) and vendor-prefixed (CSS) to support all the browsers that implement the required features. That is done via Babel, Terser and LightningCSS using the following `browserslist` query:

```plain
supports es6-module and supports rtcpeerconnection and supports let and supports const and supports template-literals and supports arrow-functions
```

According to `browserslist` data, the above query [covers 95.5% of the globe](https://browsersl.ist/#q=supports+es6-module+and+supports+rtcpeerconnection+and+supports+let+and+supports+const+and+supports+template-literals+and+supports+arrow-functions) on average.
