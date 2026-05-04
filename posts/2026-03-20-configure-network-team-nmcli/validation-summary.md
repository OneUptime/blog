# Validation Summary: How to Configure a Network Team with nmcli

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nmcli (NetworkManager CLI)
- teamd (network teaming daemon)
- teamdctl (teamd control tool)
- RHEL / CentOS networking
- Link aggregation runners: activebackup, lacp (802.3ad), roundrobin, loadbalance
- Link watchers: ethtool, arp_ping
- iproute2 (`ip` command)

## Sources Consulted
- teamdctl(8) man page — https://man.archlinux.org/man/teamdctl.8.en
- teamd.conf(5) man page (runners, link_watch options, tx_hash values)
- Red Hat Enterprise Linux 7 Networking Guide, "Controlling teamd with teamdctl" — https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/sec-controlling_teamd_with_teamdctl
- libteam upstream issue tracker — https://github.com/jpirko/libteam

## Issues Found
1. **Invalid `teamdctl team0 ports` subcommand.** The teamdctl tool exposes `port add`, `port remove`, `port present`, `port config update`, and `port config dump` — but no plain `ports` subcommand. Replaced the line with `teamdctl team0 config dump`, which shows the running configuration including ports (matches the original intent of the comment).
2. **`teamdctl team0 state view` does not produce JSON.** Per the man page, `state view` parses the JSON state document into human-readable text, while `state dump` (or just `state`) emits raw JSON. The comment said "Show full JSON state", so changed the command to `teamdctl team0 state dump` to match the comment.

## Review Notes
- Verified all `team.config` JSON: runner names (`activebackup`, `lacp`, `roundrobin`, `loadbalance`), LACP options (`active`, `fast_rate`, `tx_hash`), `tx_hash` values (`eth`, `ip`, `l4`), and `arp_ping` keys (`interval`, `missed_max`, `target_host`) are all valid per teamd.conf(5).
- The `master team0` shortcut on the ethernet ports relies on nmcli inferring `slave-type team` from the master interface. This works on supported NetworkManager versions; on older versions an explicit `slave-type team` may be required.
- Teaming has been deprecated in NetworkManager / RHEL 9+ in favour of bonding (which now offers similar feature parity). The post is still accurate for RHEL 7/8 and systems where teamd is installed, but readers on newer distributions should be aware that bonding is the going-forward recommendation.
- The "Modifying Team Runner" section shows `nmcli connection delete team0` followed by an inline `nmcli connection modify` example as alternatives; the inline modify approach works but the running team must be reactivated (which the example does with `nmcli connection up team0`).
