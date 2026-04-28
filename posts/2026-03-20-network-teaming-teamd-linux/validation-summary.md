# Validation Summary: How to Configure Network Teaming with teamd on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- teamd (libteam) network teaming daemon
- teamdctl CLI control utility
- NetworkManager / nmcli
- NetworkManager-team plugin
- LACP (IEEE 802.3ad) link aggregation
- ARP ping link watcher
- ethtool link watcher
- iproute2 (`ip link`)
- RHEL/CentOS package management (dnf)
- journalctl

## Sources Consulted
- teamd / libteam project documentation: https://github.com/jpirko/libteam/wiki
- `teamd.conf(5)` manpage — runner names (`activebackup`, `lacp`, `roundrobin`, `loadbalance`, `broadcast`, `random`), `link_watch` types (`ethtool`, `arp_ping`, `nsna_ping`), `tx_hash` values
- `teamdctl(8)` manpage — valid subcommands: `state` (human-readable), `state dump` (JSON), `state item get <path>`, `config dump`
- `nmcli(1)` manpage — `connection add type team`, `team.config` property, `master` property
- Red Hat: "Configuring network teaming" guide (RHEL 7/8 networking documentation)
- Red Hat RHEL 9 release notes — teamd deprecation notice
- `ip-link(8)` manpage — `master DEV` filter for `ip link show`

## Issues Found

1. **Invalid teamdctl JSON output command** (line 95 in original): The post had `teamdctl team0 state view -j` to print JSON state, but `state view` is not a recognized teamdctl subcommand and `-j` is not a teamdctl flag. The correct subcommand for JSON output per `teamdctl(8)` is `state dump`. Fixed to `teamdctl team0 state dump`.

## Review Notes

- **teamd deprecation:** As of RHEL 9, the `teamd` service and `libteam` library are officially **deprecated** by Red Hat, who now recommend bonding (kernel `bonding` module) as the replacement. The post's framing of teamd as "the modern alternative to bonding" was accurate in the RHEL 7 / early-RHEL 8 era but is now reversed — bonding has gained the features (e.g., LACP fast rate, multiple link watchers) that originally motivated teamd, and teamd is on a removal track. The post is still useful for users on RHEL 7/8 or other distributions that ship teamd, but readers on RHEL 9+ should be aware. Editorial wording was left as-is per scope of review.
- **`nmcli` slave-type:** The port-add commands use `master team0` without an explicit `slave-type team`. Modern NetworkManager (1.x) infers `slave-type` from the master connection's type, so the commands work as written. Red Hat's official docs do recommend specifying `slave-type team` explicitly for unambiguous behavior, but the omission is not a technical error.
- **`active: true` in LACP runner:** Correct per `teamd.conf(5)` — `lacp.active` is a boolean controlling whether LACPDUs are transmitted (active vs. passive mode).
- **`tx_hash` values `["eth", "ip", "l4"]`:** All three are valid hash fragment types per teamd documentation.
- **`arp_ping` link watch parameters:** `interval` (ms), `missed_max`, and `target_host` are correctly named per `teamd.conf(5)`.
- The example output for `teamdctl team0 state` is representative of real output format.
