# Validation Summary: How to Secure Controllers in Cilium Observability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes RBAC
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Cilium host firewall and host policies
- Prometheus metrics and ServiceMonitor
- Kubernetes audit logging
- kubectl

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Host Policies documentation: https://docs.cilium.io/en/stable/security/policy/host/
- Cilium Kubernetes policy label documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes audit policy configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes auditing task documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The RBAC example described `pods/exec` access as allowing only read-only Cilium commands. Kubernetes RBAC cannot restrict the command executed through the `pods/exec` subresource, so the wording was changed to describe it as exec access for inspection workflows while preserving the existing warning.
- The custom Cilium ClusterRole text implied that the provided minimal role could replace Cilium's generated RBAC. Cilium permissions vary by version and enabled features, so the post now says to start from the Helm-generated ClusterRole and treats the YAML as a partial example only.
- The metrics protection example used a namespaced `CiliumNetworkPolicy` with an `endpointSelector` for Cilium agent pods. Cilium agents run in the host network namespace, so this would not reliably protect the agent metrics listener. The example was changed to a `CiliumClusterwideNetworkPolicy` host-policy fragment using `nodeSelector`.
- The Prometheus namespace selector in the Cilium policy used an unprefixed namespace label. It was updated to the documented `k8s:io.kubernetes.pod.namespace` label form for endpoint selectors.
- The Helm section claimed metrics are served only on the pod IP by default. Cilium documents `--prometheus-serve-addr` as an `IP:Port` value where an empty IP such as `:9962` binds all available interfaces, and the Helm reference exposes metrics port and ServiceMonitor settings. The text now focuses on enabling metrics discovery without exposing the port through NodePort or LoadBalancer services.
- The verification commands tested `http://cilium-agent.kube-system:9962/metrics`, which may not represent the Cilium agent metrics listener in all Helm configurations. They now resolve a Cilium node IP from a Cilium pod and test `:9962` directly.
- The audit-log command assumed kube-apiserver runs as a pod in `kube-system`. A note was added that this applies to kubeadm-style clusters.

## Review Notes
The host-policy YAML is intentionally described as a fragment. A complete host firewall policy must also allow required node traffic such as Kubernetes control-plane, kubelet, SSH or provider-specific health-check traffic, and should be tested in audit mode before enforcement.
