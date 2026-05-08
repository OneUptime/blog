# Validation Summary: Understanding Calico Typha Architecture for Kubernetes Operators

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Calico Typha
- Kubernetes
- Felix
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico on-premises installation guidance for Typha sizing: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Enterprise recommended Typha metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The introduction implied Typha is equally recommended for Kubernetes API and etcd datastores. Updated it to clarify that Typha is primarily recommended for the Kubernetes API datastore and is redundant/not recommended for etcd v3-backed installations.
- The post described Typha as essential for all clusters over 50 nodes. Updated this to match Calico guidance: the manifest-based Kubernetes API datastore path includes Typha for more than 50 nodes, and operator installations deploy and autoscale Typha automatically.
- The replica sizing table used unsupported fixed ranges such as 2-3 replicas for 50-200 nodes and 5+ replicas for 500+ nodes. Updated it to reflect Calico's documented guidance: at least one Typha replica per 200 nodes, no more than 20 replicas, and a production minimum of three replicas for resilience.
- The post stated that each Typha replica handles approximately 100-200 Felix connections. Updated this to "hundreds" and tied sizing to Calico's one-per-200-node recommendation.
- The metrics section said Typha exposes Prometheus metrics on port 9093 by default. Updated it to state that metrics must be enabled and that the default Typha metrics port is 9091, while some operator-managed or Enterprise metric services may expose metrics on 9093.
- The metrics command used `kubectl exec` with `wget`, which depends on tools being present inside the Typha container. Replaced it with a `kubectl port-forward` plus local `curl` example.
- The RBAC audit command combined `kubectl auth can-i VERB RESOURCE` with `--list`, which is not valid usage. Split it into a specific permission check and a separate `--list` command filtered for Project Calico resources.

## Review Notes
The remaining kubectl examples use standard command forms, but labels and namespaces can vary between Calico installation methods. The post assumes an operator-style `calico-system` namespace and `k8s-app=calico-typha` labels, which are common for the installation path being discussed.
