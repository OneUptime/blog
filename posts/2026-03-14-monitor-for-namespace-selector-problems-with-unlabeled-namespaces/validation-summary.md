# Validation Summary: Monitoring Namespace Selector Problems with Unlabeled Namespaces in Calico

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Open Source
- Kubernetes namespaces, Deployments, ConfigMaps, ServiceAccounts, RBAC
- Kubernetes Python client
- Prometheus and PromQL
- Prometheus Operator PrometheusRule CRD
- Grafana

## Sources Consulted
- Calico Open Source documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation, FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise documentation, Policy metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Prometheus Operator documentation / repository API stability notes: https://github.com/prometheus-operator/prometheus-operator
- Kubernetes Python client documentation: https://github.com/kubernetes-client/python

## Issues Found
- The exporter Deployment referenced `serviceAccountName: ns-label-exporter`, but the manifest did not create that ServiceAccount or grant namespace read permissions. Added a ServiceAccount, ClusterRole, and ClusterRoleBinding with `get` and `list` on namespaces.
- The exporter used `python:3.12-slim` while importing the `kubernetes` Python package, which is not included in that base image. Updated the demo command to install the package before starting the exporter.
- The Felix section referred to policy rule evaluation and denied packet metrics using `felix_denied_packets_total`, but Calico Open Source Felix documents active policy, selector, label-index, and dataplane metrics instead. Per-policy denied packet counters are documented as Calico Enterprise policy metrics using names such as `calico_denied_packets`. Replaced the example with documented Open Source Felix metrics: `felix_active_local_policies`, `felix_active_local_selectors`, and `felix_active_local_endpoints`.
- Updated the related alert, dashboard query, introduction, troubleshooting note, and conclusion so they describe Felix policy activity checks rather than unsupported traffic-based denied packet monitoring.

## Review Notes
- The Prometheus scrape annotation example is valid only for Prometheus installations configured to discover annotated pods; the troubleshooting section correctly calls this out.
- The Felix metrics examples assume an operator-style Calico installation using the `calico-system` namespace. Manifest-based installations may use `kube-system`, so readers may need to adjust the namespace.
- Installing Python dependencies at container startup is acceptable for a compact tutorial example, but a pinned custom image would be more appropriate for production.
