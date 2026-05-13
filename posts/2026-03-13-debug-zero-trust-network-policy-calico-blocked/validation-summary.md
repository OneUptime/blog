# Validation Summary: How to Debug Zero Trust Network Policy in Calico When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source network policy
- Calico GlobalNetworkPolicy and NetworkPolicy resources
- Kubernetes network policy behavior
- kubectl exec troubleshooting commands
- Zero trust and microsegmentation concepts

## Sources Consulted
- Calico documentation: Global network policy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Enable a default deny policy for Kubernetes pods, https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Get started with Calico network policy, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post claimed Calico provides "comprehensive logging of every traffic decision." Calico supports explicit `Log` actions for selected traffic, but the provided policies did not log every decision. Changed this to "optional logging rules for traffic that needs auditing."
- The global default-deny example used `selector: all()` across the whole cluster. Calico documentation warns that a broad global default deny can affect workloads in all namespaces, hosts, and control-plane components. Added a `namespaceSelector` that excludes common system namespaces, matching Calico's recommended pattern for non-system pods.
- The DNS allow rules permitted egress to any destination on TCP/UDP port 53. Updated the rules to target endpoints labeled `k8s-app == "kube-dns"`, matching Calico's documented DNS default-deny exception pattern.
- The system traffic policy included an ingress allow for kubelet port 10250 against all selected endpoints. That does not accurately model kubelet access for a non-system pod default-deny policy and could expose matching workload ports unnecessarily. Removed the kubelet ingress rule and the corresponding diagram edge.
- The application allow rule matched destination port 8080 without specifying a transport protocol. Added `protocol: TCP` to make the rule explicit and align with Calico examples for TCP service traffic.

## Review Notes
- The Kubernetes `kubectl exec -n <namespace> <pod> -- <command>` command form is valid. The example pod and service names are placeholders and must exist in the target cluster for the commands to be meaningful.
- The Calico APIs used in the examples are current in the latest Calico documentation and are compatible with the post's Calico v3.26+ prerequisite.
