# Validation Summary: How to Validate Resolution of Health Check Failures with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Kubernetes probes: liveness, readiness, and startup probes
- kubectl
- Kubernetes Events
- Kubernetes NetworkPolicy
- Calico host endpoints and GlobalNetworkPolicy

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes documentation: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico documentation: What is network policy? - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Protect Kubernetes nodes - https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes

## Issues Found
- The post originally described this as a Kubernetes `NetworkPolicy` ingress-rule validation issue using `ipBlock`. Kubernetes NetworkPolicy explicitly allows traffic to and from the node where the pod is running, and kubelet probes are sent from the kubelet to the pod IP. I changed the scope to Calico host endpoint or `GlobalNetworkPolicy` rules, where node traffic can be controlled by Calico policy.
- The permanent-fix verification command originally used `kubectl get networkpolicy -n <namespace> -o yaml | grep ... "ipBlock:"`, which matches Kubernetes NetworkPolicy syntax rather than Calico GlobalNetworkPolicy syntax. I changed it to inspect `globalnetworkpolicy` and look for Calico rule fields such as `source`, `selector`, `nets`, and `ports`.
- The emergency-policy cleanup command originally deleted a namespaced Kubernetes `networkpolicy`. I changed it to delete the non-namespaced Calico `globalnetworkpolicy` used by the corrected scenario.
- The SSH/netcat command used unquoted shell variables. I quoted `$NODE` in the SSH command to avoid shell word-splitting issues.

## Review Notes
The `kubectl wait`, event field selector, pod JSONPath, and probe behavior claims are consistent with Kubernetes documentation. The direct SSH-to-node validation is operationally environment-specific because Kubernetes node names are not always SSH hostnames, but the command is technically valid when SSH access and name resolution are configured.
