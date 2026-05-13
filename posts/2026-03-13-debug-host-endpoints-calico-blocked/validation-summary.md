# Validation Summary: How to Debug Calico Host Endpoint Policies When Traffic Is Blocked

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Kubernetes
- calicoctl
- kubectl
- Linux iptables dataplane

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoint forwarded traffic reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico protect Kubernetes nodes documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico staged network policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies

## Issues Found
- The ingress rule matched destination ports without explicitly specifying a protocol. Calico examples and node-protection guidance specify `protocol: TCP` for TCP service ports such as SSH, HTTPS, and the Kubernetes API server, so I added `protocol: TCP` to make the policy intent unambiguous and consistent with official examples.
- The iptables command was described as viewing policy decisions. `iptables -L -n | grep CALICO` can inspect Calico chains only on nodes using the iptables dataplane; it does not directly show policy decisions and is not applicable to eBPF dataplane inspection. I updated the comment to describe it as inspecting Calico chains on the iptables dataplane.
- The Felix health command used `calico-node -felix-live` without the documented `/bin/calico-node` path. I updated the command to call `/bin/calico-node -felix-live`, matching Calico's documented container probe style.

## Review Notes
- The `projectcalico.org/v3` HostEndpoint and GlobalNetworkPolicy manifests are appropriate for `calicoctl` workflows. Clusters using Kubernetes CRDs directly may expose Calico resources under CRD-backed aliases, but that is outside this post's `calicoctl` examples.
- `applyOnForward: true` is correct when host endpoint policy should also apply to forwarded traffic. Calico documentation notes that forwarded traffic is otherwise allowed by default if no applicable `applyOnForward: true` policy exists for that direction.
- Host endpoints are high-risk changes because traffic to or from local host processes is denied by default unless allowed by policy or failsafe rules. The post's lockout warning is technically accurate.
