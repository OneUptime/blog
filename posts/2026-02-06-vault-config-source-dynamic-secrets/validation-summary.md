# Validation Summary: How to Configure the Vault Config Source Provider for Dynamic Secret Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector configuration
- Splunk Distribution of the OpenTelemetry Collector
- HashiCorp Vault
- Vault config sources
- Vault KV v2 secrets
- Vault dynamic secrets and leases
- AWS IAM and GCP Vault authentication

## Sources Consulted
- OpenTelemetry Collector confmap README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/confmap/README.md
- OpenTelemetry Collector core confmap providers: https://github.com/open-telemetry/opentelemetry-collector/tree/main/confmap/provider
- OpenTelemetry Collector Contrib confmap providers: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/confmap/provider
- Splunk documentation for other configuration sources: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/get-started-understand-and-use-the-collector/other-configuration-sources-alphabeta
- Splunk Vault config source README: https://github.com/signalfx/splunk-otel-collector/tree/main/internal/configsource/vaultconfigsource
- Splunk Vault config source implementation: https://github.com/signalfx/splunk-otel-collector/blob/main/internal/configsource/vaultconfigsource/config.go
- Splunk Vault config source factory: https://github.com/signalfx/splunk-otel-collector/blob/main/internal/configsource/vaultconfigsource/factory.go
- Splunk Vault config source watcher implementation: https://github.com/signalfx/splunk-otel-collector/blob/main/internal/configsource/vaultconfigsource/source.go
- Splunk Vault config source tests: https://github.com/signalfx/splunk-otel-collector/blob/main/internal/configsource/vaultconfigsource/source_test.go
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault leases API documentation: https://developer.hashicorp.com/vault/api-docs/system/leases

## Issues Found
- The post incorrectly said the Vault config source is available in the OpenTelemetry Collector Contrib distribution. Upstream Collector Contrib currently lists `aesprovider`, `googlesecretmanagerprovider`, `s3provider`, and `secretsmanagerprovider`, but no Vault provider. I changed the article to target the Splunk Distribution of the OpenTelemetry Collector, whose documentation and source code include the alpha Vault config source.
- The original examples used unsupported Vault config source fields such as `auth.method`, Kubernetes auth, AppRole auth, and inline Vault paths in references like `${vault:secret/data/otel/backend#api_key}`. I changed the examples to the documented Splunk config source schema: `endpoint`, source-level `path`, and exactly one auth block under `auth` (`token`, `iam`, or `gcp`).
- The original reference syntax was incorrect for the documented Vault config source. I changed references to the documented `$vault/name:selector` form, using `data.api_key` for KV v2 secrets because KV v2 secret values are nested under `data`.
- The original complete configuration used one Vault source for multiple Vault paths. The documented source has one configured `path`, so I split the example into separate sources for primary backend, secondary backend, and TLS certificates.
- The dynamic secrets section claimed a generic automatic renewal and fallback flow. I updated it to reflect the implementation: renewable secrets use Vault's lifetime watcher, and when renewal stops the Collector is notified to re-resolve configuration and fetch a new credential.
- The error handling section claimed cached last-known-good values and warning logs for transient outages. I replaced this with the implementation-backed behavior: Vault read failures during resolution fail startup, and later watcher errors are reported through Collector change events.
- The Vault policy originally included `sys/leases/renew`. The implementation uses the Vault client lifetime watcher, and the static KV v2 polling example needs metadata read access. I added `secret/metadata/otel/*` and removed the unsupported policy recommendation.

## Review Notes
The Vault config source documented here is alpha in the Splunk Distribution of the OpenTelemetry Collector, not a generally available upstream Collector Contrib provider. Future edits should continue to call out that distribution-specific scope.
