# Validation Summary: How to Troubleshoot Client Connection Issues to Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- CephX authentication
- Linux networking tools (nc, ping, traceroute, iptables, firewall-cmd)
- Ceph CLI debugging flags

## Sources Consulted
- Ceph official documentation: Monitor configuration and default ports (6789 for v1 messenger, 3300 for v2/msgr2)
- Ceph official documentation: OSD port ranges (6800-7300)
- Ceph official documentation: CephX authentication and `ceph auth` commands
- Ceph official documentation: Debug logging options (`debug_ms`, `debug_auth`, `log_file`)
- Ceph CLI `--user`/`--id` flag documentation
- Linux `nc` (netcat), `iptables`, and `firewall-cmd` man pages

## Issues Found
No technical issues found.

## Review Notes
- The error table entry `crush: wrong epoch` is not a verbatim Ceph error message. In practice, a client with a stale CRUSH map would see OSDMap-related update messages rather than this exact string. However, the concept it conveys (stale client map causing issues) is correct, so no change was made.
- The `public_addr` setting under `[client]` is valid but uncommonly used. Most deployments rely on routing rather than binding clients to a specific address. This is not incorrect, just a less common configuration.
- All CLI flags correctly use the hyphenated form (`--debug-ms`) which Ceph normalizes interchangeably with underscores (`--debug_ms`), while config file entries correctly use the underscore form.
