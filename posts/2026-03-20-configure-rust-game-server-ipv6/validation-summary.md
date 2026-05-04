# Validation Summary: How to Configure Rust Game Server with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (Facepunch Studios game) dedicated server
- SteamCMD (Steam App ID 258550)
- systemd
- ip6tables / iptables-persistent
- ss, nmap, netcat (nc)
- Oxide / uMod plugin framework

## Sources Consulted
- Rust dedicated server documentation on the Facepunch Wiki (https://wiki.facepunch.com/rust/Creating-a-server)
- Steam Developer documentation for SteamCMD and Dedicated Servers (https://developer.valvesoftware.com/wiki/SteamCMD)
- Steam DB entry for Rust Dedicated Server App ID 258550 (https://steamdb.info/app/258550/)
- iptables-persistent / netfilter-persistent Debian package documentation (rules stored at /etc/iptables/rules.v4 and /etc/iptables/rules.v6)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4291 — IP Version 6 Addressing Architecture (hex digit grammar for address literals)
- uMod (Oxide) project site (https://umod.org/games/rust)
- systemd.service(5) man page for unit-file syntax

## Issues Found
- **Invalid IPv6 placeholder addresses** (`2001:db8::admin`, `2001:db8::rust`): These literals are not parseable as IPv6 addresses because `m`, `i`, `n`, `r`, `u`, `s`, `t` are not valid hexadecimal digits per RFC 4291. The commands using them would fail with an address-parsing error rather than working as intended placeholders. Replaced both with `2001:db8::1`, a valid address inside the documentation prefix (RFC 3849).
- **Incorrect iptables persistence path** (`/etc/ip6tables/rules.v6`): The standard Debian/Ubuntu `iptables-persistent` (and `netfilter-persistent`) package stores IPv6 rules at `/etc/iptables/rules.v6`, not `/etc/ip6tables/rules.v6`. Saving to the wrong path would leave rules unloaded on reboot. Corrected to `/etc/iptables/rules.v6`.

## Review Notes
- The `+server.ip "::"` claim binds the server socket to the IPv6 unspecified address, which on Linux (with `IPV6_V6ONLY=0` — the default behavior in most cases) accepts both IPv6 and IPv4-mapped connections. Practical IPv6 client connectivity to Rust dedicated servers historically depended on Steam matchmaking/relay support; players using IPv6-only networks may still need to connect via the `client.connect [::1]:28015` console command rather than the in-game server browser.
- The `echo "status" | nc -6 ...` example will not produce useful output against Rust's RCON endpoint: with `+rcon.web 1`, RCON is a WebSocket connection (requires HTTP upgrade + JSON-formatted frames), and without it the protocol is binary. The line is left in place because it still tests TCP reachability (which is the surrounding section's intent), but readers should use a proper RCON client (e.g., `rcon-cli`, WebRcon) to actually issue commands.
- The `tcp` rule on port 28015 is unnecessary for normal gameplay — Rust game traffic is UDP-only — but it does no harm and is sometimes used by query/relay tooling, so it was left in place.
- The uMod download URL (`https://umod.org/games/rust/download`) currently redirects to the latest build; readers should verify the resulting archive layout has not changed.
