# Validation Summary: How to Configure VNC Server for Remote Access on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- TigerVNC
- x11vnc
- SSH tunneling with OpenSSH
- systemd user and system services
- UFW firewall rules
- XFCE and MATE desktop environments

## Sources Consulted
- TigerVNC `tigervncserver` Ubuntu man page: https://manpages.ubuntu.com/manpages/jammy/man1/tigervncserver.1.html
- TigerVNC `Xtigervnc` Ubuntu man page: https://manpages.ubuntu.com/manpages/stonking/man1/Xtigervnc.1.html
- TigerVNC `xtigervncviewer` Ubuntu man page: https://manpages.ubuntu.com/manpages/noble/man1/xtigervncviewer.1.html
- TigerVNC upstream `vncviewer` documentation: https://tigervnc.org/doc/vncviewer.html
- x11vnc Ubuntu man page: https://manpages.ubuntu.com/manpages/stonking/man1/x11vnc.1.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- OpenSSH manual pages: https://www.openssh.com/manual.html
- Ubuntu package metadata checked locally with `apt-cache policy` and `apt-cache depends` on Ubuntu 24.04.

## Issues Found
- The introduction said VNC "mirrors the full desktop", which is not accurate for TigerVNC standalone virtual desktops. Changed it to say VNC "provides or shares" a desktop.
- The VNC server list referred to Vino as GNOME's built-in VNC server. Updated this to GNOME Remote Desktop, which is the current built-in GNOME remote desktop service on modern Ubuntu releases.
- The XFCE startup script used `dbus-launch`, but the install command did not include the package that provides it. Added `dbus-x11` to the XFCE install command.
- The TigerVNC command `vncserver -killall` is not a documented TigerVNC option. Replaced it with `vncserver -kill :*`, which is documented for killing all matching sessions.
- The systemd user service included `User=%u`, but `User=` is not supported in per-user systemd service manager instances. Removed that directive.
- The x11vnc password was stored under `/etc` without `sudo`, which would usually fail. Changed the command to `sudo x11vnc -storepasswd /etc/x11vnc.pass`.
- The x11vnc example stored a password file but then used `-passwd yourpassword` instead of the stored file. Changed the example to use `-rfbauth /etc/x11vnc.pass`.
- The x11vnc systemd service hardcoded `/run/user/1000/gdm/Xauthority`, which is user- and display-manager-specific. Changed it to `-auth guess`, matching x11vnc's documented authentication discovery.
- The TigerVNC viewer examples used `host:5901` for a raw port. Updated them to `host::5901`, matching the documented TigerVNC viewer syntax for explicit ports.
- The performance tuning server command used inline comments after shell line-continuation backslashes, which breaks shell syntax. Moved the comments above the command.
- The performance tuning server command passed `-CompressLevel` and `-QualityLevel` to `vncserver`; those are TigerVNC viewer options, not standalone server startup options. Moved them to the `vncviewer` command.

## Review Notes
x11vnc is for X11 displays; on Ubuntu GNOME systems running Wayland, users may need an Xorg session or should use GNOME Remote Desktop/RDP instead. The post mentions x11vnc as sharing an X display and recommends GNOME Remote Desktop as an alternative, so no broader restructuring was needed.
