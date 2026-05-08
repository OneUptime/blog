# Validation Summary: Standardizing Team Workflows Around calicoctl node checksystem

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Linux kernel modules
- Bash automation
- SSH-based node validation

## Sources Consulted
- Calico documentation: `calicoctl node checksystem` command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico documentation: Kubernetes system requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Project Calico v3.32.0 source: `calicoctl/calicoctl/commands/node/checksystem.go`, https://github.com/projectcalico/calico/blob/v3.32.0/calicoctl/calicoctl/commands/node/checksystem.go

## Issues Found
- The golden image specification used Linux kernel `5.4.0`, but current Calico Kubernetes node requirements state Linux kernel 5.10 or later. I updated the required kernel to `5.10.0`.
- The distribution example listed Rocky Linux 9 as a Calico-documented baseline. Current Calico documentation lists RHEL 8 or later, so I changed the example to match the documented family.
- The module list did not match the current `checksystem` implementation and included modules such as `nf_conntrack` while omitting current checks such as `nf_conntrack_netlink`, `xt_u32`, `xt_addrtype`, and `ipt_ipvs`. I updated the module list and validation script to align with current `checksystem` checks, while keeping VXLAN and IPIP as mode-specific modules.
- The sysctl example listed reverse path filtering settings as standard Calico requirements. They are not part of `calicoctl node checksystem` and can be deployment-sensitive, so I removed the `rp_filter` entries.
- The validation scripts counted `ERROR`, but current `checksystem` output reports failed checks with `FAIL` and returns a non-zero status. I updated the scripts to count `FAIL` and handle non-zero command status.
- The golden image script printed the minimum kernel version but did not enforce it. I added a version comparison check.
- The continuous compliance script assumed `calicoctl` could be executed from the `calico-node` pod. Official documentation describes `checksystem` as a host compatibility check using host kernel/module files, so I changed the example to run `sudo calicoctl node checksystem` on each node over SSH, consistent with the admission script.

## Review Notes
`calicoctl node checksystem` checks kernel version and kernel module availability; it does not validate every Calico deployment prerequisite. Teams should still separately validate NetworkManager behavior, host firewalls, forwarding sysctls, CNI paths, and dataplane-specific requirements for their chosen Calico mode.
