# Validation Summary: How to Diagnose Kubernetes Network Policy Blocking Legitimate Pod-to-Pod Traffic

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes namespaces and labels
- kubectl
- CoreDNS and kube-dns
- CNI plugins
- Cilium
- Calico

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor.html
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found
- Corrected the description of NetworkPolicy default-deny behavior. NetworkPolicies isolate ingress and egress independently based on the matching policies and `policyTypes`; a policy selecting a pod does not automatically block both directions.
- Removed "connection refused" from the expected blocked-traffic symptoms. A NetworkPolicy drop normally appears as a timeout or similar network failure, while connection refusal usually indicates that a host was reached but no process accepted the connection.
- Updated namespace selectors for `ingress-nginx` and `kube-system` to use the automatic `kubernetes.io/metadata.name` namespace label instead of assuming a custom `name` label exists.
- Renamed the "Missing Egress Policy" example to "Overly Restrictive Egress Policy" because the example already had an egress policy that blocked external traffic.
- Updated the Cilium drop-monitoring command from `cilium monitor --type drop` to the current documented `cilium-dbg monitor --type drop`.
- Replaced the Calico `kubectl logs calico-node` denial example with a documented Calico Log-rule lookup using `journalctl` and `calico-packet`.
- Fixed the gradual rollout example so its "allow all egress" rule uses `egress: - {}`. The previous version allowed pods in namespaces, but not external IP destinations.

## Review Notes
The YAML snippets use the current `networking.k8s.io/v1` API and parsed successfully. The examples still depend on environment-specific labels for application pods and ingress controller pods, which is expected for NetworkPolicy examples and should be adapted to the reader's cluster.
