# Validation Summary: Fix OTLP/HTTP 401 Errors with Static Headers or the `basicauth` Extension

## Status
validated

## Post Type
Technical troubleshooting guide with curl commands and OpenTelemetry Collector YAML configuration.

## Technologies Covered
- OpenTelemetry Collector and OTLP over HTTP
- HTTP bearer tokens and Basic Authentication
- Collector HTTP client headers and the `basic_auth` extension
- curl and TLS certificate verification
- Environment variables, Kubernetes Secrets, and Pod networking

## Sources Consulted
- [OTLP HTTP exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md): component names, endpoint construction, and signal overrides.
- [Collector HTTP configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md): outbound headers and authenticator references.
- [Basic Auth extension documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/basicauthextension/README.md): client credentials, distribution availability, and deprecated alias.
- [Collector configuration documentation](https://opentelemetry.io/docs/collector/configuration/): pipelines, extension activation, environment substitution, and separate client/server authentication.
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/): JSON transport, empty payloads, and non-retryable HTTP responses.
- [OTLP HTTP exporter implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/otlp.go): permanent-error classification and retryable status codes.
- [curl manual](https://curl.se/docs/manpage.html): `--include`, `--user`, `--header`, `--data`, and `--cacert`.
- [curl certificate verification documentation](https://curl.se/docs/sslcerts.html): default verification and custom CA files.
- [RFC 9110, HTTP 401](https://www.rfc-editor.org/rfc/rfc9110.html#name-401-unauthorized): missing or invalid authentication credentials.
- [Kubernetes Pods documentation](https://kubernetes.io/docs/concepts/workloads/pods/): shared network namespaces and localhost access.
- [Kubernetes Secret consumption documentation](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/): secret keys, environment injection, and restart requirements for environment-based updates.

## Issues Found
- The final paragraph implied that repeated unauthorized requests would consume queue capacity without explaining permanent failure handling. Replaced that sentence with the actual behavior: the OTLP HTTP exporter treats 401 as a permanent error, drops the failed batch, and loses subsequent telemetry if invalid credentials remain configured. The OTLP specification permits retries for 429, 502, 503, and 504, not 401; the exporter implementation follows that classification.

## Review Notes
- The upstream documentation confirms `otlp_http` and `basic_auth` as current component names and `otlphttp` and `basicauth` as deprecated aliases. The post correctly advises matching the names to the deployed distribution; no specific release is claimed.
- Both configuration examples use documented fields. The Basic Auth example intentionally depends on retaining the first example's receiver, as stated in the text. Its extension is enabled and referenced correctly.
- The curl command uses POST with a JSON trace payload and prompts for the password. An empty payload is only a transport/authentication probe; it cannot establish successful span storage, and implementations may discard empty payloads.
- Environment-supplied credentials require restarting with updated values. Current Basic Auth documentation also offers watched credential files, but the examples use environment expansion and do not claim automatic refresh.
- Loopback access requires a shared network namespace; merely running isolated containers on one physical host does not provide shared localhost access.
- The three technical documentation links in the post resolve to the intended upstream resources. The example telemetry hostname is a placeholder requiring replacement.
- Both YAML snippets parsed successfully with Ruby YAML, the curl snippet passed `bash -n`, and the validation JSON parsed successfully.
- Review is based on upstream documentation and source inspection. No real backend, credentials, or deployed Collector binary were supplied, so authenticated delivery and runtime configuration loading were not tested.
