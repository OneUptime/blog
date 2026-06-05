# Validation Summary: How to Monitor JWT Token Validation Failures and Expired Session Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- JavaScript
- Node.js
- Express middleware
- JSON Web Tokens
- jsonwebtoken
- OpenTelemetry JavaScript API
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- RFC 7519 JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The JWT verification example allowed both `HS256` and `RS256` while using a single `JWT_SECRET` and signing tokens with the default HMAC algorithm. jsonwebtoken expects HMAC algorithms to use a shared secret and RSA algorithms to use a PEM public key, so the example was internally inconsistent. Changed the verification allow-list to `['HS256']`.
- The expired-token error handler decremented `auth.sessions.active` when any expired token was received. An expired token request can be retried many times and is not the same as a logout or session-end event, so this would make the active session approximation inaccurate. Removed the decrement from the expired-token path.
- The session lifecycle introduction said the snippet instrumented login and logout, but the code only showed login. Changed the sentence to say it instruments login.

## Review Notes
- The OpenTelemetry API usage for `trace.getTracer`, `metrics.getMeter`, counters, histograms, UpDownCounters, span attributes, span events, and span status is current.
- The JWT `exp`, `nbf`, and `iat` handling matches RFC 7519 and jsonwebtoken's `clockTolerance`, `TokenExpiredError`, `JsonWebTokenError`, and `NotBeforeError` behavior.
- The Prometheus alert rule structure and use of `rate()` over counters are valid, assuming the OpenTelemetry Prometheus exporter exposes the dotted metric names in Prometheus-compatible form such as `auth_jwt_expired_total`.
