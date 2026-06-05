# Validation Summary: How to Write OTTL Regex Replace Patterns to Normalize URL Paths

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OpenTelemetry HTTP semantic conventions
- Regular expressions
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector Contrib OTTL span context paths documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The examples used unprefixed span paths such as `attributes["http.url"]` and `name`. Current transform processor documentation for recent Collector versions shows span paths as `span.attributes[...]` and `span.name`, so the examples were updated to the current documented path form.
- The examples normalized the legacy `http.url` attribute. Current OpenTelemetry HTTP semantic conventions use `url.path` for HTTP server span paths, `url.query` for server query strings, and `url.full` for HTTP client full URLs. The examples were updated to use those attributes while keeping `http.route`, which remains the current route-template attribute.
- The first normalization example replaced numeric IDs before MongoDB ObjectIDs. That conflicts with the article's own ordering guidance and could partially replace object IDs that begin with digits. The example now applies more specific patterns first.
- UUID and hex-string regexes only matched lowercase hex characters. They now match both uppercase and lowercase hex characters.
- The base64-token path example used standard Base64 characters that include `/`, which can cross URL path segment boundaries. It now uses URL-safe token characters for path segments.
- The query-parameter example treated `url.path` as if it contained a query string. It now deletes or normalizes `url.query` for server spans and strips `url.full` only for client spans that have a full URL.
- The original URL preservation example stored the original value under a legacy `http.url.original`-style attribute. It now preserves the current `url.path` value as `url.path.original`.

## Review Notes
The transform processor binary was not available locally, so I could not run `otelcol --config` validation. The snippets were checked against the current official transform processor, OTTL function, OTTL span path, and HTTP semantic convention documentation.
