# Validation Summary: Monitor Gatekeeper Audit, Denials, and Policy Latency with Prometheus

## Status
validated

## Post Type
Guide / operational monitoring reference

## Technologies Covered
- OPA Gatekeeper v3.23
- Kubernetes admission webhooks and audit
- Prometheus and PromQL
- Prometheus Operator PodMonitor
- OpenTelemetry Prometheus exporter

## Sources Consulted
- Gatekeeper v3.23 metrics and observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper v3.23 audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper v3.23 runtime flags: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper v3.23.0 Prometheus exporter source: https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/metrics/exporters/prometheus/prometheus_exporter.go
- Gatekeeper v3.23.0 webhook metrics source: https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/webhook/stats_reporter.go
- Gatekeeper v3.23.0 audit metrics source: https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/audit/stats_reporter.go
- Gatekeeper v3.23.0 deployment manifest: https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/deploy/gatekeeper.yaml
- Prometheus histogram query guidance: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMonitor
- Kubernetes admission control phases: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes dynamic admission control and webhook timeouts: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The example `PodMonitor` selected only Pods with `control-plane: controller-manager`, which excludes the default `gatekeeper-audit` Pod. Changed the selector to match Gatekeeper's `gatekeeper.sh/operation` label for both `webhook` and `audit`, so the example scrapes all webhook replicas and the singleton audit Pod as the post requires.

## Review Notes
Gatekeeper's documentation lists OpenTelemetry instrument names, while the v3.23 Prometheus exporter adds the conventional `_total` suffix to counters. The post correctly uses the live Prometheus counter names and advises checking exposition after upgrades. The PodMonitor still depends on the Prometheus custom resource selecting it and on installation-specific Gatekeeper labels and port names, which the post appropriately tells readers to verify.
