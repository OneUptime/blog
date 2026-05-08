# Validation Summary: How to Validate Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Typha
- Calico Felix
- Kubernetes
- Kubernetes NetworkPolicy
- Kubernetes PodDisruptionBudget
- kubectl
- Prometheus metrics

## Sources Consulted
- Calico hard-way Typha installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post used the `calico-system` namespace throughout, but the official Calico hard-way Typha installation deploys Typha and calico-node resources in `kube-system`. Updated the examples to define `CALICO_NAMESPACE=kube-system`.
- The replica placement command included the header row from `kubectl get pods -o wide`. Added `--no-headers` so the duplicate-node check only evaluates pod rows.
- The zone distribution guidance said every Typha pod should be in a different zone. That is not always possible when replicas exceed available zones or scheduling constraints apply. Updated the wording to require even spreading across available zones.
- The Typha connection checks used `typha_connections_active` on port `9093`. Calico documents Typha metrics on port `9091` by default, and `typha_connections_streaming` is the better metric for connections that completed the handshake. Updated the examples to use `TYPHA_METRICS_PORT=9091` and sum `typha_connections_streaming`.
- The post claimed connections should be within 20% of the expected per-replica count. Calico documentation notes small clusters can legitimately be uneven. Reworded this as a larger-cluster expectation and called out small-cluster imbalance.
- The failover validation checked host iptables for the Kubernetes NetworkPolicy name. That is not reliable across Calico dataplanes and policy rendering modes. Replaced it with a Felix metrics check using `felix_cluster_num_policies`.
- The PDB drain example used an implicit `--dry-run`. Updated it to `--dry-run=server`, matching the current kubectl flag values.
- The restart validation used the same outdated Typha metric and metrics port as the distribution check. Updated it to use `typha_connections_streaming` on the configured metrics port.

## Review Notes
Felix and Typha Prometheus metrics must be enabled and reachable inside the relevant containers for the metric-based validation commands to work. I could not run `kubectl --help` locally because `kubectl` is not installed in this review environment, so kubectl flags were checked against the official Kubernetes reference.
