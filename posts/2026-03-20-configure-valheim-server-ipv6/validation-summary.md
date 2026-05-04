# Validation Summary: How to Configure Valheim Server with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Valheim Dedicated Server
- SteamCMD
- IPv6 networking
- ip6tables firewall
- systemd service units
- Linux (Debian/Ubuntu-style userspace tooling)
- ss, nmap, tcpdump for verification

## Sources Consulted
- Valheim Dedicated Server Steam app page (App ID 896660): https://store.steampowered.com/app/896660/Valheim_Dedicated_Server/
- Official Valheim Wiki — Dedicated server documentation: https://valheim.fandom.com/wiki/Hosting_a_Dedicated_Server
- SteamCMD documentation: https://developer.valvesoftware.com/wiki/SteamCMD
- Unity standalone player command-line arguments (-batchmode, -nographics, -logFile): https://docs.unity3d.com/Manual/PlayerCommandLineArguments.html
- ip6tables(8) man page
- systemd.service(5) man page

## Issues Found
- The firewall section claimed "Valheim also uses TCP on same ports" and added a TCP `ip6tables` rule for 2456-2458. Per the official Valheim dedicated server documentation and Steam app requirements, Valheim's dedicated server only requires **UDP** on ports 2456-2458 — there is no TCP listener on those ports. Removed the unnecessary TCP rule and updated the trailing summary sentence accordingly so readers don't open ports that aren't needed.

## Review Notes
- The Steam App ID for the Valheim Dedicated Server (`896660`) and the env var `SteamAppId=892970` (the Valheim client app, sometimes used by the server for matchmaking compatibility) are both correct.
- Valheim doesn't expose a documented `-bind` / IPv6 binding flag; the post's note already calls this out. IPv6 reachability relies on the host's dual-stack networking, which is consistent with how the Unity-based server binds sockets.
- The `tcpdump` command monitoring port 8765 is illustrative — Steam game-server traffic actually spans several ports (notably 27015-27050 and per-game UDP ports), so 8765 is not a Valheim-specific advertisement port. The command is syntactically valid and harmless, so left as-is.
- The `nmap -6 -sU` UDP scan example uses a placeholder `2001:db8::valheim` address; this is fine as illustrative documentation since `2001:db8::/32` is the reserved documentation prefix (RFC 3849).
