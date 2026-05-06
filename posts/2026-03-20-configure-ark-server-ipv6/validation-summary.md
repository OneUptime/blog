# Validation Summary: How to Configure ARK Server with IPv6

## Status
validated

## Post Type
Tutorial / Linux game server guide

## Technologies Covered
- ARK: Survival Evolved dedicated server
- Linux
- systemd
- SteamCMD
- `GameUserSettings.ini`
- `ip6tables`
- `ss`
- `nmap`

## Sources Consulted
- ARK Official Community Wiki, dedicated server setup: https://ark.wiki.gg/wiki/Dedicated_server_setup
- ARK Official Community Wiki, server configuration: https://ark.wiki.gg/wiki/Server_configuration
- Valve Developer Community, SteamCMD: https://developer.valvesoftware.com/wiki/SteamCMD?pubDate=20250422
- Valve Developer Community, Dedicated Servers List: https://developer.valvesoftware.com/wiki/Dedicated_Servers_List
- `systemd.service(5)` manual page: https://www.man7.org/linux/man-pages/man5/systemd.service.5.html
- `systemd.syntax(7)` manual page: https://www.freedesktop.org/software/systemd/man/251/systemd.syntax.html
- `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- `ip6tables(8)` manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html
- Nmap IPv6 scanning reference: https://nmap.org/book/port-scanning-ipv6.html

## Issues Found
- The introduction implied the same Linux workflow applied to ARK: Survival Ascended and stated IPv6 player connectivity as a documented ARK server feature. I corrected this to ARK: Survival Evolved on Linux only and reframed IPv6 as a dual-stack host and firewall concern, because the official ARK Linux docs cover the standard service ports but do not document a separate IPv6-specific bind option.
- The `GameUserSettings.ini` example put `MaxPlayers` in the wrong section and omitted the settings needed to actually enable RCON. I moved `MaxPlayers` to `[/Script/Engine.GameSession]` and added `RCONEnabled=True` plus `RCONPort=27020` under `[ServerSettings]`.
- The startup script and `systemd` `ExecStart=` example split `?` URL parameters across separate arguments and used `-server`, which the ARK server configuration reference says is ignored when launching `ShooterGameServer` directly. I rewrote both to pass a single ARK URL argument and removed the unsupported or unnecessary flags.
- The `systemd` unit used `/home/ark/arkserver` as the working directory even though the official Linux examples run from `ShooterGame/Binaries/Linux`. I updated the working directory and kept the SteamCMD pre-update step valid.
- The firewall section missed ARK's peer port `7778/udp`, which the official network table lists alongside the game and query ports. I added that port and replaced the distro-specific persistence command with a generic persistence note.
- The verification section used `ss -6 -ulnp`, which would miss the TCP RCON listener and any listener not exposed as IPv6-only, and the sample `nmap` target `2001:db8::ark` was not a valid IPv6 literal. I replaced those examples with checks that match the documented ARK ports and a valid example IPv6 address.
- The description line overstated what the post could promise about IPv6 connectivity. I updated it so it describes Linux server setup plus IPv6-capable host firewall rules without claiming an ARK-specific IPv6 feature that the official docs do not document.

## Review Notes
The corrected post is now technically aligned with the official ARK Linux server setup and port documentation, but ARK's published guidance remains centered on the standard game, peer, query, and RCON ports rather than a dedicated IPv6 configuration path. `nmap` command syntax was checked against official Nmap documentation; the binary was not installed in the local review environment.
