# Validation Summary: Common Mistakes to Avoid with Calico Host Endpoint Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- iptables dataplane

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host endpoint forwarded traffic documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Kubernetes node host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico failsafe rules documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe

## Issues Found
- The introduction said host endpoint policy protects pod traffic generally. Updated it to clarify that forwarded pod traffic is covered when `applyOnForward` is enabled.
- The `GlobalNetworkPolicy` ingress rule matched destination ports without a `protocol`. Added `protocol: TCP` because Calico port matches require a TCP, UDP, or SCTP protocol match.
- The implementation applied the `HostEndpoint` before applying the matching policy. Reordered the commands to apply the policy first, matching Calico guidance and reducing the chance of locking out host traffic.
- The `calicoctl get hostendpoints -o wide` examples used a less directly documented form. Changed them to the documented `calicoctl get hostEndpoint --output=wide` and `calicoctl get hostEndpoint` forms.
- The iptables inspection command did not mention that it applies to the iptables dataplane. Updated the comment to avoid implying it works the same way for every Calico dataplane.
- The Felix liveness command omitted the documented `/bin/calico-node` path. Updated the `kubectl exec` example to use `/bin/calico-node -felix-live`.

## Review Notes
The examples still use placeholder node names, interface names, pod names, and IP ranges. Operators must replace these with values from their own cluster before applying the manifests.
