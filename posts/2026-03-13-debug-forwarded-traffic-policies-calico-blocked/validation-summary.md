# Validation Summary: How to Debug Forwarded Traffic Policies for Calico Hosts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- iptables dataplane troubleshooting

## Sources Consulted
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico applyOnForward host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico host endpoint object creation guidance: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico host endpoint basic connectivity guidance: https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Project Calico API reference for policy Rule and EntityRule fields: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3

## Issues Found
- The GlobalNetworkPolicy ingress rule matched `destination.ports` without setting `protocol`. Calico policy rules require a protocol match when ports are specified because ports only apply to port-bearing protocols. Added `protocol: TCP` to the rule so ports 22, 443, and 6443 are valid.
- The implementation commands created the HostEndpoint before applying policy. Calico documentation recommends creating policy before HostEndpoint objects to avoid enforcing the default host endpoint deny behavior before allow rules exist. Reordered the commands to apply the policy first.
- The iptables troubleshooting command used `grep CALICO`, which can miss Calico's lower-case `cali` chain names and comments. Changed it to `sudo iptables-save | grep -i cali` and clarified that it applies to the iptables dataplane.
- The Felix liveness command assumed the `kube-system` namespace and relied on `calico-node` being on PATH. Calico installations may use `calico-system` or `kube-system`, depending on installation method. Changed the namespace to `<calico-namespace>` and used `/bin/calico-node`.

## Review Notes
The guide is accurate for Calico host endpoint policy concepts after the fixes. In future revisions, it could mention that eBPF dataplane troubleshooting uses different tooling than iptables and that the exact Calico namespace depends on whether Calico was installed by operator or manifest.
