# Validation Summary: How to Configure Touchpad Gestures on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- GNOME Shell
- Wayland and Xorg
- libinput
- libinput-gestures
- Touchégg and Touché
- gsettings / GNOME settings
- systemd

## Sources Consulted
- Ubuntu Desktop Help: Use gestures on touchpads and touchscreens - https://help.ubuntu.com/stable/ubuntu-help/touchscreen-gestures.html
- Ubuntu Desktop Help: Click, drag, or scroll with the touchpad - https://help.ubuntu.com/stable/ubuntu-help/mouse-touchpad-click.html
- libinput Gestures documentation - https://wayland.freedesktop.org/libinput/doc/1.25.0/gestures.html
- libinput-gestures README - https://github.com/bulletmark/libinput-gestures
- Touchégg README - https://github.com/JoseExposito/touchegg
- Touché Flathub listing - https://flathub.org/apps/com.github.joseexposito.touche
- Ubuntu package metadata for touchegg and local apt package metadata for Ubuntu 24.04
- Local GNOME gsettings schemas for `org.gnome.desktop.peripherals.touchpad` and `org.gnome.mutter`

## Issues Found
- The post claimed Ubuntu 22.04+ built-in GNOME gestures work on Wayland and X11. GNOME's native system gestures are available on Wayland; GNOME on Xorg does not provide the same built-in gestures. Updated the wording.
- The default gesture table listed four-finger application switching and overview pinch behavior that are not documented Ubuntu/GNOME defaults for Ubuntu 22.04+. Replaced them with documented three-finger workspace/overview gestures and two-finger pinch/stretch in supported applications.
- The touchpad settings section referred to scrolling speed in the GNOME Mouse & Touchpad UI. Updated this to pointer speed.
- The `libinput-gestures` install instructions said Ubuntu 22.04+ can install it with apt and used `sudo make install`. The package is not in Ubuntu's standard repositories, and the upstream install command is `sudo ./libinput-gestures-setup install`. Updated the install flow.
- The libinput-gestures configuration instructions created a user config from scratch. Upstream recommends copying `/etc/libinput-gestures.conf` to `~/.config/libinput-gestures.conf` before editing. Updated the commands.
- The libinput-gestures example used bare `xdotool` commands and did not mention Wayland limitations. Upstream notes that configured commands are not run through a shell and that many `xdotool` shortcuts only work for Xorg/XWayland applications on GNOME Wayland. Updated commands to use `/usr/bin/xdotool`, labeled the example for X11 sessions, and added a Wayland caveat.
- The Touché install command used `sudo apt install touche`, but Touché is distributed via Flathub. Replaced it with the Flathub install command.
- The Touchégg manual configuration section did not copy the default XML config first. Added the upstream-recommended copy command.
- The workspace direction section incorrectly used `org.gnome.shell.overrides workspaces-only-on-primary` and implied that setting changes workspace orientation. Replaced it with the correct `org.gnome.mutter workspaces-only-on-primary` setting and described it as a multiple-monitor workspace setting.
- The libinput-gestures troubleshooting log command used a system journal unit. Updated it to the user journal form for the systemd user service case.

## Review Notes
The guide remains version-sensitive because GNOME gesture behavior has changed across GNOME 40-47 and differs between Wayland and Xorg. The corrected post now states the important session limitations instead of presenting all tools as equivalent across both display servers.
