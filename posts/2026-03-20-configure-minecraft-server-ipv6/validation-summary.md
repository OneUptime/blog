# Validation Summary: How to Configure Minecraft Server with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Minecraft Java Edition server (vanilla)
- Paper / Spigot Minecraft server
- IPv6 networking
- OpenJDK 21
- systemd
- ip6tables / iptables-persistent
- DNS (AAAA and SRV records)
- RCON (Remote Console)
- mcstatus (Python)
- netcat (`nc`)
- dig (DNS lookup)

## Sources Consulted
- Minecraft Wiki — server.properties: https://minecraft.wiki/w/Server.properties
- Mojang server downloads: https://www.minecraft.net/en-us/download/server
- PaperMC documentation: https://docs.papermc.io/
- PaperMC API v2: https://api.papermc.io/v2/
- RFC 4291 — IP Version 6 Addressing Architecture (valid hex digit set for IPv6)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (the `2001:db8::/32` block)
- iptables-persistent (Debian/Ubuntu) — saves rules to `/etc/iptables/rules.v6`
- systemd.service / systemd.unit man pages (`network-online.target`, `Type=simple`)
- Java networking (Netty wildcard `::` dual-stack binding behavior)
- mcstatus tool: https://github.com/py-mine/mcstatus
- Minecraft Java Edition uses TCP port 25565; Bedrock Edition uses UDP 19132

## Issues Found

1. **Invalid IPv6 address `2001:db8::minecraft`** — IPv6 addresses are restricted to hexadecimal digits (`0`-`9`, `a`-`f`) per RFC 4291. The literal `minecraft` contains characters (`i`, `n`, `r`, `t`) outside that set, so the address would not parse. Commands such as `nc -6 -w 3 2001:db8::minecraft 25565` and `mcstatus "[2001:db8::minecraft]:25565" status`, and the example AAAA DNS record, would all fail. Replaced every occurrence with the valid documentation address `2001:db8::1` (still inside RFC 3849's documentation prefix).

2. **Incorrect ip6tables-save destination path** — The post saved rules to `/etc/ip6tables/rules.v6`, but the standard path used by the `iptables-persistent` / `netfilter-persistent` package on Debian/Ubuntu is `/etc/iptables/rules.v6` (the directory is `iptables`, not `ip6tables`, even for the IPv6 ruleset). Updated the redirect path so the saved file matches what `netfilter-persistent` reloads on boot.

## Review Notes
- Setting `server-ip=::` works for dual-stack listening on Linux when `IPV6_V6ONLY` is off (the JVM/Netty default), which is the typical case. Leaving `server-ip` blank is the more conventional Minecraft recommendation, but `::` is functionally equivalent on dual-stack hosts and is appropriate given the post's IPv6-focused framing.
- Minecraft Java Edition uses TCP only on port 25565; the extra `udp --dport 25565` rule is harmless but unnecessary. Left as-is since it does not break anything.
- The Mojang server JAR URL host `launcher.mojang.com` is the legacy host; newer downloads are served from `piston-data.mojang.com`. Both still resolve, and the `HASH` placeholder makes the URL clearly templated, so no change was made.
- `simulation-distance=8` is a valid value; the documented vanilla default is `10`. Both are reasonable configuration choices for a tutorial.
- The PaperMC API v2 endpoint shown still functions, though Paper has been migrating users toward API v3. The `LATEST` tokens in the URL are placeholders and require substitution with concrete version/build numbers in practice — kept as illustrative.
- The systemd unit's `ExecStop` references `/opt/minecraft/rcon-cli.jar`, which is not downloaded in the prerequisites. Users will need to obtain an RCON CLI tool (e.g., `mcrcon` or `rcon-cli`) separately. This is a presentation gap rather than a technical inaccuracy, so no edit was made.
