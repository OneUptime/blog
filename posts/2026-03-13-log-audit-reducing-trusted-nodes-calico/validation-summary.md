# Validation Summary: How to Log and Audit Calico Policies for Reducing Trusted Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico HostEndpoint
- Calico host failsafe ports
- Kubernetes node and host-network security
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host protection guide: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts
- Calico failsafe rules reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico log rules guide: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The original policy implied that a GlobalNetworkPolicy alone would protect node interfaces. Calico host traffic requires HostEndpoint resources for the interfaces being protected, so the configuration now includes a HostEndpoint example and the prerequisites mention HostEndpoints.
- The policy title and description refer to logging and auditing, but the original policy only allowed and denied traffic. Calico uses `action: Log` rules to log matching packets while continuing to the next rule, so a Log rule was added before the Deny rule.
- The original selector used a Kubernetes hostname label without showing how that label would exist on host endpoints. The example now uses explicit HostEndpoint labels (`role: k8s-node` and `trusted-node: "true"`) that match the policy selectors.
- The restricted ports in the original example overlap Calico's default failsafe host ports, including SSH, etcd, and the Kubernetes API. The prerequisites and implementation notes now call out that Felix failsafe ports must be narrowed only after replacement allow rules are in place.
- The original rules did not specify a protocol for port-based matches. The examples now specify `protocol: TCP` for SSH, etcd, and Kubernetes API traffic.

## Review Notes
The example still uses placeholder node names, interface names, IP addresses, and management CIDRs. Operators should adapt these values and validate in staging before applying host endpoint policy in production because missing allow rules can block host connectivity.
