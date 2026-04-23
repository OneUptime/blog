# Validation Summary: How to Configure RIPng on Linux with Quagga

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Quagga
- RIPng
- Linux routing
- IPv6 forwarding
- systemd services
- FRRouting

## Sources Consulted
- Quagga manual, RIPng configuration and terminal commands: https://www.nongnu.org/quagga/docs/docs-multi/ripngd-Configuration.html
- Quagga manual, VTY modes and common terminal commands: https://www.nongnu.org/quagga/docs/quagga.html
- Debian Quagga source package notes for systemd and `/etc/quagga/daemons`: https://sources.debian.org/src/quagga/1.2.4-3/debian/quagga.NEWS/
- Debian Quagga `ripngd` init/service packaging source: https://sources.debian.org/src/quagga/1.2.4-3/redhat/ripngd.init/
- FRRouting RIPng documentation: https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting basic setup and `/etc/frr/daemons` documentation: https://docs.frrouting.org/en/latest/setup.html
- RFC 2080, RIPng for IPv6: https://datatracker.ietf.org/doc/rfc2080/

## Issues Found
- The service setup implied that editing `/etc/quagga/daemons` and starting `ripngd` directly was universally correct. Updated the instructions to distinguish older Debian/Ubuntu suite-service setups from packages that provide per-daemon systemd units, and to enable/start `zebra` with `ripngd`.
- The `ripngd.conf` example omitted `enable password zebra` even though the console workflow uses privileged mode. Added the enable password and the `enable` step in the Telnet/console examples.
- The console save command used `write memory`; Quagga documents `write file`. Updated the command.
- The verification commands used FRR-style `show ipv6 ripng` and directional `debug ripng packet recv`. Updated them to Quagga's documented `show ip ripng` and `debug ripng packet`, and clarified that `show ipv6 route` is run from zebra or vtysh.
- The Zebra section mixed configuration lines and shell commands in one shell block. Split the config snippet from the systemctl commands so the examples are not misleading.
- The FRR migration section described FRR as a drop-in replacement and copied to `/etc/frr/ripngd.conf`. Updated the wording and command comments to reflect current FRR's integrated `/etc/frr/frr.conf` configuration model.

## Review Notes
Quagga remains useful only for legacy systems. For new deployments, FRRouting is the maintained successor and its current documentation prefers integrated configuration in `/etc/frr/frr.conf`.
