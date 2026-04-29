# Validation Summary: How to Monitor IPv6 BGP Sessions with Monitoring Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BGP / MP-BGP (IPv6 address family)
- BGP-MIB (RFC 4273) and BGP4V2-MIB (draft-ietf-idr-bgp4-mibv2)
- Net-SNMP (`snmpwalk`)
- Prometheus SNMP Exporter
- FRR (Free Range Routing) and `tynany/frr_exporter`
- BIRD routing daemon and `czerwonk/bird_exporter`
- Prometheus / PromQL
- Grafana
- Prometheus Alertmanager rules

## Sources Consulted
- [draft-ietf-idr-bgp4-mibv2-15 (BGP4V2-MIB IETF draft)](https://datatracker.ietf.org/doc/html/draft-ietf-idr-bgp4-mibv2-15)
- [Arista BGP4V2-MIB reference](https://www.arista.com/assets/data/docs/MIBS/ARISTA-BGP4V2-MIB.txt)
- [OID reference for BGP-MIB (1.3.6.1.2.1.15)](https://oidref.com/1.3.6.1.2.1.15)
- [tynany/frr_exporter GitHub repository](https://github.com/tynany/frr_exporter)
- [Prometheus default port allocations](https://github.com/prometheus/prometheus/wiki/Default-port-allocations) (frr_exporter on 9342, bird_exporter on 9324)

## Issues Found
- **Incorrect BGP4V2-MIB OIDs in the SNMP exporter configuration.** The original module listed `1.3.6.1.3.5.1.1.2` as `bgp4V2PeerState`, but that OID is the `bgp4V2PeerTable` itself. According to the BGP4V2-MIB (`Bgp4V2PeerEntry` SEQUENCE), `bgp4V2PeerState` is column **13** and `bgp4V2PeerAdminStatus` is column **12**, so the full column OIDs are `…1.1.2.1.13` and `…1.1.2.1.12`. The original config also listed `bgp4V2PeerInUpdates` and `bgp4V2PeerOutUpdates` at columns 10 and 11 of the peer table — those counters live in the separate `bgp4V2PeerCountersTable`, not the peer table, and column 10 of `bgp4V2PeerEntry` is actually `bgp4V2PeerRemoteAs`. I rewrote the `walk`/`metrics` block to walk just the peer table prefix and reference the correct full column OIDs for state and admin status, with an extra metric definition for `bgp4v2_peer_admin_status`. The in/out update counters were dropped from the example to avoid pointing readers at a wrong OID; readers wanting them should walk `bgp4V2PeerCountersTable` instead.

## Review Notes
- BGP4V2-MIB is still an IETF draft (no final RFC) and the root OID was never officially assigned by IANA. The conventional `1.3.6.1.3.5` (under `experimental`) prefix used in the post is what most vendor implementations adopt, but real-world deployments may need to substitute the vendor MIB tree (e.g. Juniper `jnxBgpM2` at `1.3.6.1.4.1.2636.5.1.1`, or Arista's `aristaBgp4V2`).
- The `snmpwalk -v2c -c public "[2001:db8::router1]"` form relies on Net-SNMP auto-detecting IPv6 from the brackets; on older Net-SNMP versions or unusual transports, an explicit `udp6:[…]` prefix may be required.
- The `bird_exporter -bird.socket=/var/run/bird/bird6.ctl` example targets BIRD 1.x with a non-default socket path. For BIRD 1.x with both daemons, `-bird.socket6` is the conventional flag for the IPv6 control socket; for BIRD 2.x there is a single unified daemon and `-bird.v2` should be used. This was left as-is since the command is still valid for the configuration it describes.
- The `relabel_configs` in the Prometheus job is effectively a no-op (Prometheus already populates `instance` from `__address__` by default), but is harmless.
- The BGP FSM state codes (1=idle, 2=connect, 3=active, 4=opensent, 5=openconfirm, 6=established) are consistent with both BGP-MIB (RFC 4273) and BGP4V2-MIB.
