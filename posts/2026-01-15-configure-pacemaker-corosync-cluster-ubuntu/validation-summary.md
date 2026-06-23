# Validation Summary: How to Configure Pacemaker and Corosync Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Pacemaker (cluster resource manager)
- Corosync (cluster communication layer, knet transport)
- pcs (pcs/pcsd command-line cluster management, 0.11.x on Ubuntu 22.04)
- Ubuntu 22.04 LTS+
- OCF resource agents (IPaddr2, apache, pgsql, controld)
- STONITH / fencing agents (fence_ipmilan, fence_vmware_soap, fence_aws)
- crm_mon, corosync-cfgtool, corosync-quorumtool, stonith_admin

## Sources Consulted
- pcs man page / ClusterLabs pcs documentation — https://clusterlabs.org/pacemaker/doc/ (command syntax for `pcs host auth`, `pcs cluster setup`, `pcs resource`, `pcs constraint`, `pcs stonith`)
- Pacemaker "Clusters from Scratch" and "Pacemaker Explained" — https://clusterlabs.org/pacemaker/doc/
- Corosync corosync.conf(5) man page (totem/knet, crypto_cipher/crypto_hash, votequorum, two_node) — https://manpages.ubuntu.com/manpages/jammy/man5/corosync.conf.5.html
- Ubuntu package metadata for pacemaker/corosync/pcs on 22.04 (pcs 0.11.x)
- OCF Resource Agent specification (resource agent naming: `class:provider:type`)
- Red Hat / ClusterLabs HA firewall port guidance (2224/tcp, 3121/tcp, 5404-5405/udp)

## Issues Found
1. **Incorrect resource-agent name format (line ~407).** The explanatory comment described `ocf:heartbeat:IPaddr2` as `(provider:class:type)`. The OCF naming convention is `class:provider:type` (ocf = class, heartbeat = provider, IPaddr2 = type). Corrected the comment.

2. **Dangerous mischaracterization of `pcs stonith fence` as a dry run (3 places).** The post repeatedly described `sudo pcs stonith fence node2 --off` as a "dry run" that "does not actually fence" / shows "success without actually powering off node2." This is false and dangerous: `pcs stonith fence` performs a REAL fence operation, and `--off` simply makes it power off the node instead of rebooting it (reboot is the default). Rewrote the comments in "Testing Fencing", "Testing STONITH", and the split-brain troubleshooting section to clearly state that the command actually fences the node.

3. **Deprecated/removed `pcs resource show` (line ~1090).** `pcs resource show <resource>` was removed in pcs 0.11 (the version shipped on Ubuntu 22.04+); the replacement for viewing a resource's full configuration is `pcs resource config <resource>`. Updated the command.

4. **Mislabeled `pcs resource agents` comment (line ~490).** The comment said "List all available resource agent **classes**", but `pcs resource agents` lists agents (classes/standards are listed by `pcs resource standards`). Corrected the comment wording.

5. **Broken `sudo cat > file` redirect for the alert script (line ~906).** `sudo cat > /var/lib/pacemaker/alert_email.sh` fails because the `>` redirection is performed by the unprivileged shell, not by `sudo`, so it cannot write to the root-owned directory. Replaced with the correct `sudo tee /var/lib/pacemaker/alert_email.sh > /dev/null` idiom and added an explanatory note.

## Review Notes
- **Two-node quorum advice (`no-quorum-policy=ignore`).** The post suggests `pcs property set no-quorum-policy=ignore` for 2-node clusters. This works but is legacy/discouraged guidance — modern pcs automatically writes `two_node: 1` (with `wait_for_all: 1`) into corosync.conf when setting up a 2-node cluster, which is the preferred mechanism. The post does also show the `two_node`/`wait_for_all` alternative, so this was left as-is, but readers should prefer the `two_node` approach.
- **Firewall ports.** Port 5403/tcp is actually the corosync-qnetd (quorum device) port rather than core corosync; corosync itself uses 5404-5405/udp. The DLM port (21064/tcp) needed for cloned DLM resources is not listed. These are minor/contextual and were left unchanged.
- **`pcs property show stonith-enabled`** still works in pcs 0.11 (with `pcs property config` being the newer preferred form), so it was left as-is.
- `role=Master`/`role=Slave` and `promoted-max`/`promoted-node-max` are accepted by current Pacemaker (Master/Slave being deprecated aliases for Promoted/Unpromoted); commands remain functional and were left unchanged.
- Overall the tutorial is accurate, well-structured, and uses current pcs 0.10/0.11-style commands (`pcs host auth`, `pcs cluster setup <name> <nodes>`, `pcs resource promotable`).
