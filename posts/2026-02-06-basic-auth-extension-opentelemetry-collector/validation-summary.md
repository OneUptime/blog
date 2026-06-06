# Validation Summary: How to Configure Basic Auth Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Basic Auth authenticator extension
- OTLP/HTTP exporter and receiver
- Prometheus Remote Write exporter
- Debug exporter
- HTTP Basic Authentication
- Kubernetes Secrets, ConfigMaps, and Deployments
- TLS/HTTPS

## Sources Consulted
- OpenTelemetry Collector Basic Auth authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/basicauthextension
- OpenTelemetry Collector Basic Auth extension config schema/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/basicauthextension/config.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- RFC 7617, The Basic HTTP Authentication Scheme: https://www.rfc-editor.org/rfc/rfc7617

## Issues Found
- Replaced the deprecated `otlphttp` exporter alias with the current `otlp_http` component name, because official OTLP/HTTP exporter docs state that `otlphttp` is a deprecated alias.
- Corrected OTLP/HTTP exporter endpoints that included `/v1/traces` under `endpoint`. The current exporter treats `endpoint` as a base URL and appends signal paths automatically, so examples now use base URLs or `logs_endpoint` where a full logs URL is intended.
- Replaced file credential interpolation using `${file:/var/secrets/...}` with `username_file` and `password_file`, which are the Basic Auth extension's current file-backed credential fields and are watched for changes.
- Removed the Loki exporter example and replaced it with an OTLP/HTTP logs exporter example, because the Loki exporter is not present in the current OpenTelemetry Collector contrib exporter tree.
- Replaced the removed/deprecated `logging` exporter with the current `debug` exporter and changed `loglevel` to the supported `verbosity` setting.
- Removed conflicting inline htpasswd sample entries from the server-auth example. The Basic Auth extension gives `htpasswd.inline` precedence over `htpasswd.file`, so including both in the same example would ignore the generated file.
- Updated the credential rotation note to distinguish environment-variable credentials, which require restart, from `username_file` and `password_file`, which the Basic Auth extension watches for changes.

## Review Notes
The examples use placeholder backend hostnames and credentials, which is appropriate for a guide. The Kubernetes example uses the `latest` Collector image tag; that is syntactically valid, but pinning a version is preferable for production deployments.
