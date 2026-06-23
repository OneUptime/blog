# Validation Summary: How to Configure Ceph Network Segmentation for Security

## Status
validated

## Post Type
Technical tutorial / infrastructure configuration guide

## Technologies Covered
- Ceph public and cluster networks
- Ceph Messenger v2 encryption
- CephX authentication
- Linux networking, VLANs, Netplan, and NetworkManager
- iptables, firewalld, and nftables
- Ceph Dashboard, Prometheus manager module, and RADOS Gateway ports
- Cisco IOS VLAN trunk configuration

## Sources Consulted
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- CephX Config Reference: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Prometheus Manager Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- nftables wiki quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes

## Issues Found
- Ceph daemon port ranges were listed as `6800-7300`, but current Ceph documentation uses `6800-7568` for OSD, MDS, and manager daemon binding. Updated the planning table, diagrams, iptables, firewalld, nftables, and verification script.
- The management network table listed Prometheus as port `3000`; Ceph's Prometheus manager module defaults to `9283`. Updated the table to `9283`.
- The `mon_host` example used v1-only `:6789` addresses while the post later disabled Messenger v1. Changed it to host addresses without a fixed v1 port and made v1 disablement explicitly optional in the main config example.
- A generic `[mon] public_addr = 10.0.1.11` would apply one address to all monitors. Replaced it with guidance to use per-daemon monitor sections.
- Removed the FileStore-era `osd_journal_size` example from a Quincy-or-later guide.
- Clarified that `ceph config assimilate-conf` imports settings into the monitor config database and that network binding changes require daemon restarts.
- Added the official `ceph mon enable-msgr2` step for enabling msgr2 monitor addresses.
- Corrected Messenger v2 mode descriptions: valid connection modes are `secure` and `crc`; `force` is not a Messenger connection mode. Updated the "require encryption" guidance to use only `secure`.
- Reworded the msgr2 sequence diagram to avoid implying TLS-style certificates.
- Replaced unreliable encryption verification commands with checks of effective Messenger mode configuration.
- Fixed the advanced OSD bind example to use per-OSD IP addresses instead of CIDR subnets for `public_addr` and `cluster_addr`.
- Removed obsolete/unsupported CephX hardening commands and corrected the ticket TTL wording so it no longer describes TTL as key rotation.
- Removed an overly broad iptables cluster-network rule that allowed all TCP traffic from the cluster subnet.
- Removed `mgr_modules = dashboard,prometheus` from the config snippet because manager modules should be enabled with `ceph mgr module enable`.

## Review Notes
The guide is technically relevant and useful after corrections. Some commands remain environment-dependent examples, especially firewall persistence paths, cephadm orchestration restarts, pool names used for `rados` testing, and switch syntax variations across Cisco platforms.
