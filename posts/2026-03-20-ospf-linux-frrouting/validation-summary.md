# Validation Summary: How to Configure OSPF on Linux Using FRRouting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPF (Open Shortest Path First) v2 — link-state interior gateway protocol
- FRRouting (FRR) — open-source routing suite
- vtysh — FRR's integrated CLI shell
- Linux package management (apt on Debian/Ubuntu, yum on RHEL/Rocky)
- systemd (service management)

## Sources Consulted
- FRR Debian/Ubuntu install instructions: https://deb.frrouting.org/
- FRR RPM repository install instructions: https://rpm.frrouting.org/
- FRR OSPFv2 user docs: https://docs.frrouting.org/en/latest/ospfd.html
- RFC 2328 (OSPF Version 2)
- FRR project documentation: https://docs.frrouting.org/

## Issues Found

1. **Outdated Debian/Ubuntu install instructions** — The post used `apt-key add` with a `keys.asc` URL. `apt-key` is deprecated in Debian 11+ / Ubuntu 22.04+ and the official FRR docs now use the `signed-by=/usr/share/keyrings/frrouting.gpg` approach with `keys.gpg`. Updated the install snippet to match the current official FRR instructions (curl the binary key into `/usr/share/keyrings/`, set `FRRVER`, and add the repo entry with `[signed-by=...]`).

2. **Incomplete RHEL/CentOS install instructions** — The post showed only `sudo yum install frr`, which fails on stock RHEL/CentOS because FRR is not in the default repos. Replaced with the official approach: download and install the `$FRRVER-repo.elN.noarch.rpm` package from `rpm.frrouting.org`, then `yum install frr frr-pythontools`. Added a note that `el9` should be adjusted to match the target distro (el7/el8/el9/el10).

## Review Notes
- The OSPF protocol explanation (link-state, Hello packets, LSAs, Dijkstra, VLSM) is accurate and aligned with RFC 2328.
- The `vtysh` configuration snippets (`router ospf`, `ospf router-id`, `network ... area`, `passive-interface`, `ip ospf cost/hello-interval/dead-interval`, `redistribute connected/static/bgp`) are syntactically correct for FRR ospfd.
- The sample `show ip ospf neighbor` output is in the simplified column format used by older FRR/Quagga releases. Newer FRR builds also include an "Up Time" column and `RXmtL/RqstL/DBsmL` counters; the abbreviated form shown is acceptable for an illustrative example and not technically wrong.
- `vtysh -c "write memory"` writes to `/etc/frr/frr.conf` only when integrated config is enabled (the FRR default since 4.0). This matches typical install defaults; no change needed.
- Several commands (`sed -i ... /etc/frr/daemons`, `systemctl restart frr`) require root; the post intermixes `sudo` and bare commands. Left as-is since it is a stylistic choice and the commands are correct when run with appropriate privileges.
- The `passive-interface eth0` example is shown outside any `router ospf` block in the snippet flow; in FRR this directive belongs under `router ospf`. The surrounding `configure terminal` / `router ospf` context above implies it, and removing/re-entering the block is unnecessary clutter — left as-is.
