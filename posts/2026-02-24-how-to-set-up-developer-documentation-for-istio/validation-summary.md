# Validation Summary: How to Set Up Developer Documentation for Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes Deployments and kubectl
- Istio traffic management and DestinationRule circuit breaking
- Envoy access logs and response flags
- Istio Telemetry, metrics, tracing, and access logging
- Istio protocol selection and service port naming
- istioctl analyze
- Kubernetes CRD reference documentation tools
- GitHub Actions
- Python and PyYAML

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio getting started guide: https://istio.io/latest/docs/setup/getting-started/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- crd-ref-docs Go package documentation: https://pkg.go.dev/github.com/elastic/crd-ref-docs
- gen-crd-api-reference-docs repository documentation: https://github.com/tektoncd/ahmetb-gen-crd-api-reference-docs
- Kubernetes API reference generation documentation: https://kubernetes.io/docs/contribute/generate-ref-docs/kubernetes-api/

## Issues Found
- The getting-started text said Istio injects a sidecar into every pod. Istio automatic injection occurs when new pods are created, so this was changed to "every new pod."
- The metrics section claimed distributed traces use 10% sampling by default. Istio's default profile documents 1% sampling, and tracing is platform-configurable, so the text now refers to the platform's configured sampling rate.
- The metrics section implied error-response access logs are automatic. Istio access logging must be enabled through Telemetry API or mesh config, so the text now says access logs are available if the platform has enabled them.
- The troubleshooting guide treated `NR` as a normal 503 response flag. Envoy documents `NR` as no route configured, usually associated with 404 for HTTP routing, so the text now calls out that distinction and the log filter includes both 503 and 404.
- The circuit breaker section described a default 100-connection limit. Istio DestinationRule defaults are much higher unless configured, so the text now refers to the platform's configured limit.
- The platform conventions section repeated fixed circuit breaker defaults of 100 max connections and 50 pending requests. This was changed to configured connection and request limits.
- The `crd-ref-docs` example used a directory as `--output-path` while relying on the default single-file output mode. The path now points to `./docs/reference/api.md`.
- The GitHub Actions example used `grep` commands that would not reliably extract complete YAML fenced blocks. It now uses an inline Python extractor.
- The GitHub Actions example used PyYAML without installing it and did not force `safe_load_all` to consume the generator. It now installs PyYAML and evaluates the parsed documents.
- The GitHub Actions example used `istioctl analyze` without installing `istioctl` and without allowing non-Istio/custom examples. It now installs `istioctl` using Istio's official download script and uses `--ignore-unknown`.

## Review Notes
The `TrafficRoute` and `ServiceAccess` resources are platform-specific example CRDs, so their schemas cannot be validated against Istio's official API. They are acceptable as illustrative internal platform resources.
