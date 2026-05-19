# Validation Summary: How to Set Up a Tor Relay on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Tor (The Onion Router) relay software
- Ubuntu 22.04+ server
- The Tor Project's APT repository (deb.torproject.org)
- `torrc` configuration directives (Nickname, ContactInfo, ORPort, ExitRelay, RelayBandwidthRate/Burst, DirPort, Log, AccountingMax/Start, ControlSocket, CookieAuthentication, ConnLimit)
- UFW (Uncomplicated Firewall)
- systemd (`systemctl` service management)
- `nyx` (Tor relay monitoring TUI)
- `unattended-upgrades`
- Linux networking utilities (`ss`, `nc`)

## Sources Consulted
- Tor Project APT repository documentation: https://support.torproject.org/apt/tor-deb-repo/
- Tor manual (torrc(5)): https://2019.www.torproject.org/docs/tor-manual.html.en
- Tor Project relay operator guide: https://community.torproject.org/relay/
- Nyx project documentation: https://nyx.torproject.org/
- ArchWiki Tor article: https://wiki.archlinux.org/title/Tor
- Tor Metrics: https://metrics.torproject.org/rs.html
- UFW manual / Ubuntu docs (for `comment` flag and `allow` syntax)

## Issues Found

1. **Invalid `MaxOpenFiles` directive.** The troubleshooting section under "High CPU Usage" suggested adding `MaxOpenFiles 8192` to `torrc`. This is not a valid Tor configuration option. The correct directive is `ConnLimit`, which sets the minimum number of file descriptors Tor requires. Updated the suggested directive to `ConnLimit 8192` and reworded the surrounding comment ("Raise the file descriptor limit if needed") to match.

2. **Broken accounting status command.** The post originally ran `sudo -u debian-tor tor --verify-config` (which only validates the config syntax, not accounting status) followed by `echo "getinfo accounting/bytes" | sudo nc -q 1 /var/run/tor/control`. This second command has two problems: (a) OpenBSD netcat (Ubuntu default) requires `-U` to connect to a Unix socket path, not a positional argument; (b) with `CookieAuthentication 1` enabled, the control port requires an `AUTHENTICATE` command with the cookie before any `GETINFO` will succeed, so the one-liner could never have worked. Replaced with simpler, reliable alternatives: grepping the Tor notices log for accounting lines, or using `nyx` (already configured earlier in the post) for live status.

3. **Insufficient ControlSocket permissions for nyx.** The Monitoring section configured `ControlSocket /var/run/tor/control` and `CookieAuthentication 1` and then expected a non-root user (added to the `debian-tor` group) to be able to connect via `nyx`. Without `ControlSocketsGroupWritable 1` the socket is not accessible to group members, and without `CookieAuthFileGroupReadable 1` the cookie file cannot be read by group members, so cookie authentication would fail. Added both directives to the configuration steps so the documented flow actually works.

## Review Notes

- The Tor Project signing key fingerprint (`A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89`) and the key URL match the official Tor Project APT documentation.
- The Tor repo's per-codename channels (`focal`, `jammy`, `noble`, etc.) are supported, so `$(lsb_release -cs)` will work for current Ubuntu LTS releases.
- The example bandwidth values (`RelayBandwidthRate 10 MB`, `RelayBandwidthBurst 20 MB`) parse to bytes per second (i.e. ~80 Mbps sustained, ~160 Mbps burst), which is well above the stated 10 Mbps prerequisite. The syntax is valid, but operators following the prerequisite numbers literally will likely want to lower these values. Not a technical error — left as written, since the author may intend the values as headroom.
- The post says "about an hour for the relay to appear in the network consensus" in one section and "3-4 hours" in the troubleshooting section. Both are within the range commonly observed in practice (the consensus is generated hourly, and a new relay typically takes a few hours to be voted in by enough authorities), so the wording is acceptable but slightly inconsistent.
- `ExitRelay 0` is the default; setting it explicitly is harmless and a useful safety affirmation for a middle-relay tutorial.
- The fingerprint path (`/var/lib/tor/fingerprint`), log path (`/var/log/tor/notices.log`), and `nyx` package name are all correct for the Debian/Ubuntu Tor package.
