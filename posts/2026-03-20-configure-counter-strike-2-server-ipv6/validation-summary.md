# Validation Summary: How to Configure Counter-Strike 2 Server with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Counter-Strike 2 dedicated server
- SteamCMD
- Linux systemd
- IPv6
- ip6tables
- DNS AAAA records
- Steam Game Server Login Token (GSLT)
- nmap

## Sources Consulted
- Valve Developer Community: Counter-Strike 2 - Dedicated Servers — https://developer.valvesoftware.com/wiki/Counter-Strike_2/Dedicated_Servers
- Valve Developer Community: SteamCMD — https://developer.valvesoftware.com/wiki/SteamCMD
- Valve Developer Community: Source RCON Protocol — https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
- Valve Developer Community: Source Dedicated Server — https://developer.valvesoftware.com/wiki/Source_Dedicated_Server
- Valve Developer Community: Source Multiplayer Networking — https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- Steam Community: Steam Game Server Account Management — https://steamcommunity.com/dev/managegameservers
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html
- Supplementary operational references for current CS2 Steam-auth log text: https://legionhosting.net/kb/counter-strike-2/counter-strike-2-server-setup-guide?language=english and https://legionhosting.net/kb/counter-strike-2/cs2-server-troubleshooting-common-issues-fixes

## Issues Found
- The launch examples used `+ip` and `+port`, but Valve documents `-ip` and `-port` as CS2 dedicated-server command-line parameters. I corrected those flags.
- The Linux startup examples called `game/bin/linuxsteamrt64/cs2` directly. Valve's current CS2 dedicated-server guidance recommends using `game/cs2.sh` on Linux, so I updated the commands and the `systemd` unit accordingly.
- The Ubuntu/Debian `steamcmd` package install example was incomplete. Valve's SteamCMD docs require enabling the proper repository and `i386` architecture first, so I added those steps. I also changed the manual install path from `/opt/steamcmd` to `~/steamcmd` to avoid an unnecessary root-owned location in the example.
- The `server.cfg` snippet set `sv_maxrate` twice with conflicting values. I removed the earlier duplicate and renamed the comment block from `Tick rate` to `Rate settings`, since those cvars do not change CS2's hardcoded 64-tick sub-tick server behavior.
- The public `systemd` example omitted `+sv_setsteamaccount`, even though Valve requires a GSLT for public internet players to join. I added the token parameter to the service example and the specific-IP launch example.
- The firewall section had multiple problems: it opened TCP 27015 globally and then tried to restrict RCON on the same port, which made the restriction ineffective; it treated Steam master-server traffic as an inbound UDP 27005 rule; and it used `sudo ip6tables-save > ...`, where shell redirection would bypass `sudo`. I corrected the rules and changed the save command to use `tee`.
- The IPv6 examples used invalid literals such as `2001:db8::admin` and `2001:db8::cs2`. I replaced them with valid documentation addresses from `2001:db8::/32` per RFC 3849.
- The closing sentence referred to `+ip`, which is not the documented CS2 binding flag. I corrected it to `-ip` and softened the wording so it matches what Valve currently documents.
- The token-verification grep used a log phrase that could not be substantiated from current CS2 operational examples. I updated it to a current Steam-auth success log line.

## Review Notes
- Valve's CS2 dedicated-server page is still marked as incomplete, so some details had to be cross-checked against related Valve documentation for SteamCMD, Source networking, and Source RCON, plus current operational CS2 server references where Valve does not document exact log text.
- CS2's IPv6-specific dedicated-server behavior remains under-documented officially. The post is now technically consistent, but it should be revalidated if Valve publishes fuller dedicated-server networking guidance or changes the Linux launch workflow.
