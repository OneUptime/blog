# Validation Summary: Using calicoctl node diags with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Linux routing, iptables, ipsets, and nftables
- SSH, SCP, tar, and shell scripting

## Sources Consulted
- Calico official `calicoctl node diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico official `calicoctl node` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico official troubleshooting and diagnostics guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico official troubleshooting commands guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico official `calicoctl cluster diags` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico `calicoctl node diags` implementation source: https://raw.githubusercontent.com/projectcalico/calicoctl/v3.21.5/calicoctl/commands/node/diags.go
- Kubernetes official `kubectl cp` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Calico official nftables data plane guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables

## Issues Found
- The post said `calicoctl node diags` creates the tarball in the current directory with a `/tmp/calico-diags-...tar.gz` style name. Official documentation shows it creates a temporary `/tmp/calico...` directory and saves `diags-...tar.gz` there, so the examples and extraction commands were updated.
- The Kubernetes examples ran `calicoctl node diags` inside the `calico-node` pod. Official Calico documentation says `calicoctl node ...` commands must run directly on the compute host because they need host filesystem and networking access. The examples were changed to run the command on the node over SSH and copy the resulting tarball with SCP.
- The multi-node script used `kubectl exec` and `kubectl cp` with a remote wildcard. This was corrected to use SSH/SCP and to discover the generated diagnostic tarball path on each node.
- The diagnostic bundle file list and analysis commands referenced names such as `ip-route`, `iptables`, `felix-logs`, `bird-logs`, and `bgp-status`. The `calicoctl node diags` implementation writes files under `diagnostics/` with names such as `ipv4_route`, `ipv4_tables`, `ipsets`, `journalctl_calico_node`, and `logs/`, so those examples were updated.
- The routing section described blackhole routes as indicating issues. Calico troubleshooting examples show blackhole routes can be normal for local Calico IP blocks, so the wording now says to review them rather than treat them as inherently faulty.
- The nftables troubleshooting note implied the node diags bundle should contain nftables output. Since the documented `node diags` output focuses on iptables and Calico has a separate nftables data plane mode, the note now recommends collecting `sudo nft list ruleset` separately if needed.
- Overbroad wording about collecting "everything relevant" and being the "most comprehensive" command was softened to avoid overstating the command relative to version differences and `calicoctl cluster diags`.

## Review Notes
The post is technically relevant and now matches the documented behavior of `calicoctl node diags`. Future improvements could mention `calicoctl cluster diags` as a Kubernetes-native cluster-wide alternative, but that was not added because the article is specifically focused on node-level diagnostics.
