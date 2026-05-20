# Validation Summary: How to Configure Display Resolution and Scaling on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop display settings
- GNOME Displays, Mutter, and GSettings
- X11 RandR / xrandr
- XWayland
- GTK and Qt HiDPI environment variables
- Java 2D HiDPI properties
- KDE Plasma / KScreen
- Firefox, Chromium, Electron, and VS Code application scaling

## Sources Consulted
- Ubuntu Desktop Guide: Change the resolution or orientation of the screen: https://help.ubuntu.com/stable/ubuntu-help/look-resolution.html
- xrandr local manual page and `xrandr --help`
- GNOME GSettings schemas installed locally for `org.gnome.mutter`, `org.gnome.desktop.interface`, and `org.gnome.settings-daemon.plugins.xsettings`
- GTK 3 X11 backend environment variables: https://docs.gtk.org/gtk3/x11.html
- Qt High DPI documentation: https://doc.qt.io/qt-6/highdpi.html
- Oracle Java 2D properties documentation: https://docs.oracle.com/en/java/javase/25/troubleshoot/java-2d-properties.html
- Local `cvt` and `gtf` command output for the custom modeline examples
- KDE libkscreen / kscreen-doctor command examples: https://invent.kde.org/plasma/libkscreen
- Visual Studio Code documentation for runtime arguments (`argv.json`): https://code.visualstudio.com/docs/configure/locales

## Issues Found
- The post said `xrandr` works via XWayland on Wayland. Changed this to clarify that `xrandr` only sees the XWayland screen and cannot configure physical Wayland outputs.
- The X11 fractional scaling section used a GTK integer scaling override as the main fractional scaling command. Added GNOME Mutter's `x11-randr-fractional-scaling` experimental feature and kept the GTK override labeled as integer scaling.
- The `xrandr --scale` examples described the scale direction incorrectly. Reversed the examples and comments so `0.5x0.5` is shown as a smaller virtual framebuffer that makes UI larger, while `2x2` is shown as a larger virtual desktop that makes UI smaller.
- The `gtf 2560 1080 60` sample output did not match the tool output. Updated the modeline values to match the local `gtf` command.
- The Qt examples included `QT_AUTO_SCREEN_SCALE_FACTOR=0`, which is not part of the current Qt 6 High DPI environment variable reference. Removed it and left `QT_SCALE_FACTOR`.
- The VS Code `argv.json` example used `tee -a`, which can create invalid JSON by appending a second object. Replaced it with instructions to edit runtime arguments and add the property.
- The Firefox section suggested `MOZ_USE_XINPUT2=1` as a HiDPI scaling mechanism. Removed it because it does not configure display scaling.
- The persistence examples wrote to `/etc/X11/xorg.conf.d` and `/usr/local/bin` without ensuring permissions/directories. Added `sudo mkdir -p`, `sudo tee`, `sudo chmod`, and `mkdir -p ~/.config/autostart` where needed.

## Review Notes
The guide is technically relevant and mostly current for GNOME/Ubuntu display configuration. Fractional scaling remains desktop-version and session-type sensitive, and GNOME marks the relevant Mutter switches as experimental, so future Ubuntu/GNOME releases may change those exact keys or behavior.
