# Validation Summary: How to Configure Smart Home Devices with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- IPv6 (link-local, mesh-local, ULA, GUA addressing)
- Home Assistant (`http` integration, `configuration.yaml`)
- Matter protocol
- Thread protocol / OpenThread / ot-br-posix Border Router
- Zigbee IP / Zigbee2MQTT / ZHA
- Mosquitto MQTT broker
- Netplan (Ubuntu network configuration)
- ISC Kea DHCPv6 (reservation by DUID)
- ip6tables firewall rules
- mDNS/Bonjour service discovery

## Sources Consulted
- Home Assistant `http` integration docs — https://www.home-assistant.io/integrations/http/#server_host
- Home Assistant `network` integration docs — https://www.home-assistant.io/integrations/network/
- OpenThread IPv6 addressing primer — https://openthread.io/guides/thread-primer/ipv6-addressing
- OpenThread Border Router build guide — https://openthread.io/guides/border-router/build
- Mosquitto configuration man page — https://mosquitto.org/man/mosquitto-conf-5.html
- Zigbee Alliance / Zigbee IP specification (historical reference)
- Netplan reference — https://netplan.readthedocs.io/
- Kea DHCPv6 reservation docs — https://kea.readthedocs.io/

## Issues Found
1. **"Zigbee over IP (ZBIP)"** — The acronym "ZBIP" is not standard. The correct name is **Zigbee IP (ZIP)**, ratified by the Zigbee Alliance in 2013, built on IPv6/6LoWPAN. It has largely been superseded by Thread for smart-home use. Updated the bullet to use the correct name and noted the practical status.
2. **Bogus `network: ipv6: true` Home Assistant option** — This is not a documented option in `configuration.yaml`. The Network integration is configured via the UI (Settings → System → Network) and does not expose an `ipv6` boolean flag. Removed the invalid YAML block; the `http.server_host` setting alone is sufficient to enable IPv6 listening.
3. **Thread DHCP claim** — The original wording said Thread devices "get addresses via Thread's own DHCP/NDP". Thread does **not** use DHCP for device addressing. Each device derives a link-local (`fe80::/64`) and mesh-local (`fd00::/8`-derived) address; the Border Router advertises any globally routable prefixes via SLAAC/ND on the adjacent infrastructure link. Rewrote the bullet to describe the actual addressing mechanism.
4. **`sudo apt install ot-br-posix`** — There is no `ot-br-posix` package in the Debian/Ubuntu apt repositories. OTBR must be built from source (or run via Docker). Replaced the apt command with the official `git clone` + `script/bootstrap` + `script/setup` flow from the OpenThread docs.

## Review Notes
- The `http.server_host` accepting `["0.0.0.0", "::"]` is valid per the Home Assistant docs (server_host default is already `0.0.0.0, ::`, so the snippet is essentially making the default explicit — works as advertised).
- Mosquitto's `socket_domain ipv6` directive binds an `AF_INET6` socket; on Linux with the default `net.ipv6.bindv6only=0`, the listener will accept IPv4 connections via IPv4-mapped IPv6 addresses. The comment in the post is correct for typical Linux defaults; left as-is.
- The Netplan, Kea DHCPv6, and ip6tables snippets are syntactically correct. Note: the `-i wan` interface name in the ip6tables rule is only valid where the WAN interface is literally named `wan` (e.g., OpenWrt); on stock Debian/Ubuntu it would typically be `eth0`/`enpXsY`/`ppp0`. Left as-is since the surrounding context is consumer-router/firewall oriented.
- DUID format in the Kea reservation example is acceptable; Kea accepts colon-separated hex in JSON.
- All example IPv6 addresses use the `2001:db8::/32` documentation prefix (RFC 3849) — correct usage.
