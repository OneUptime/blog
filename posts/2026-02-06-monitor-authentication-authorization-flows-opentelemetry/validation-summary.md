# Validation Summary: How to Monitor Authentication and Authorization Flows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics
- OTLP/gRPC exporters
- Authentication and authorization observability
- OAuth, JWT, and JWKS validation flows
- MFA and RBAC monitoring

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry metrics semantic conventions and unit guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry HTTP span security guidance for header capture/redaction: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- RFC 7517, JSON Web Key (JWK), for JWKS terminology: https://www.rfc-editor.org/rfc/rfc7517
- RFC 7519, JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519

## Issues Found
- The OTLP/gRPC setup used the generic `opentelemetry-exporter-otlp` package and bare `otel-collector:4317` endpoints. Updated the install comment to the official gRPC exporter package and used `http://otel-collector:4317` with `insecure=True`, matching the current Python OTLP/gRPC examples for a local collector.
- The post advised using hashed or truncated values for sensitive identifiers. Updated the guidance to recommend keyed one-way hashes for stable non-secret identifiers and to avoid recording tokens or session IDs even in truncated form.
- Duration histograms used `unit="ms"`. OpenTelemetry metric guidance recommends seconds for durations, so the login, MFA, and authorization latency histograms now use `unit="s"`.
- Several latency histograms were created but never recorded. Added `time.perf_counter()` timing and histogram recording to the login, MFA, and authorization examples.
- The policy-count histogram used `unit="policies"`, which does not follow OpenTelemetry's UCUM annotation guidance. Changed it to `unit="{policy}"`.
- The MFA alerting section referenced MFA failure rates, but the code did not define or increment an MFA failure counter. Added `auth.mfa.failures_total` and failure recording, including an explicit unsupported-method branch.
- The push MFA response-time span attribute used milliseconds while the surrounding duration guidance now uses seconds. Changed it to `auth.mfa.push_response_time_s` and converted milliseconds to seconds.

## Review Notes
The examples remain illustrative and depend on application-specific objects such as `credentials`, `user_store`, `jwt_validator`, and policy engines. The custom `auth.*` attributes are acceptable as application-specific telemetry, but future revisions could reduce backend-specific cardinality risk further by documenting which attributes should be bounded enums.
