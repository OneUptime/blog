# Validation Summary: How to Sanitize HTTP Request/Response Headers in OpenTelemetry Spans

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions for HTTP span attributes
- OpenTelemetry Python WSGI instrumentation
- OpenTelemetry Java agent HTTP instrumentation
- OpenTelemetry JavaScript HTTP instrumentation
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- Python OpenTelemetry SDK span processors

## Sources Consulted
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry Python WSGI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/wsgi.html
- OpenTelemetry Java agent HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry JavaScript HTTP instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL functions reference: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Python SDK trace implementation documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html

## Issues Found
- The Java agent example used outdated header-capture property names. Updated them to `otel.instrumentation.http.server.capture-request-headers` and `otel.instrumentation.http.server.capture-response-headers`, matching the current Java agent HTTP instrumentation docs.
- The Node.js example manually set header attributes with request and response hooks. Replaced it with the supported `headersToSpanAttributes` configuration option, which is the documented way for the HTTP instrumentation to convert selected headers into span attributes.
- The Collector attributes processor example only covered hyphenated custom header attribute names. Added underscore variants for headers such as `x_api_key` and `proxy_authorization`, because some instrumentation normalizes header names with underscores.
- The OTTL pattern example used `replace_all_patterns` on attribute keys, which renamed matching keys without redacting the sensitive values. Changed it to `delete_matching_keys` for credential-like header names and kept explicit cookie/set-cookie value redaction.
- The OTTL hashing example passed complete header attributes to `SHA256`, but HTTP header semantic convention values are arrays of strings. Updated the example to hash the first captured header value and included underscore-normalized header variants.
- The Python custom processor attempted to call `set_attribute` in `on_end`, but Python `on_end` receives a `ReadableSpan`. Moved the mutation logic to `_on_ending`, which runs before the span is converted to a readable ended span, and corrected `BatchSpanExporter` to `BatchSpanProcessor`.

## Review Notes
- The post is now technically valid, but header attribute names still vary by language instrumentation and semantic convention stability mode. The post already advises testing backend output, which is important for this topic.
