# Validation Summary: How to Use External Data Providers Without Slowing Gatekeeper Admission Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OPA Gatekeeper External Data
- Kubernetes admission webhooks
- Rego
- Kubernetes Services, readiness probes, resource management, PodDisruptionBudgets, and topology spread constraints
- TLS and mutual TLS
- Prometheus and OpenTelemetry metrics

## Sources Consulted

- [Gatekeeper External Data, current documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/)
- [Gatekeeper External Data, v3.11 documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/v3.11.x/externaldata/)
- [Gatekeeper runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper metrics and observability](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper failing-closed guidance](https://open-policy-agent.github.io/gatekeeper/website/docs/failing-closed/)
- [Gatekeeper enforcement points](https://open-policy-agent.github.io/gatekeeper/website/docs/enforcement-points/)
- [Gatekeeper external-data metrics source](https://github.com/open-policy-agent/gatekeeper/blob/master/pkg/controller/externaldata/stats_reporter.go)
- [Gatekeeper Prometheus exporter source](https://github.com/open-policy-agent/gatekeeper/blob/master/pkg/metrics/exporters/prometheus/prometheus_exporter.go)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes admission webhook performance and latency guidance](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/#performance-and-latency)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [OpenTelemetry Go Prometheus exporter](https://pkg.go.dev/go.opentelemetry.io/otel/exporters/prometheus)

## Issues Found

- The mTLS text said the provider must trust Gatekeeper's client certificate. Changed it to say that the provider must trust the CA that issued Gatekeeper's client certificate, matching Gatekeeper's documented trust model.
- The provider resource guidance said CPU and memory requests prevent throttling. Requests influence scheduling and CPU weighting; CPU limits are what the kernel enforces through throttling. Changed the guidance to recommend workload-sized requests and CPU limits that do not cause throttling.
- The metrics list used only the Prometheus-exported counter name `gatekeeper_provider_error_count_total`. Gatekeeper documents the underlying instrument as `gatekeeper_provider_error_count`, while its default OpenTelemetry Prometheus exporter appends `_total`. Updated the post to show both names.
- The provider error metric was not scoped in the text. Clarified that it reports Provider reconciliation errors so readers do not treat it as a substitute for provider-side request and upstream error metrics.

## Review Notes

- The `externaldata.gatekeeper.sh/v1beta1` Provider example, integer timeout, HTTPS URL, and base64-encoded CA bundle match the official API.
- The Rego `external_data` request uses the documented `provider` and batched `keys` fields, and the batching recommendation matches Gatekeeper guidance.
- Gatekeeper v3.13 response caching, the three-minute default TTL, the runtime flag, and disabling the cache with `0` were verified.
- The v3.11 TLS 1.3 requirement, mutation timeout behavior, mutation failure policies, and webhook failure-policy discussion were verified.
- The current Gatekeeper documentation still marks External Data as beta. Gatekeeper v3.11 is no longer maintained, so operators should consult documentation matching their deployed release.
- All links in the post resolve to the intended official documentation.
