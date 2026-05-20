# Validation Summary: How to Set Up Floating IPs for High Availability on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management and systemd
- Pacemaker
- Corosync
- pcs
- OCF `IPaddr2` resource agent
- Keepalived
- VRRP
- ARP and gratuitous ARP

## Sources Consulted
- ClusterLabs pcs quick start: https://github.com/ClusterLabs/pcs
- ClusterLabs Pacemaker "Clusters from Scratch" documentation: https://clusterlabs.org/pacemaker/doc/2.1/Clusters_from_Scratch/
- OCF `IPaddr2` resource-agent man page: https://www.mankier.com/7/ocf_heartbeat_IPaddr2
- Keepalived configuration synopsis: https://keepalived.org/doc/configuration_synopsis.html
- Keepalived man page: https://www.keepalived.org/manpage.html
- Ubuntu `keepalived.conf(5)` man page: https://manpages.ubuntu.com/manpages/bionic/man5/keepalived.conf.5.html
- RFC 5798, Virtual Router Redundancy Protocol Version 3: https://www.rfc-editor.org/rfc/rfc5798

## Issues Found
- The introduction and description said the post covered a manual management approach, but no manual approach was present. Updated the scope wording to say the guide covers Pacemaker and Keepalived.
- The Pacemaker install command omitted the resource-agent package that provides the `ocf:heartbeat:IPaddr2` agent. Added `resource-agents` to the package list.
- The post referenced `broadcast_arp=true` for `IPaddr2`, but current `IPaddr2` documentation does not list that parameter. Replaced it with documented ARP-related parameters: `arp_count`, `arp_count_refresh`, and `arp_sender`.
- The Keepalived install command used a health check based on `/usr/bin/curl` but did not install `curl`. Added `curl` to the package list.
- The Keepalived backup configuration used `vrrp_script` without matching the script security settings shown in the master configuration. Added `script_user root` and `enable_script_security` to the backup `global_defs`.
- The notification script read the state from `$2`, but the configured `notify_master`, `notify_backup`, and `notify_fault` commands pass the state string as the first configured argument. Updated the script to read `STATE=$1`.
- The failover explanation implied a failed node can always have the VIP removed immediately. Updated the explanation to note that removal from the old owner happens when it is reachable or recovers.
- The Pacemaker ARP tuning example used `arp_interval`, which current `IPaddr2` documentation marks as deprecated and backward-compatible only. Replaced it with `arp_count_refresh`.

## Review Notes
- The example disables STONITH for a two-node Pacemaker cluster while warning to enable fencing in production. That is acceptable for a tutorial snippet, but a production guide should show a real fencing configuration.
- The Keepalived examples use simple password authentication. This remains documented, but environments using VRRP should still account for network trust boundaries and multicast/unicast reachability.
