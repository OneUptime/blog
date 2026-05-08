# Validation Summary: Zero Trust Host Protection with Calico Host Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- Felix
- Linux iptables dataplane

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint forwarded traffic reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico Kubernetes node protection documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico host endpoint failsafe rules: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico creating policy for basic host endpoint connectivity: https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The introductory claim said host endpoints protect pod traffic generally. Calico host endpoint policy applies to forwarded pod traffic only when `applyOnForward: true` is enabled, and workload endpoint policy still applies separately. Updated the wording to make that condition explicit.
- The GlobalNetworkPolicy example matched destination ports without specifying `protocol`. Calico documentation examples specify TCP/UDP protocol when matching service ports, and the listed ports are TCP services. Added `protocol: TCP` to the ingress allow rule.
- The `calicoctl get hostendpoints -o wide` command was valid, but the official reference documents `--output=wide`. Updated the example to use the documented long option.
- The iptables inspection command was presented as generally applicable. Calico may use different dataplanes, so this only directly applies to the iptables dataplane. Updated the comment accordingly.
- The Felix liveness command assumed the `kube-system` namespace. Operator-based Calico installs commonly use `calico-system`, while manifest installs use `kube-system`. Updated the example to use `calico-system` and noted the manifest-based alternative.

## Review Notes
- The post's manual HostEndpoint example is syntactically consistent with Calico's `projectcalico.org/v3` HostEndpoint resource. The `expectedIPs` field is useful for selector-based policy matching and was correctly included.
- The example relies on environment-specific node names, interface names, IPs, and management CIDRs. Those placeholders must be adapted before use in a production cluster.
- Calico has default failsafe host ports, including SSH, but relying on failsafe ports should be a temporary safety net rather than the final host security model.
