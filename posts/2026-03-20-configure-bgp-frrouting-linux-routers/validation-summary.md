# Validation Summary: How to Configure BGP on FRRouting (FRR) for Linux Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- FRRouting (FRR)
- BGP
- Linux routing
- `vtysh`
- Debian/Ubuntu APT packaging
- `systemd`
- `iproute2`

## Sources Consulted
- FRR Debian repository instructions: https://deb.frrouting.org/
- FRR BGP documentation: https://docs.frrouting.org/en/stable-10.4/bgp.html
- FRR VTY shell documentation: https://docs.frrouting.org/en/latest/vtysh.html
- FRR Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRR Basic Commands documentation: https://docs.frrouting.org/en/stable-10.3/basic.html
- FRR Basic Setup documentation: https://docs.frrouting.org/en/stable-7.4/setup.html
- Debian `apt-key(8)` man page: https://manpages.debian.org/unstable/apt/apt-key.8.en.html
- Ubuntu `ip-route(8)` man page: https://manpages.ubuntu.com/manpages/xenial/man8/ip-route.8.html
- NVIDIA Cumulus Linux FRRouting documentation: https://docs.nvidia.com/networking-ethernet-software/cumulus-linux/Layer-3/FRRouting/
- VyOS FRR documentation: https://docs.vyos.io/en/latest/configuration/system/frr.html
- SONiC architecture documentation: https://github.com/sonic-net/SONiC/wiki/Architecture
- SONiC FRR repository: https://github.com/sonic-net/sonic-frr

## Issues Found
- The install section used `apt-key add`, which is deprecated in APT and no longer matches FRR's current repository instructions. I replaced it with the current keyring plus `signed-by` repository setup from `deb.frrouting.org`.
- The post described `9.x` as the latest stable FRR line. I updated that wording to the `frr-stable` track and refreshed the config example to `frr version 10.6`, which matched the current stable train on 2026-05-06.
- The post only enabled `bgpd` in `/etc/frr/daemons`. I added `zebra=yes` because Zebra is the daemon that installs routes into the Linux kernel, and later verification steps in the post rely on that behavior.
- The `write file /etc/frr/frr.conf` example treated `write file` as if it accepted an arbitrary path. I replaced it with the documented `write file` command.
- Several interactive FRR examples were labeled as `bash` even though they contained `vtysh` prompts and `!` comments. I changed those fences to `text` so they are not misleading as shell commands.
- The `network 192.168.0.0/16` example omitted the current FRR requirement that the advertised prefix must already exist in the local routing table when `bgp network import-check` is in effect, which is the default in modern FRR. I added that condition in the interactive and file-based examples.
- The conclusion still said to enable only the BGP daemon. I corrected it to say Zebra and BGP daemons.

## Review Notes
- The post is technically correct after these fixes. The package track and `frr version` example are version-sensitive, so they should be revisited when `frr-stable` moves past the 10.6 train.
- Sample `show` command output can vary slightly between FRR releases, but the commands used in the post are valid.
