# Validation Summary: How to Configure x2go for Remote Desktop on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- X2Go Server and X2Go Client
- XFCE, LXDE, and MATE desktop environments
- OpenSSH
- PulseAudio
- UFW

## Sources Consulted
- X2Go Server installation documentation: https://wiki.x2go.org/doku.php/doc:installation:x2goserver
- X2Go Client installation documentation: https://wiki.x2go.org/doku.php/doc:installation:x2goclient
- X2Go Desktop Sharing usage documentation: https://wiki.x2go.org/doku.php/doc:usage:desktop-sharing
- X2Go Client file sharing documentation: https://wiki.x2go.org/doku.php/doc:howto:x2goclient-file-sharing
- X2Go desktop environment compatibility documentation: https://wiki.x2go.org/doku.php/doc:de-compat
- Ubuntu x2goserver package metadata and packaged `x2goserver.conf(5)`, `x2gostartagent(8)`, `x2golistsessions(8)`, and `x2goterminate-session(8)` documentation
- Ubuntu package metadata for `x2goclient`, `x2goserver-desktopsharing`, and `x2godesktopsharing`
- OpenSSH `sshd_config(5)` documentation for `AllowTcpForwarding` and `AllowGroups`: https://man.openbsd.org/sshd_config

## Issues Found
- The original `/etc/x2go/x2goserver.conf` example used unsupported keys and sections such as `[nxserver]`, `nxport`, `[logfile]`, and `AllowedUsers`. Replaced the snippet with documented/package-shipped sections such as `[security]`, `[limit groups]`, `[x2goagent]`, and `[log]`.
- The SSH section stated that x2go requires `X11Forwarding yes`. x2go uses SSH login and tunnels, but it does not require OpenSSH X11 forwarding in the way ordinary `ssh -X` sessions do. Changed the guidance to focus on `AllowTcpForwarding`.
- The macOS client section omitted XQuartz, which X2Go Client for macOS requires. Added the XQuartz installation step.
- The user session startup example used `~/.x2gosession`, which is not the file read by `x2goserver-xsession`. Changed it to `~/.xsession-x2go` and used `exec xfce4-session`.
- The shared folder location was inaccurate. Updated it to the documented `~/media/disk/` mount location.
- The persistent virtual desktop section implied that starting `Xvfb` and `startxfce4` would make a display directly shadowable by x2go. Replaced it with the supported X2Go desktop sharing workflow using `x2goserver-desktopsharing` and `x2godesktopsharing`.
- The NX cache tuning section used an unsupported `[nxproxy] cacheSize` setting in `x2goserver.conf`. Replaced it with client-side compression tuning guidance.
- The access restriction section used unsupported `AllowedUsers` syntax in `x2goserver.conf`. Replaced it with OpenSSH `AllowGroups`, since X2Go authentication is through SSH.
- Troubleshooting commands referenced `startxfce4` and `/var/log/x2goserver.log`. Updated the XFCE check to match the command target used by x2go (`xfce4-session`) and changed log guidance to use `journalctl` syslog identifiers.

## Review Notes
The main installation commands and package names for Ubuntu are valid. X2Go documentation is uneven and some upstream wiki pages are old, so the review also checked current Ubuntu package metadata and packaged manpages for the configuration keys and command behavior.
