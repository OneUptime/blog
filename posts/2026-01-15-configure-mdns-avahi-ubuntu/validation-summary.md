# Validation Summary: How to Configure mDNS with Avahi on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (hands-on configuration walkthrough)

## Technologies Covered
- mDNS (Multicast DNS) / Zeroconf
- Avahi daemon and utilities (`avahi-daemon`, `avahi-browse`, `avahi-resolve`, `avahi-publish`, `avahi-discover`)
- DNS-SD (DNS Service Discovery)
- `avahi-daemon.conf` configuration
- Avahi static service files (`/etc/avahi/services/*.service`, avahi-service.dtd)
- Avahi D-Bus interface (Python `dbus` + `gi.repository.GLib`)
- NSS / `nsswitch.conf` (`libnss-mdns`)
- systemd unit files and socket activation
- Firewalls: UFW, iptables, nftables
- Cross-platform discovery (Bonjour/AirPlay/AirPrint, Windows mDNS, SMB)

## Sources Consulted
- avahi-daemon(8) man page — https://manpages.debian.org/testing/avahi-daemon/avahi-daemon.8.en.html (confirms `--check` returns 0 if a daemon is already running; it does NOT validate config/service files)
- avahi-daemon.conf(5) man page — https://linux.die.net/man/5/avahi-daemon.conf (verified `[server]`, `[wide-area]`, `[publish]`, `[reflector]`, `[rlimits]` section/option names: `allow-interfaces`, `allow-point-to-point`, `ratelimit-interval-usec`, `ratelimit-burst`, `publish-aaaa-on-ipv4`, `publish-a-on-ipv6`, `reflect-ipv`, etc.)
- Official Avahi Python example `avahi-discover.py` — https://github.com/avahi/avahi/blob/master/avahi-python/avahi-discover/avahi-discover.py (confirms `ResolveService` passes `aprotocol` as `avahi.PROTO_UNSPEC` = `-1`, a signed int, with `dbus.UInt32(0)` only for the `flags` argument)
- Avahi systemd units (`avahi-daemon.socket.in`) — https://github.com/avahi/avahi/blob/master/avahi-daemon/avahi-daemon.socket.in and Arch Wiki Avahi page (confirms Avahi ships `avahi-daemon.socket` and uses socket activation by default when built with systemd support)
- Debian/Ubuntu package index — https://packages.ubuntu.com/python3-avahi (confirms `python3-avahi` exists in the universe repo on 22.04+)

## Issues Found
1. **Python D-Bus bug — `dbus.UInt32(-1)` (Programmatic Discovery section).** The `ResolveService` call wrapped the `aprotocol` argument (`AVAHI_PROTO_UNSPEC`, value `-1`) in `dbus.UInt32`, which cannot hold a negative value and raises at runtime. The official Avahi example passes this argument as the plain signed int `-1`. Changed `dbus.UInt32(-1), dbus.UInt32(0)` to `-1, dbus.UInt32(0)` (kept the correct `dbus.UInt32` wrapper on the `flags` argument) and added a clarifying comment.
2. **`avahi-daemon --check` misdescribed (4 places).** The post described `--check` as validating configuration ("Check for configuration errors"), validating service files ("Check if the service file is valid"), showing the active hostname ("Check the actual name being used"), and as a "Configuration Check" in the diagnostic script. `--check` only returns 0 if an Avahi daemon is already running. Reworded all four comments to describe its actual behavior (and pointed the hostname-conflict case at the daemon logs, which do report the chosen name).
3. **Misleading config-file comments in `avahi-daemon.conf`.** Several comments did not match the option they annotated: `allow-interfaces` was labeled "Allow other applications to register services", `allow-point-to-point` was labeled as collision detection/renaming, the `ratelimit-*` pair was labeled "Publish our host name and address records", and `publish-aaaa-on-ipv4`/`publish-a-on-ipv6` were labeled "Add machine info". Corrected each comment to accurately describe the option (interface restriction, point-to-point interface usage, response rate limiting, cross-family A/AAAA publishing). The option names and values themselves were already valid.
4. **Incorrect `ExecStartPost` note (systemd integration).** The note claimed `ExecStartPost=...avahi-publish...` "runs in background, service will still publish". `avahi-publish` runs in the foreground and never exits, so as an `ExecStartPost` it blocks unit activation; the publication is also tied to that transient process. Corrected the note to state this and to direct readers to the wrapper-script approach shown immediately below.

## Review Notes
- The configuration option names, section headers, service-file XML (including `<subtype>` syntax `_myapp._sub._myapp-api._tcp` and `_device-info._tcp` with `port=0`), multicast addresses (`224.0.0.251:5353`, `ff02::fb`), `nsswitch.conf` lines, and the `avahi-browse`/`avahi-resolve`/`avahi-publish` flags were all verified correct.
- The "Avahi Socket Activation" section is accurate: Avahi ships `avahi-daemon.socket` and enables socket activation by default on systemd builds (as on Ubuntu).
- `python3-avahi` is in the Ubuntu *universe* repository (22.04+); the post's Python example does not actually import it (it uses `dbus` + `gi`), so the optional install is harmless but not strictly required for the provided script.
- The Python D-Bus example targets Python 3 / `python3-dbus` + `python3-gi`, which is current; the older `python-avahi` (Python 2) bindings are not used.
- No version-specific information was found to be outdated as of the validation date.
