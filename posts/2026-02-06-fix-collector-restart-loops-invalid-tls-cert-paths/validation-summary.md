# Validation Summary: How to Fix Collector Restart Loops Caused by Invalid TLS Certificate Paths

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP exporter TLS configuration
- Kubernetes Deployments
- Kubernetes Secrets and Secret volumes
- Kubernetes init containers
- kubectl
- OpenSSL

## Sources Consulted
- OpenTelemetry Collector TLS configuration package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry configuration types reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes task documentation for mounting Secret keys as files and using `items`: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes volumes documentation for Secret volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- OpenSSL `s_client` local help output for `-connect`, `-cert`, `-key`, and `-CAfile`.

## Issues Found
- The certificate rotation fix recommended a `readinessProbe`. A readiness probe only marks a running container as not ready and does not prevent the Collector process from starting and exiting when TLS files are unavailable. Changed this to an init container that waits for the TLS files before the Collector container starts.
- The complete Kubernetes Deployment example was missing the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added `selector.matchLabels` and `template.metadata.labels` using `app: otel-collector`.

## Review Notes
The TLS field names `ca_file`, `cert_file`, `key_file`, and `insecure` are valid Collector TLS configuration options. Kubernetes Secret volume key-to-file behavior and `items` path mapping are accurate. `kubectl` was not installed locally, so kubectl command syntax was checked against Kubernetes documentation rather than local help output.
