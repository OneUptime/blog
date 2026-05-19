# Validation Summary: How to Set Up a Two-Node HA Cluster with Pacemaker on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Pacemaker 2.1.x (Ubuntu 24.04 ships 2.1.6)
- Corosync 3.1.x (Ubuntu 24.04 ships 3.1.7, KNET transport)
- pcs 0.11.x (Ubuntu 24.04 ships 0.11.7)
- crmsh
- fence-agents (fence_virsh, fence_ipmilan)
- ocf:heartbeat:IPaddr2 resource agent
- systemd resource class (nginx example)
- chrony (NTP)
- ufw (firewall)

## Sources Consulted
- stonith_admin manpage (Ubuntu Noble): https://manpages.ubuntu.com/manpages/noble/man8/stonith_admin.8.html
- Pacemaker administration tools docs: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Administration/html/tools.html
- pcs manpage (Debian/Ubuntu): https://manpages.debian.org/testing/pcs/pcs.8.en.html
- pcs CHANGELOG: https://github.com/ClusterLabs/pcs/blob/main/CHANGELOG.md
- Corosync corosync.conf manpage: https://manpages.debian.org/unstable/corosync/corosync.conf.5.en.html
- fence_virsh manpage: https://manpages.ubuntu.com/manpages/noble/man8/fence_virsh.8.html
- fence_ipmilan manpage: https://manpages.ubuntu.com/manpages/noble/man8/fence_ipmilan.8.html
- Pacemaker Explained — Fencing: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Explained/html/fencing.html
- Red Hat HA cluster configuration docs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/

## Issues Found

1. **`stonith_admin --test` does not exist.** The "Test Fencing" section invented a `--test` flag and an accompanying `--yes-really-reboot` flag. Neither exists in any current Pacemaker release. Replaced the section with valid alternatives: `stonith_admin --validate --agent <agent> --option ...` for non-destructive validation, `pcs stonith config`/`status` to inspect device state, calling the underlying fence agent with `-o status` for a connectivity check, and a commented-out `pcs stonith fence node2` example for actual fencing.

2. **Corosync port range was off by one.** The post listed UDP `5404-5406`. The actual defaults are `5404-5405` (5405 is the default `mcastport`; 5404 is `mcastport - 1` for legacy multicast send). Corrected the port range and the explanatory comment, and also reworded "Pacemaker uses TCP port 2224" to "pcsd uses TCP port 2224" since 2224 is the pcsd port, not a Pacemaker port (Pacemaker itself communicates via Corosync).

## Review Notes

- The deprecated pcs syntaxes `pcs resource defaults <name>=<value>` and `pcs constraint show` still function in pcs 0.11.7 (Ubuntu 24.04) — they emit deprecation warnings but work. They are scheduled for removal in pcs 0.12. The forward-compatible forms are `pcs resource defaults update <name>=<value>` and `pcs constraint config`. Left as-is since the commands still execute correctly on the target distribution.
- Legacy fence-agent parameter names (`ipaddr`, `login`, `passwd`) are deprecated aliases of `ip`, `username`, `password`, but they continue to be accepted by the fence agents on Ubuntu 24.04. Left as-is.
- `pcmk_host_list` is technically a Pacemaker "special instance attribute" interpreted by `pacemaker-fenced`, not a fence-agent parameter, but the way the post uses it (passed to `pcs stonith create`) is correct usage.
- The `nic=eth0` interface name in the IPaddr2 example is an example; on modern Ubuntu the user will need to adapt this to whatever predictable interface name (`enp0s3`, `ens18`, etc.) their hardware exposes. This is implicit but worth noting.
- With Corosync 3's default KNET transport on Ubuntu 24.04, only UDP 5405 is strictly required between nodes, but allowing 5404-5405 covers both legacy UDP/UDPU and KNET configurations safely.
