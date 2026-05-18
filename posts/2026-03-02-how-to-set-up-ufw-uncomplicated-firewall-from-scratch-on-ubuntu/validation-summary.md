# Validation Summary: How to Set Up UFW (Uncomplicated Firewall) from Scratch on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- iptables / netfilter
- Ubuntu (server)
- OpenSSH
- systemd (ufw.service)
- Docker (iptables interaction)
- IPv6 firewalling
- rsyslog / journalctl (logging)

## Sources Consulted
- `ufw(8)` man page (Ubuntu / UFW upstream, May 2023 revision)
- `ufw --help` output
- `/etc/default/ufw` (default config shipped by the `ufw` Debian package — documents `IPV6=yes`)
- `/etc/ufw/ufw.conf` (default config shipped by the `ufw` Debian package — documents `ENABLED` and `LOGLEVEL`)
- Ubuntu UFW community documentation: https://help.ubuntu.com/community/UFW
- Docker networking / DOCKER-USER chain documentation: https://docs.docker.com/network/packet-filtering-firewalls/

## Issues Found

1. **Invalid `default ... forward` direction**
   - Original: `sudo ufw default deny forward`
   - The `ufw(8)` man page is explicit that the third direction is `routed`, not `forward`. The shipped command parser rejects `forward`.
   - Fixed to: `sudo ufw default deny routed`

2. **Mismatched status output for the routed/forwarded policy**
   - Original expected output line: `Default: deny (incoming), allow (outgoing), deny (forwarded)`
   - Modern UFW (matching the `routed` argument) prints the third tuple as `(routed)`.
   - Fixed to: `Default: deny (incoming), allow (outgoing), deny (routed)`

3. **Wrong config file for `IPV6=yes`**
   - Original instructed editing `/etc/ufw/ufw.conf` to set `IPV6=yes`.
   - On Ubuntu, `/etc/ufw/ufw.conf` only contains `ENABLED` and `LOGLEVEL`. The `IPV6` toggle lives in `/etc/default/ufw`, as called out in the `ufw(8)` man page ("IPv6 must be enabled in /etc/default/ufw").
   - Fixed the `nano` target to `/etc/default/ufw` while leaving the `IPV6=yes` value unchanged.

## Review Notes
- The simple syntax examples (`ufw allow ssh`, `ufw allow 80/tcp`, `ufw allow from 192.168.1.0/24 to any port 22 proto tcp`), the status / numbered / delete workflows, the `ufw reset` flow, and the `ufw show added` command all match the current `ufw(8)` man page.
- The Docker section is a reasonable summary. Note that the `-A DOCKER-USER -i eth0 ! -s 192.168.1.0/24 -j DROP` snippet assumes the host's public NIC is `eth0` and that the trusted source range is `192.168.1.0/24`; readers must adapt both to their environment. This is a configuration caveat, not a technical error.
- `which ufw` works but Ubuntu 20.04+ recommends `command -v ufw`; either is acceptable for this audience.
- `sudo journalctl -f | grep UFW` works but `sudo journalctl -kf | grep -i ufw` (kernel ring only, case-insensitive) is slightly more targeted; left unchanged because the original is functional.
- The IPv6 caveat in the post ("UFW automatically creates both IPv4 and IPv6 rules") is correct as long as `IPV6=yes` is set before `ufw enable` (or UFW is disabled/re-enabled after the change), which the post's surrounding flow does cover.
