# Validation Summary: How to Troubleshoot HA Cluster Split-Brain Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Pacemaker (cluster resource manager)
- Corosync (cluster communication layer, including knet transport)
- pcs (Pacemaker/Corosync CLI)
- STONITH / fence_ipmilan
- corosync-qnetd / qdevice (quorum device)
- corosync-cfgtool, corosync-quorumtool, corosync-cmapctl
- crm_mon
- Ubuntu networking utilities (ip, arping, arp, netstat, journalctl)

## Sources Consulted
- ClusterLabs Pacemaker documentation: https://clusterlabs.org/pacemaker/doc/
- pcs command reference (pcs 0.10.x and 0.11.x): https://clusterlabs.github.io/pcs/
- Corosync documentation: https://corosync.github.io/corosync/
- fence_ipmilan man page (fence-agents project): https://github.com/ClusterLabs/fence-agents
- Ubuntu package documentation for corosync-qnetd (Ubuntu 22.04/24.04)
- knet (kronosnet) documentation: https://kronosnet.org/
- pcs changelog notes on deprecation/removal of `show` subcommands in 0.11.x

## Issues Found
- **Deprecated pcs subcommands in the health-check section.** The post used `pcs stonith show` and `pcs property show stonith-enabled`. Both `show` forms were deprecated in pcs 0.10 and removed/replaced in pcs 0.11.x (which ships in Ubuntu 24.04+). Updated to the current syntax: `pcs stonith config` and `pcs property config stonith-enabled`, which works on both pcs 0.10.x and 0.11.x.

## Review Notes
- The corosync.conf snippet correctly uses the knet transport (the default since Corosync 3) and multiple ring addresses (`ring0_addr`/`ring1_addr`) per node, which is the supported way to configure redundant links with knet.
- The qdevice example uses `algorithm=lms` (Last Man Standing). For a two-node cluster, `algorithm=ffsplit` is the more commonly recommended algorithm, but `lms` is still a valid choice and works; this is a tuning preference rather than a technical error, so it was left as-is.
- `arp -n` and `netstat -s` come from the legacy net-tools package and are deprecated in favor of `ip neigh show` and `ss -s`, but both still work on current Ubuntu releases and are commonly available, so they were not changed.
- `pcs stonith confirm <node>` is correctly described as a manual override to tell the cluster a fenced node is confirmed down; the warning to only use it when the node is physically confirmed off is appropriate.
- The recovery flow (standby losing node → verify winner → fix network → restart corosync/pacemaker on losing node → unstandby → cleanup) matches the standard Pacemaker recovery sequence.
- The fence_ipmilan parameters (`pcmk_host_list`, `ipaddr`, `login`, `passwd`, `lanplus`) are all valid agent parameters.
