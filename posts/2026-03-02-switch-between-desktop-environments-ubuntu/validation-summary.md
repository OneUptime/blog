# Validation Summary: How to Switch Between Desktop Environments on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt package management)
- Desktop Environments: GNOME, KDE Plasma, XFCE, LXDE, LXQt, MATE, Cinnamon
- Display Managers: GDM3, SDDM, LightDM
- Session protocols: X11 (Xorg), Wayland
- XDG (xdg-mime, XDG_CURRENT_DESKTOP, XDG_SESSION_TYPE, autostart spec)
- systemd / systemctl / loginctl
- Xvfb (virtual framebuffer)

## Sources Consulted
- Ubuntu package archive (packages.ubuntu.com) for metapackage names: `kubuntu-desktop`, `xubuntu-desktop`, `kde-plasma-desktop`, `ubuntu-mate-desktop`, `mate-desktop-environment`, `cinnamon-desktop-environment`, `lxde`, `lxqt`, `xfce4`, `xfce4-goodies`
- freedesktop.org Desktop Entry Specification and Autostart Specification
- freedesktop.org XDG Base Directory Specification
- Debian/Ubuntu LightDM documentation for `/etc/lightdm/lightdm.conf.d/` and `~/.dmrc`
- systemd documentation for `loginctl` and `systemctl status display-manager`
- Xorg / Xvfb manual pages for `Xvfb :N -screen 0 WIDTHxHEIGHTxDEPTH`
- GNOME / KDE / XFCE documentation for session names (`gnome`, `plasma`, `xfce`, `mate`)
- xdg-utils documentation for `xdg-mime default` / `xdg-mime query default`

## Issues Found
No technical issues found. All package names, file paths, commands, configuration formats, and environment variables are correct. The instructions for switching sessions in GDM3 / SDDM / LightDM are accurate. The heredoc `tee` usage, Xvfb invocation, and `loginctl` query are syntactically valid.

## Review Notes
- The `~/.dmrc` mechanism is fully respected by LightDM but is largely legacy for modern GDM3 (which stores per-user session preference via AccountsService in `/var/lib/AccountsService/users/<username>`). The post does not claim `.dmrc` is universal, and it remains a documented approach for LightDM, so it is left as-is.
- The "How Desktop Session Switching Works" section mentions `/usr/share/xsessions/` only. Wayland-only sessions live in `/usr/share/wayland-sessions/`. This is a common simplification and not strictly incorrect, but readers using Wayland-first DEs may want to check both directories.
- Memory figures (GNOME 44 ~800MB, KDE Plasma 5.27 ~600MB, etc.) reference older versions; current GNOME 47+/Plasma 6.x have somewhat different footprints, but the numbers are presented as approximations and remain in the right order of magnitude.
- The `lxde` metapackage still exists in Ubuntu repositories, although the LXDE project itself has largely migrated to LXQt.
- The section title "Using tmux or Screen for Remote Sessions" does not match its content (which covers Xvfb and DISPLAY assignment, not tmux/screen). This is a stylistic/structural mismatch rather than a technical error, so per the review guidelines it was not modified. A future edit could rename the section to something like "Headless and Virtual Graphical Sessions".
- The `loginctl | grep $(whoami) | awk '{print $1}'` pattern works in practice but can match unintended rows; `loginctl list-sessions --no-legend | awk -v u="$USER" '$3==u {print $1}'` would be more robust.
