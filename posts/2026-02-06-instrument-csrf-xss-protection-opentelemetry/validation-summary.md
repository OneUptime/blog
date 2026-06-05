# Validation Summary: How to Instrument CSRF and XSS Protection Layers with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry OTLP trace and metric exporters
- OpenTelemetry HTTP semantic conventions
- Node.js
- Express
- CSRF protection
- XSS detection and prevention concepts

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Express 5 request API documentation: https://expressjs.com/en/5x/api/request/
- Express.js legacy package deprecation notice for csurf: https://expressjs.com/en/blog/2025-05-16-express-cleanup-legacy-packages/
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Cross Site Scripting Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

## Issues Found
- The post described `csurf` as a common Express CSRF middleware without noting its current deprecated status. Updated the wording to say older Express apps may use `csurf`, while newer apps should use framework-level or custom protection aligned with their architecture.
- The OpenTelemetry examples used the deprecated `http.method` semantic convention attribute. Updated span and metric attributes to use `http.request.method`.
- The examples used `req.route?.path || req.path` for `http.route`. OpenTelemetry requires `http.route` to be a low-cardinality route template and explicitly says URI paths cannot substitute for it. Added a helper that only sets `http.route` when an Express route template is available.
- The CSRF middleware accessed `req.body._csrf` directly. Express documents `req.body` as user-controlled and possibly undefined, so this could throw for requests without a parsed body. Updated the code to use `req.body?._csrf`.
- The XSS section implied that request-body pattern matching was equivalent to XSS sanitization. Updated the wording to align with OWASP guidance that primary XSS defenses are context-aware output encoding and HTML sanitization, with headers such as CSP as defense-in-depth.
- The wiring example applied the middleware globally with `app.use`, which usually runs before a route template is available. Updated the example to mount the middleware on protected routes so `req.route.path` can be used as a route template.

## Review Notes
The examples are technically valid as observability examples, but the XSS scanner remains a simple detection layer and should not be treated as a complete XSS prevention strategy. Production systems should keep primary XSS controls at output rendering and HTML sanitization boundaries, and should avoid recording sensitive request headers or payload contents in telemetry.
