# Validation Summary: How to Optimize Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (Project Calico CNI)
- Typha (Calico datastore fan-out daemon)
- Felix (Calico per-node agent)
- Kubernetes (kubectl, Deployment, node affinity, pod anti-affinity)
- calicoctl (FelixConfiguration patching)
- Prometheus (Typha metrics)

## Sources Consulted
- [Configuring Typha | Calico Documentation](https://docs.tigera.io/calico/latest/reference/typha/configuration)
- [Monitoring Typha with Prometheus | Calico Documentation](https://docs.tigera.io/calico/latest/reference/typha/prometheus)
- [Typha config_params.go source (projectcalico/calico master)](https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go)
- [calico-typha.yaml manifest (projectcalico/calico master)](https://github.com/projectcalico/calico/blob/master/manifests/calico-typha.yaml)
- [Felix config_params.go source (projectcalico/calico master)](https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go)
- [Monitor Calico component metrics | Calico Documentation](https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics)

## Issues Found

1. **Incorrect Typha batching env var name and value format (Step 2).** The post used `TYPHA_MINBATCHINGINTERVAL=100ms`, but no such variable exists. The actual Typha config field is `ServerMinBatchingAgeThresholdSecs` (env var `TYPHA_SERVERMINBATCHINGAGETHRESHOLDSECS`), which takes a float in seconds (default `0.01`). Updated the command to `TYPHA_SERVERMINBATCHINGAGETHRESHOLDSECS=0.1` and added a note clarifying the value units.

2. **Non-existent Prometheus metric name (Step 6).** The post referenced `typha_update_send_latency`, which is not a metric exposed by Typha. Replaced with `typha_client_latency_secs`, which is the documented metric reporting per-client latency (how far behind current state each Felix client is). Updated the surrounding sentence to match what the metric actually measures.

3. **Wrong label key in pod anti-affinity selector (Step 7).** The `matchLabels` used `app: calico-typha`, but Calico's Typha pods are labeled `k8s-app: calico-typha` (consistent with the `-l k8s-app=calico-typha` selector used elsewhere in the post). With the wrong key, the anti-affinity rule would never match, defeating the purpose of zone spreading. Changed to `k8s-app: calico-typha`.

## Review Notes

- The post mixes terminology between operator-installed Calico (`calico-system` namespace) and the "hard way" manifest-based install, which typically uses the `kube-system` namespace. The commands as written assume operator-style deployment. This is a stylistic/structural caveat, not a technical error.
- The Prometheus metrics port `9093` is correct for operator-installed Typha when `typhaMetricsPort: 9093` is set on the `Installation` resource; the upstream default in the manifest-based install is `9091`. Readers using the default manifest install may need to adjust the port-forward.
- `FelixConfiguration.spec.typhaReadTimeout` is the correct field name and accepts a Go duration string like `"30s"`.
- `node-role.kubernetes.io/control-plane` (Step 3) is the modern label/taint key — correct for Kubernetes 1.24+.
- `topology.kubernetes.io/zone` (Step 7) is the current GA topology label — correct for Kubernetes 1.17+.
