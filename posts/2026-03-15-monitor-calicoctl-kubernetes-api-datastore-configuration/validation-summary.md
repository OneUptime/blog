# Validation Summary: How to Monitor Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes API datastore
- Kubernetes audit logging
- Prometheus
- Prometheus Operator ServiceMonitor
- Felix metrics
- Typha metrics

## Sources Consulted
- Calico datastore and calicoctl Kubernetes datastore setup: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico monitor component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Prometheus Operator ServiceMonitor getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes auditing guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The ServiceMonitor example selected `k8s-app: calico-node` without creating or selecting a Service. Prometheus Operator ServiceMonitor resources select Services and refer to named Service ports, so I added a headless `felix-metrics-svc` Service in `calico-system` with a named `http-metrics` port.
- The ServiceMonitor was placed in the `monitoring` namespace but did not include a namespace selector for the Felix Service in `calico-system`. I added `namespaceSelector.matchNames` so the monitor can discover the Service in the correct namespace.
- The metrics list included undocumented or non-current metric names: `felix_datastore_connection_failures_total`, `felix_ipset_errors_total`, `typha_connections_accepted_total`, and `typha_connections_dropped_total`. I replaced them with documented Calico metrics: `felix_resync_state`, `felix_resyncs_started`, `felix_ipset_errors`, `typha_connections_accepted`, and `typha_connections_dropped`.

## Review Notes
The audit policy example is syntactically valid for Kubernetes audit policy, and `crd.projectcalico.org` is the Kubernetes CRD API group used for Calico resources. Prometheus discovery still depends on the user's Prometheus instance selecting ServiceMonitors from the `monitoring` namespace.
