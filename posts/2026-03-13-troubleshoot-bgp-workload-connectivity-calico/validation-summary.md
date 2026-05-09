# Validation Summary: How to Troubleshoot BGP to Workload Connectivity in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Linux routing
- iptables
- Linux reverse path filtering
- tcpdump
- kubectl

## Sources Consulted
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: WorkloadEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Enterprise documentation: The Calico data path: IP routing and iptables, https://docs.tigera.io/calico-enterprise/latest/reference/architecture/data-path
- Linux kernel documentation: IP sysctl rp_filter, https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local command help for iptables, ip route, sysctl, and tcpdump.

## Issues Found
- The original `cali-FORWARD` guidance said to ensure a default ACCEPT rule for pod traffic. Calico policy chains do not need to appear as a simple default ACCEPT rule, so this was changed to checking that the relevant policy rules allow the pod traffic.
- The RPF explanation was too imprecise and only checked `conf/all`. Linux validates reverse path filtering using the maximum value from `conf/all` and the receiving interface, so the text and commands were updated to check `all`, `default`, and the ingress interface, and to set both `all` and `default` to loose mode.
- The Calico interface check set `POD_UID` but never used it, which did not identify the host-side interface. The command was replaced with `ip link show dev cali<interface>` using the interface from `ip route get`, plus a fallback command to list `cali` interfaces.

## Review Notes
The commands are environment-dependent and assume the cluster is using Calico's Linux networking dataplane with iptables-visible chains. Clusters using different dataplane settings, nftables tooling, non-`eth0` node interfaces, or minimal containers without `tcpdump` may need adjusted commands.
