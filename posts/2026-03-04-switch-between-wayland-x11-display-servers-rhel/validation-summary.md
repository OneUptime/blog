# Validation Summary: How to Switch Between Wayland and X11 Display Servers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- GNOME Shell
- GDM
- Wayland
- X11 / X.Org
- XWayland
- NVIDIA Linux graphics drivers
- systemd loginctl and systemctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with the GNOME desktop environment": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/getting_started_with_the_gnome_desktop_environment/getting_started_with_the_gnome_desktop_environment
- Red Hat Enterprise Linux 8 documentation, "Using the desktop environment in RHEL 8": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/using_the_desktop_environment_in_rhel_8/gsettings-schemas-and-keys_configuring-gnome-at-low-level
- Red Hat Enterprise Linux 10 release notes, "Removed features": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/10.0_release_notes/removed-features
- Red Hat Enterprise Linux 10 documentation, "Using the GNOME desktop environment": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/pdf/using_the_gnome_desktop_environment/configuring-applications-to-start-automatically-on-login
- Wayland documentation, "X11 Application Support": https://wayland.freedesktop.org/docs/book/Xwayland.html
- NVIDIA Linux driver README, "GBM and GBM-based Wayland Compositors": https://download.nvidia.com/XFree86/Linux-x86_64/515.43.04/README/gbm.html
- Local `loginctl --help` and `systemctl --help` output for command syntax.

## Issues Found
- The post applied the X11 session-switching workflow to RHEL generally. This is no longer accurate for all current RHEL releases because RHEL 10 removed the X.Org server. I scoped the title, description, and introduction to RHEL 8 and 9 and added a note that RHEL 10 still supports many X11 applications through XWayland.
- The `loginctl` example used `loginctl | grep $(whoami) | awk '{print $1}'`, which can select the wrong session if a user has multiple sessions. I replaced it with `loginctl show-session "$XDG_SESSION_ID" -p Type --value`.
- The login-screen section described the selection as "per session", but Red Hat documents the GNOME environment and display protocol choice as persistent across logouts and reboots. I removed the "per session" wording.
- The GDM configuration steps used `systemctl restart gdm`. Red Hat's RHEL 9 documentation instructs users to reboot after changing `WaylandEnable=false`, so I changed the examples to `sudo systemctl reboot`.
- The Wayland re-enable snippet showed `WaylandEnable=true`. Red Hat documents enabling Wayland by ensuring `WaylandEnable=false` is absent or commented out, so I changed the snippet to comment out `#WaylandEnable=false`.
- The NVIDIA section suggested overriding GDM's packaged udev rule to force Wayland. Red Hat documents `/usr/lib/udev/rules.d/61-gdm.rules` as the list of environments where Wayland is unavailable, and RHEL 8 documentation says proprietary NVIDIA drivers are not supported with GNOME Shell on Wayland. I replaced the override instruction with guidance to check Red Hat support guidance and use GNOME on Xorg when proprietary NVIDIA drivers prevent Wayland.
- The closing sentence said both display servers are fully supported on RHEL, which was too broad for current RHEL releases. I changed it to state that RHEL 8 and 9 provide this display-server choice.

## Review Notes
The remaining commands and configuration examples are technically valid for RHEL 8 and 9 GNOME systems. On RHEL 10, users should rely on Wayland plus XWayland for X11 application compatibility rather than trying to select a GNOME X11 session.
