# Validation Summary: How to Configure RIPng on Linux with FRRouting

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- FRRouting
- RIPng
- Linux
- IPv6 routing
- vtysh
- systemd
- iproute2

## Sources Consulted
- FRRouting RIPng documentation - https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting Basic Setup documentation - https://docs.frrouting.org/en/stable-10.4/setup.html
- FRRouting Zebra documentation - https://docs.frrouting.org/en/latest/zebra.html
- RFC 2080: RIPng for IPv6 - https://datatracker.ietf.org/doc/html/rfc2080
- FRRouting source, `ripngd/ripng_cli.c` command definitions - https://github.com/FRRouting/frr/blob/4e2a60ce8cc37556a516e545b581840726e489ab/ripngd/ripng_cli.c
- FRRouting source, `zebra/zebra_rib.c` route distance defaults - https://github.com/FRRouting/frr/blob/4e2a60ce8cc37556a516e545b581840726e489ab/zebra/zebra_rib.c
- FRRouting source, `tools/etc/iproute2/rt_protos.d/frr.conf` protocol names - https://github.com/FRRouting/frr/blob/4e2a60ce8cc37556a516e545b581840726e489ab/tools/etc/iproute2/rt_protos.d/frr.conf

## Issues Found
- The overview compared FRR RIPng activation to Cisco IOS. FRR enables RIPng with `network <interface>` inside `router ripng`, so the wording was changed to describe the FRR syntax directly.
- The timer comment called the third `timers basic` value a hold-down timer. FRRouting documents it as the garbage-collection interval, so the comment was corrected.
- The passive-interface example used invalid interface syntax: `interface eth2` with `ipv6 rip passive`. FRRouting's RIPng command is `passive-interface IFNAME` under `router ripng`, so the example was corrected.
- The direct configuration example pointed at `/etc/frr/ripngd.conf`. Current FRRouting documentation says daemon configuration should be saved in the integrated `/etc/frr/frr.conf`; per-daemon files are legacy and are not updated by `write memory`. The example was updated to `/etc/frr/frr.conf`.
- The administrative distance section used `distance 115` under `router ripng`, but current `ripngd` does not provide that subcommand. The section now explains the default zebra administrative distance behavior for RIPng.
- The verification command comments had `show ipv6 ripng` and `show ipv6 ripng status` descriptions reversed. They were corrected to match FRRouting's documentation.
- The sample `show ipv6 ripng` output did not match current FRRouting output headers. It was updated to the current route table layout.

## Review Notes
The remaining installation, daemon enablement, RIPng network activation, redistribution, default route, debug, and route verification commands are consistent with current FRRouting documentation and source behavior. `ip -6 route show proto ripng` relies on FRRouting's installed iproute2 protocol name mapping for `ripng` protocol 190.
