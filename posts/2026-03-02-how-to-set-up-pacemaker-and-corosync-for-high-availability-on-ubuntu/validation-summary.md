# Validation Summary: How to Set Up Pacemaker and Corosync for High Availability on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Pacemaker (cluster resource manager)
- Corosync (cluster membership and messaging)
- pcs (Pacemaker/Corosync Configuration System, version 0.11.x on Ubuntu 24.04)
- STONITH / fencing agents (fence_vmware_rest, fence_ipmilan, fence_aws, fence_virsh)
- OCF resource agents (ocf:heartbeat:IPaddr2)
- systemd resource agents
- Ubuntu 24.04 LTS

## Sources Consulted
- ClusterLabs Pacemaker Explained — Fencing: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Explained/html/fencing.html
- pcs CHANGELOG (ClusterLabs): https://github.com/ClusterLabs/pcs/blob/main/CHANGELOG.md
- Red Hat: Configuring and Managing HA Clusters — pcs CLI reference
- Ubuntu Server documentation — Pacemaker fence agents: https://documentation.ubuntu.com/server/explanation/high-availability/pacemaker-fence-agents/
- Ubuntu Noble fence-agents package: https://launchpad.net/ubuntu/+source/fence-agents
- Red Hat solutions: fence_vmware_rest and fence_vmware_soap STONITH configuration
- corosync-cfgtool source (ClusterLabs)

## Issues Found

1. **Incorrect claim about SSH requirement (Step 2).** The post stated "Pacemaker needs passwordless SSH to perform fencing operations." This is wrong — cluster authentication uses `pcsd` on TCP 2224 with the `hacluster` user. SSH is only needed for specific SSH-based fence agents (e.g., `fence_virsh`) or for general administration. Reworded the section header to "(Optional)" and clarified the actual purpose.

2. **Non-existent fence agent `fence_vmware` (Step 6).** The bare `fence_vmware` is not a current fence-agents binary. Replaced with `fence_vmware_rest` (the preferred agent for modern vCenter). Also corrected the parameter names — VMware/IPMI fence agents use `ip`, `username`, `password` (not `ipaddr`, `login`, `passwd`, which were older aliases that have been deprecated in current fence-agents).

3. **Deprecated `pcs resource defaults` syntax (Step 9).** In pcs 0.11.x (Ubuntu 24.04), `pcs resource defaults <name>=<value>` is deprecated and emits a warning. Updated all three occurrences to the supported `pcs resource defaults update <name>=<value>` form.

4. **Package name for fence agents (Step 3).** `fence-agents` on Ubuntu 24.04 is a transitional metapackage; the actual content is in `fence-agents-base` and `fence-agents-extra`. Updated the install line to pull both, which is required if the reader wants the VMware/AWS fence agents shown later in the post.

5. **Missing `###` markdown prefix on "Resources Not Starting" subheading.** Added the heading marker so it renders as a subsection.

## Review Notes

- The manual `corosync.conf` example uses the legacy `interface { ringnumber: 0; bindnetaddr: ...; broadcast: no; mcastport: 5405 }` block alongside the modern `nodelist` block. This is still valid syntax for Corosync 3.x with the `udpu` transport, but the default for new Corosync 3.x deployments is the `knet` transport, which uses `linknumber` and per-node `ring0_addr` only (no `interface` block needed). The `pcs cluster setup` path generates a clean knet configuration, so users following the recommended path will not see this legacy layout. Left as-is since the post explicitly frames this as an "Alternative" for users who want manual control.
- `IPaddr2`'s `nic=eth0` is hard-coded; on modern Ubuntu, predictable network interface names (`ens3`, `enp1s0`, etc.) are common — readers should substitute their actual interface. Not corrected since the post documents this as a lab setup example.
- `pcs cluster setup ... --enable` enables corosync/pacemaker on boot, which is correct.
- `corosync-cfgtool -s` is correct in Corosync 3.x (prints link/ring status).
- `pcs host auth` (replacing the old `pcs cluster auth`) is correct for pcs 0.10+.
- `pcs resource move` (used in the troubleshooting section) implicitly creates a location constraint with `INFINITY` score; in pcs 0.11 the preferred long-term form for a permanent move is to use `--master`/`--lifetime` or to clear the constraint with `pcs resource clear` once done. Left as-is since the post uses it for troubleshooting (forcing a one-time move), which matches the documented behavior.
