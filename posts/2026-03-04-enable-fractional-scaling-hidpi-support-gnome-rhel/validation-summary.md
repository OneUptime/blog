# Validation Summary: How to Enable Fractional Scaling and HiDPI Support in GNOME on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- GNOME Shell
- GNOME Settings and GSettings
- Mutter experimental features
- Wayland and X11/X.org display sessions
- xrandr
- GTK/GDK HiDPI environment variables
- Qt HiDPI environment variables

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9", Chapter 8 Desktop: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_desktop_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 8 documentation, "Considerations in adopting RHEL 8", Chapter 22 Desktop and graphics: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/desktop-and-graphics_considerations-in-adopting-rhel-8
- Red Hat Enterprise Linux 7.5 Release Notes, Chapter 41 Desktop: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/7.5_release_notes/technology_previews_desktop
- Local `gsettings` schema help for `org.gnome.desktop.interface` and `org.gnome.mutter`
- Local `xrandr --help` output
- Qt 6 High DPI documentation: https://doc.qt.io/qt-6/highdpi.html

## Issues Found
- The X11 section described `xrandr --scale 1.5x1.5` as 150% scaling. In xrandr, scale values greater than 1.0 make more framebuffer pixels fit into the output and make content appear smaller, so the example was changed to `0.6667x0.6667` for roughly 150% larger output.
- The post presented GNOME's X11 fractional scaling setting as a built-in RHEL path. Red Hat's RHEL documentation documents fractional scaling through GNOME Shell on Wayland, so the X11 section was changed to describe xrandr as a workaround and to tell users to check whether their GNOME build exposes X11 fractional scaling.
- The "current scale factor" wording was clarified to "current integer scale factor" because `org.gnome.desktop.interface scaling-factor` is an unsigned integer setting.
- The environment-variable persistence note implied that `~/.bashrc` affects all applications. It was narrowed to applications launched from a shell because GNOME desktop launchers do not generally read a user's interactive shell startup file.

## Review Notes
- RHEL 8 documentation explicitly marks GNOME fractional scaling as experimental and available in GNOME Shell on Wayland. RHEL 9 documentation also documents `scale-monitor-framebuffer` as the way to expose fractional scaling options in Settings.
- `org.gnome.mutter experimental-features` is intentionally not future-proof; available feature keywords vary by Mutter/GNOME build.
- Qt documentation treats `QT_SCALE_FACTOR` primarily as a high-DPI testing/debugging override and recommends using native display settings when possible.
