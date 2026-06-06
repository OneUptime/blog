# Validation Summary: How to Configure Bearer Token Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib `bearertokenauth` extension
- OTLP gRPC exporter
- OTLP HTTP exporter
- Routing connector
- Debug exporter
- Kubernetes Secrets
- OAuth 2.0 Bearer Token usage

## Sources Consulted
- OpenTelemetry Collector contrib Bearer Token Authenticator Extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/bearertokenauthextension
- OpenTelemetry Collector contrib Bearer Token Authenticator Extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/config.go
- OpenTelemetry Collector contrib Bearer Token Authenticator Extension implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/bearertokenauth.go
- OpenTelemetry Collector OTLP gRPC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector contrib routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://www.rfc-editor.org/rfc/rfc6750
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post used `bearertoken` as the authenticator type. The current official component type is `bearertokenauth`, so all extension IDs and `auth.authenticator` references were updated.
- File-based token examples used `token: "${file:/path}"`. The official `bearertokenauth` extension supports file-backed tokens through the `filename` field, so file and Kubernetes examples now use `filename: "/path/to/token"`.
- Several OTLP HTTP examples used the deprecated `otlphttp` component alias. These were updated to the current `otlp_http` component name.
- Several OTLP HTTP exporter endpoints included signal paths such as `/v1/traces` or `/v1/metrics` in the base `endpoint`. Current OTLP HTTP exporter documentation defines `endpoint` as the base URL that gets signal paths appended, so these examples now use base endpoints such as `https://api.backend.com:4318`.
- The multiple-backend example used the old routing processor style with `from_attribute` and exporter selection. It was updated to use the current routing connector configuration with OTTL conditions and routed destination pipelines.
- The post used the removed/deprecated `logging` exporter. It was replaced with the current `debug` exporter and `verbosity` configuration.
- The token rotation guidance incorrectly said environment variables could be rotated without restart and suggested SIGHUP reload. It now states that file-backed tokens referenced by `filename` can be updated without restarting, while environment variable changes require a collector restart.

## Review Notes
The bearer token authenticator extension is documented as beta and requires transport security for exporter-side authentication. The Kubernetes Deployment example still uses a `latest` image tag; that is syntactically valid, but pinning a collector version would be safer for production documentation.
