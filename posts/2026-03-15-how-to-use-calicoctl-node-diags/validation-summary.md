# Validation Summary: How to Use calicoctl node diags with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- `calicoctl`
- Kubernetes
- Linux networking tools: `ip`, `iptables-save`, `ip6tables-save`, `nft`, `ipset`, `netstat`, `ss`
- SSH and shell scripting

## Sources Consulted
- Calico Open Source `calicoctl node diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico Open Source troubleshooting and diagnostics documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico v3.32.0 `calicoctl node diags` implementation: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/calicoctl/calicoctl/commands/node/diags.go
- Calico v3.32.0 `calico-node` command implementation: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/node/cmd/calico-node/main.go

## Issues Found
- The post said the tarball is created in the current directory and used the name `calico-diags-*.tar.gz`. Official documentation and the current implementation save `diags-<timestamp>.tar.gz` under a temporary `/tmp/calico...` directory. Updated the example output, copy command, extraction command, and verification commands.
- The post used `kubectl exec ... -- calico-node -diags`. Current `calico-node` does not expose a `-diags` flag. Replaced the pod execution flow with Kubernetes node identification followed by running `sudo calicoctl node diags` on the target node.
- The post listed generated files such as `route`, `route6`, `iptables`, `bird_protocols`, and `bird_routes`. Current Calico writes files under `diagnostics/` with names such as `ipv4_route`, `ipv6_route`, `ipv4_tables`, `ipv6_tables`, `nft_ruleset`, and `journalctl_calico_node`. Updated the analysis and comparison examples.
- The post claimed `calicoctl node diags` directly collects BIRD protocol status and route tables. Current Calico does not dump BIRD protocol tables directly from this command, so the BIRD analysis section was replaced with Calico node journal inspection and the troubleshooting note now points users to `calicoctl node status` for BGP peer status.
- The multi-node collection script depended on the invalid `calico-node -diags` pod command and a remote wildcard copy. Reworked it to iterate Kubernetes nodes, run `sudo calicoctl node diags` over SSH, parse the printed bundle path, and copy the tarball with `sudo cat`.
- The collected-data list overstated some fields, including OS version, kernel version, uptime, ARP cache, and direct BIRD data. Updated the list to match the current implementation.

## Review Notes
- The guide now assumes SSH access to nodes for multi-node collection. For clusters where direct node SSH is unavailable, Calico's separate `calicoctl cluster diags` command may be a better operational fit, but that is outside the scope of this node-focused post.
