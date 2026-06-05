# Validation Summary: How to Monitor Kubernetes Network Policies with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes labels and selectors
- OpenTelemetry Collector
- Prometheus receiver and scrape configuration
- OpenTelemetry filelog receiver
- Calico and Calico Enterprise policy metrics
- Cilium and Hubble observability
- Python Kubernetes client
- Prometheus alerting rules

## Sources Consulted
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry stanza filter operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/filter.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico staged network policy documentation: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble exporter documentation: https://docs.cilium.io/en/latest/observability/hubble/configuration/export/
- Cilium policy audit mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/

## Issues Found
- The post said most CNI plugins expose network policy metrics. Changed this to "many" because the exact metric coverage varies by CNI and deployment options.
- The Calico Felix scrape filter and alert referenced `felix_denied_packets_total`, which is not part of current Calico OSS Felix metrics. Updated the Felix scrape filter to current Felix policy-related metrics and used Calico Enterprise `calico_denied_packets` for denied-packet alerting.
- The Cilium filelog example treated Hubble flow logs as flat `PolicyVerdict` events. Updated it to match Hubble Exporter JSON structure, where flow fields are nested under `flow`, and filtered on `DROPPED` and `ERROR` verdicts.
- The Hubble metrics section described a custom receiver connected to Hubble, but the snippet scraped Prometheus metrics. Updated the wording to match the configuration.
- The policy coverage Python example only handled `matchLabels`. Added `matchExpressions` support for `In`, `NotIn`, `Exists`, and `DoesNotExist`, matching Kubernetes label selector semantics.
- The application-error explanation over-specified "connection refused" as the expected symptom. Reworded it to cover timeouts, resets, and other CNI-dependent connection failures.
- The testing section said both Calico and Cilium support audit/log mode. Updated it to distinguish Calico staged network policies from Cilium policy audit mode.

## Review Notes
The examples are illustrative and still require deployment-specific enablement, RBAC, endpoints, and backend configuration. In particular, Calico denied-packet metrics require Calico Enterprise policy metrics, while Cilium/Hubble metrics and Hubble Exporter must be enabled explicitly.
