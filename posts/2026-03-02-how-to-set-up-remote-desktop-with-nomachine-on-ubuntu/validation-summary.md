# Validation Summary: How to Set Up Remote Desktop with NoMachine on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NoMachine (NX protocol) remote desktop server, version 8.14.x
- Ubuntu (Desktop and Server)
- Xfce / GNOME desktop environments
- systemd (nxserver.service)
- UFW firewall
- SSH tunneling (OpenSSH `-L` port forwarding)

## Sources Consulted
- [NoMachine KB — The server.cfg and node.cfg files explained](https://kb.nomachine.com/AR02N00877)
- [NoMachine KB — How to run a virtual desktop environment on Linux different from the default one](https://kb.nomachine.com/AR04K00667)
- [NoMachine KB — How to terminate or disconnect a virtual session](https://kb.nomachine.com/AR0100585)
- [NoMachine KB — Limits on concurrent virtual desktops and connections](https://kb.nomachine.com/AR08M00858)
- [NoMachine KB — When is the nxnode service disabled on Linux?](https://kb.nomachine.com/AR07Q01037)
- [NoMachine Forum — Systemctl nxserver.service](https://forum.nomachine.com/topic/systemctl-nxserver-service)
- [NoMachine Forum — How do I reduce connection bandwidth requirements for slow channels?](https://forum.nomachine.com/topic/how-do-i-reduce-connection-bandwidth-requirements-for-slow-channels)
- [NoMachine Forum — Generating password for NoMachine (Managing User Access)](https://forum.nomachine.com/topic/generating-password-for-nomachine-managing-user-access)

## Issues Found
1. **`nxserver --changepassword` to change the listening port (Server Configuration section).** The `--changepassword` flag is not a valid `nxserver` option (the correct subcommand for passwords is `--passwd USERNAME`), and changing user passwords has nothing to do with the listening port. Replaced the block with the correct procedure: edit the `NXPort` key in `/usr/NX/etc/server.cfg` and restart with `nxserver --restart`. Also corrected the password command to `--passwd`.

2. **`sudo tee /usr/NX/etc/node.cfg.d/desktop.cfg` drop-in directory.** NoMachine does not ship a `node.cfg.d/` drop-in directory; configuration must be edited in `/usr/NX/etc/node.cfg` directly. Rewrote the snippet to append `DefaultDesktopCommand` to `node.cfg`, and removed the unnecessary `systemctl restart nxserver` (NoMachine applies `DefaultDesktopCommand` changes on the next session — see KB AR04K00667).

3. **Fabricated performance keys `BandwidthThrottling`, `AdaptiveJPEGQuality`, `CacheSize`.** None of these appear in NoMachine's documentation or in `node.cfg`/`server.cfg`. Replaced with real keys (`DisplayServerVideoFrameRate`, `DisplayServerUseVideoFrameRate`, `DisplayServerExtraOptions`) that are documented in the NoMachine knowledge base, plus a pointer to the authoritative reference article.

4. **`MaxSessions` key in `server.cfg`.** This key does not exist. The real keys are `ConnectionsLimit`, `ConnectionsUserLimit`, `VirtualDesktopsLimit`, and `VirtualDesktopsUserLimit` (all defaulting to `0`/unlimited since NoMachine 7.6.2). Updated the section to use those keys.

5. **"The free version allows up to 4 users."** Incorrect. NoMachine Free Edition is for personal use and accepts only **one** remote connection at a time; multiple concurrent users require an Enterprise or Workstation license regardless of what the config keys are set to. Corrected the claim.

6. **`DefaultDisplayGeometry` key.** Not a real NoMachine directive. The documented key is `DisplayGeometry` (used in combination with `CreateDisplay 1`). Fixed the example accordingly.

7. **`systemctl status nxserver nxnode nxd`.** Only `nxserver.service` is a systemd unit; `nxnode` and `nxd` are internal daemons managed by `nxserver` itself. Reduced the command to `systemctl status nxserver` with a comment explaining why, and switched "Restart all NoMachine services" to `nxserver --restart` (which correctly restarts all three daemons, unlike `systemctl restart nxserver` which is known to sometimes leave `nxd` stopped).

8. **Duplicate restart command in Troubleshooting.** A leftover `sudo /usr/NX/bin/nxserver --restart` appeared twice after the fix above; removed the second one and simplified the log-tail command to a single `tail`.

## Review Notes
- The post pins NoMachine 8.14.2; readers should still check the download page for the current `.deb` URL, as the post itself advises.
- The "NX over SSH" connection mode is offered by the NoMachine client UI; the exact label has varied slightly across client versions (`NX` vs `SSH` protocol selector), but the substance of the instructions is accurate.
- The client connection workflow (Add → Protocol → Host → Port → Authentication) is described at a generic level that matches recent NoMachine 7/8 clients; minor UI wording differences across releases are expected and not flagged as errors.
- `/etc/NX/nxserver` and `/usr/NX/bin/nxserver` are equivalent (one is a symlink to the other); the post consistently uses the `/usr/NX/bin/` path, which is fine.
