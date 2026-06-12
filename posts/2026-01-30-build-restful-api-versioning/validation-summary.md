# Validation Summary: How to Build RESTful API Versioning

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- REST API versioning
- Node.js
- Express
- HTTP Deprecation, Sunset, Link, and Warning headers
- NGINX reverse proxy configuration
- Kong Gateway declarative configuration and request-transformer plugin
- Kubernetes Ingress and ingress-nginx annotations
- Jest / Supertest API tests
- Prometheus prom-client metrics

## Sources Consulted
- Express 5.x Request API: https://expressjs.com/en/5x/api/request/
- Express 5.x Response API: https://expressjs.com/en/5x/api/response/
- Express middleware guide: https://expressjs.com/en/guide/using-middleware/
- RFC 8594, The Sunset HTTP Header Field: https://datatracker.ietf.org/doc/html/rfc8594
- RFC 9745, The Deprecation HTTP Response Header Field: https://datatracker.ietf.org/doc/html/rfc9745
- NGINX proxy_pass documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Kong request-transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/examples/add-header/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx rewrite examples: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- prom-client README: https://github.com/siimon/prom-client

## Issues Found
- The Express version middleware used `req.path` while mounted at `/api`. Express excludes the mount point from `req.path` in middleware, so `/api/v1/users` would be seen as `/v1/users` and the `/api/v...` regex would not match. Changed the middleware to inspect `req.originalUrl` and adjusted the regex to handle `/api/v1`, `/api/v1/`, query strings, and fragments.
- The article claimed support for header, query, and default versioning, but the sample app only mounted `/api/v1`, `/api/v2`, and `/api/v3`. Requests such as `/api/users` with `X-API-Version: v2` would never reach the v2 router. Added a small dispatcher that sends unprefixed `/api/...` requests to the router selected by `req.apiVersion`, while preserving URL-prefixed routing.
- The Deprecation and Sunset examples used plain `YYYY-MM-DD` dates. RFC 9745 defines the `Deprecation` value as a Structured Field date, and RFC 8594 defines `Sunset` as an HTTP-date. Updated the config values and explanatory comments accordingly.
- The deprecation section attributed the behavior only to RFC 8594. Updated the text to reference RFC 9745 for `Deprecation` and RFC 8594 for `Sunset`.
- The ingress-nginx example used regex paths with `pathType: Prefix` and omitted `nginx.ingress.kubernetes.io/use-regex: "true"`. ingress-nginx regex path examples use `use-regex` and `pathType: ImplementationSpecific`. Updated the annotation and all regex path types.

## Review Notes
The remaining examples are illustrative and depend on omitted project pieces such as `routes/v*/index.js` and `database`, so I reviewed them for syntax and framework/API correctness rather than executing the complete app. The sample `app.listen()` call inside `src/app.js` is acceptable for a blog demo, but a production/testable app would usually separate app creation from server startup to avoid open handles in test runs.
