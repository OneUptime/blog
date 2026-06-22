# Validation Summary: How to Set Up a VNC Server for Remote Desktop on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 20.04, 22.04, and 24.04
- TigerVNC
- VNC/RFB remote desktop
- XFCE, GNOME, and MATE desktop environments
- systemd service units
- SSH local port forwarding
- UFW firewall rules
- Remmina and VNC viewers
- x11vnc

## Sources Consulted
- Ubuntu 24.04 TigerVNC server manpage: https://manpages.ubuntu.com/manpages/noble/man1/tigervncserver.1.html
- Ubuntu 22.04 TigerVNC server manpage: https://manpages.ubuntu.com/manpages/jammy/man1/tigervncserver.1.html
- Ubuntu 20.04 TigerVNC server manpage: https://manpages.ubuntu.com/manpages/focal/man1/tigervncserver.1.html
- TigerVNC Xvnc documentation: https://tigervnc.org/doc/Xvnc.html
- systemd.unit official documentation: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- GNOME Vino archive page: https://wiki.gnome.org/Projects%282f%29Vino.html
- GNOME Remote Desktop project documentation: https://gitlab.gnome.org/GNOME/gnome-remote-desktop
- Ubuntu UFW community documentation: https://help.ubuntu.com/community/UFW
- x11vnc manpage reference: https://linux.die.net/man/1/x11vnc

## Issues Found
- The systemd template used `%i` as both the username and the VNC display. With the documented `vncserver@myuser:1` instance, systemd would expand `User=%i`, `Group=%i`, and `WorkingDirectory=/home/%i` to invalid values such as `myuser:1`, and the VNC command would receive an invalid display. I changed the service example so the user substitutes a real `username` in `User`, `Group`, and `WorkingDirectory`, while `%i` represents only the display instance such as `:1`. I also updated the enable/start/status commands to use `vncserver@:1`.
- The VNC server options table described Vino as "GNOME built-in (desktop sharing)." GNOME now documents Vino as archived and unmaintained, with GNOME Remote Desktop as the replacement. I changed the table entry to describe Vino as legacy GNOME desktop sharing that is deprecated on newer Ubuntu releases.

## Review Notes
The TigerVNC commands and options used in the post, including `-localhost`, `-geometry`, `-depth`, `-alwaysshared`, `-dpi`, `-list`, `-kill`, and `-version`, match the Ubuntu TigerVNC manpages for the covered Ubuntu releases. Ubuntu 22.04 and 24.04 prefer `~/.vnc/Xtigervnc-session` but still support `~/.vnc/xstartup` for compatibility, so the post's xstartup examples remain valid. The GNOME VNC experience is more version-sensitive than XFCE, especially on newer Ubuntu/GNOME releases, but the article correctly recommends XFCE for VNC.
