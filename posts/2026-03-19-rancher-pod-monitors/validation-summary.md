# Validation Summary: How to Configure PodMonitors in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Operator
- Prometheus
- PodMonitor
- ServiceMonitor

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Rancher ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher Prometheus Federator guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/prometheus-federator-guides/enable-prometheus-federator
- kube-prometheus-stack default values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job docs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes well-known labels docs: https://kubernetes.io/docs/reference/labels-annotations-taints/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The two `apps/v1` Deployment examples were missing the required `.spec.selector` field. I added selectors that match the pod template labels so the manifests are valid for current Kubernetes versions.
- The sidecar Deployment example did not specify `metadata.namespace: my-namespace`, while the PodMonitor example was namespaced to `my-namespace`. I added the namespace so the example works as described with the default same-namespace PodMonitor behavior.
- The CronJob example omitted `restartPolicy`, which is required on Job and CronJob pod templates. I added `restartPolicy: OnFailure`.
- The batch job example used the deprecated `job-name` label in `jobLabel`. I updated it to `batch.kubernetes.io/job-name` and corrected the explanation so it reflects what `jobLabel` actually does: it sets the Prometheus `job` label.
- The troubleshooting and summary text treated `release: rancher-monitoring` as universally required. I corrected that to reflect Rancher / Prometheus selector behavior: the PodMonitor labels must match the Prometheus `podMonitorSelector`, and `release: rancher-monitoring` is only required when that selector expects it.
- The named-port guidance was too absolute. I clarified that named container ports are required for the `port` field used in the examples.

## Review Notes
- PodMonitor `port` is correct for named container ports, but the CRD also supports `portNumber`, and `targetPort` is deprecated.
- Cross-namespace PodMonitor discovery can still be constrained by the Prometheus-side `podMonitorNamespaceSelector` or `ignoreNamespaceSelectors` settings.
- Job and CronJob pods must still exist long enough to be scraped; PodMonitor discovery does not make completed pods permanently scrapeable.
