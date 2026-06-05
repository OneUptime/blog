# Validation Summary: How to Deploy the OpenTelemetry Collector with Nomad and Integrate Consul

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- HashiCorp Nomad
- HashiCorp Consul and Consul Template
- HashiCorp Vault
- Prometheus scrape configuration
- Docker

## Sources Consulted
- Nomad job specification: https://developer.hashicorp.com/nomad/docs/job-specification
- Nomad service block reference: https://developer.hashicorp.com/nomad/docs/job-specification/service
- Nomad system scheduler reference: https://developer.hashicorp.com/nomad/docs/concepts/scheduling/schedulers
- Nomad template block and runtime interpolation references: https://developer.hashicorp.com/nomad/docs/job-specification/template and https://developer.hashicorp.com/nomad/docs/reference/runtime-variable-interpolation
- Nomad Vault block reference: https://developer.hashicorp.com/nomad/docs/job-specification/vault
- Nomad restart block reference: https://developer.hashicorp.com/nomad/docs/job-specification/restart
- Nomad job plan command reference: https://developer.hashicorp.com/nomad/commands/job/plan
- Consul Template language reference: https://developer.hashicorp.com/consul/docs/reference/consul-template/go
- Vault KV v2 policy and secret access patterns: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- OpenTelemetry Collector OTLP receiver v0.96.0 README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter v0.96.0 README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/exporter/otlpexporter/README.md
- OpenTelemetry Collector health check extension v0.96.0 README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/extension/healthcheckextension/README.md
- OpenTelemetry Collector Prometheus receiver v0.96.0 README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/receiver/prometheusreceiver/README.md

## Issues Found
- The Consul Template expression for the OTLP exporter endpoint used `range service "observability-backend"`, which would concatenate multiple healthy service instances into one invalid `endpoint` value. Changed it to select the first healthy service instance with `with service ...` and `index`.
- The OTLP gRPC exporter defaults to TLS. The example discovers a plain `host:port` endpoint from Consul, so it would fail against a typical plaintext OTLP backend. Added `tls.insecure: true` to match the example endpoint format.
- The Consul health check probed `/health`, but the Collector health check extension defaults to `/`. Added `path: "/health"` to the extension config.
- The Prometheus scrape example rendered all instances of a service into a single YAML flow list without commas, producing invalid YAML when more than one target existed. Changed it to render one `static_configs` entry per discovered service instance and preserve the outer service name as a label.

## Review Notes
Validated the representative rendered Collector configuration with `otel/opentelemetry-collector-contrib:0.96.0 validate`. The local environment did not have the `nomad` or `consul-template` CLIs installed, so Nomad job planning and live Consul Template rendering were reviewed against official documentation rather than executed locally.
