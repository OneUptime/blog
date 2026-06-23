# Validation Summary: How to Configure Multiple Monitors on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (20.04–24.04)
- GNOME (gnome-control-center, Settings > Displays)
- xrandr (X11 display configuration)
- Wayland / mutter / gsettings
- xorg.conf and /etc/X11/xorg.conf.d
- NVIDIA tools (nvidia-settings, nvidia-xconfig, nvidia-smi, PRIME)
- AMDGPU / FreeSync, VRR (Variable Refresh Rate)
- HiDPI / fractional scaling (GDK_SCALE, QT_SCALE_FACTOR)
- Virtual displays (xserver-xorg-video-dummy, Xvfb, x11vnc)
- udev hotplug rules, autostart .desktop entries

## Sources Consulted
- xrandr(1) man page / X.Org documentation
- Arch Wiki: NVIDIA (https://wiki.archlinux.org/title/NVIDIA)
- Arch Wiki: Variable refresh rate (https://wiki.archlinux.org/title/Variable_refresh_rate)
- NVIDIA developer docs: Using nvidia-xconfig to Configure xorg.conf (https://developer.nvidia.com/docs/drive/drive-os/archives/6.0.4/linux/sdk/common/topics/window_system_stub/Usingnvidia-xconfigtoConfigurexorg.conf44.html)
- GNOME mutter experimental-features (org.gnome.mutter) references for fractional scaling
- DRM kernel sysfs documentation (vrr_capable connector property)

## Issues Found
1. **Incorrect sysfs path for VRR capability check.** The post used `cat /sys/class/drm/card*/device/vrr_capable`. The `vrr_capable` property is exposed per-connector under the DRM card directory (e.g. `card0-DP-1`), not under the PCI `device/` subdirectory. Changed to `cat /sys/class/drm/card0-*/vrr_capable` and added a clarifying comment about the connector-level property.
2. **Invalid `nvidia-settings --save` command.** `nvidia-settings` has no `--save` CLI flag; from the command line it saves only to `~/.nvidia-settings-rc`, and the X configuration file is written via the GUI's "Save to X Configuration File" button or, from the CLI, via `nvidia-xconfig`. Changed the "Save configuration to xorg.conf" step to `sudo nvidia-xconfig` (consistent with the post's earlier X11 section, which already uses `nvidia-xconfig`).

## Review Notes
- The mutter experimental feature key `x11-randr-fractional-scaling` was verified as valid for enabling fractional scaling on X11; left as-is.
- The `cvt 1920 1200 60` modeline values, HDMI/DisplayPort bandwidth-vs-resolution claims (HDMI 1.4/2.0/2.1, DP 1.2/1.4), and the GDK_SCALE/GDK_DPI_SCALE/QT_SCALE_FACTOR examples were checked and are accurate.
- Minor (not changed, not a command error): the section heading "Integer Scaling with xrandr" uses non-integer `--scale` factors (0.5, 1.5), and the `--pos WIDTHxHEIGHT` comment is really an `XxY` offset (horizontal x vertical). These are labeling imprecisions; the commands themselves are correct.
- The GNOME "Keep Changes" confirmation timer is described as 20 seconds in one place and 15 seconds in the troubleshooting section; the exact value varies by GNOME version, so neither was treated as an error.
- `amdconfig --initial` is correctly noted as legacy (fglrx); modern AMD uses the in-kernel amdgpu driver.
