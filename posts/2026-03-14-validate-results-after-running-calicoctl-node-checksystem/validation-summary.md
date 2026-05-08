# Validation Summary: Validating Results After Running calicoctl node checksystem

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes networking
- Linux kernel modules
- IPIP and VXLAN encapsulation
- kube-proxy IPVS mode
- BGPConfiguration and IPPool resources

## Sources Consulted
- Calico documentation: `calicoctl node checksystem` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico documentation: `calicoctl node` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: system requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/bare-metal/requirements
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico source: `calicoctl` checksystem implementation, https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/node/checksystem.go

## Issues Found
- The post described checksystem output as containing generic errors and showed `net.ipv4.ip_forward` as a checksystem error. Current Calico documentation and source describe `checksystem` as checking kernel version and kernel module availability, not sysctl forwarding values. I changed the section to describe OK/FAIL results, warnings, and non-zero exit status, and replaced the sysctl example with module failure output.
- The warning examples used `ip_vs` and "module not loaded" output, which does not match the documented `WARNING: Unable to detect...` format or the current checksystem module name `ipt_ipvs`. I updated the examples and script checks to match the documented/current output format.
- The validation script grepped for `.*not`, so it would miss the documented warning text (`Unable to detect...`). I changed the grep patterns to match both `Unable to detect...` warnings and `FAIL` lines.
- The IPv6 validation looked for forwarding warnings, but `checksystem` reports module detection warnings such as `ip6_tables`. I updated that check to match `ip6_tables` output.
- The BGP cross-validation command grepped for `nodeToNodeMesh`, while the documented field is `nodeToNodeMeshEnabled`. I updated the command and clarified that it checks the default BGP node-to-node mesh setting.
- The troubleshooting note said some implementations check persistent module configuration. Official docs state that checksystem checks `lsmod`, module metadata, kernel config files, and `/proc/net/ip_tables_matches`. I replaced the persistence wording with those documented lookup locations.

## Review Notes
The guide is version-sensitive because checksystem's required module list can change across Calico releases. The contextual validation script is still intentionally heuristic; operators should compare it with the exact checksystem output from their installed Calico version.
