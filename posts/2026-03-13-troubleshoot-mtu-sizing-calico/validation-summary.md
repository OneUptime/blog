# Validation Summary: How to Troubleshoot MTU Sizing for Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- MTU and Path MTU Discovery
- Linux networking diagnostics
- `kubectl`
- `ping`

## Sources Consulted
- Calico Open Source MTU configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- iputils `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- Linux `ip(7)` manual for Path MTU Discovery behavior: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `ip-link(8)` manual for `ip link show`: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- IETF RFC 1213 MIB-II `ipFragCreates` definition: https://www.ietf.org/rfc/rfc1213.txt.pdf

## Issues Found
- The `/proc/net/snmp` example searched for `IpFragCreates`, but Linux exposes paired `Ip:` header/value rows with the `FragCreates` column. Replaced the command with an `awk` parser that maps the header row to the value row and prints the correct fragment counter.
- The post described checking Calico MTU only through the manifest-based `calico-config` ConfigMap. Added the Operator `Installation` resource check for clusters installed with the Tigera operator.
- The MTU fix used `calicoctl patch felixconfiguration default` with `spec.mtu`, which is not a documented current Calico FelixConfiguration field for workload MTU. Replaced it with the documented Operator `Installation.spec.calicoNetwork.mtu` patch and the manifest-based `calico-config` `veth_mtu` patch.
- The restart instructions only restarted workload deployments. Updated them to note that manifest-based installs also need a `calico-node` DaemonSet restart after changing the ConfigMap, and that workload pods must be restarted because the updated MTU applies to new workloads.
- The conclusion said the shown ping process used binary search, but the example uses progressively larger payloads. Adjusted the wording to match the command shown.

## Review Notes
The `ping -M do -s` example is valid for Linux iputils, where `-M do` sets DF subject to kernel PMTU checks and `-s` specifies ICMP payload bytes. Operators should remember that the usable IP MTU includes IP and ICMP headers, so an ICMP payload size is not numerically identical to the link MTU.
