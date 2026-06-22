# Validation Summary: How to Install and Configure i3 Window Manager on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- i3 window manager (and i3-gaps)
- i3status status bar
- i3lock / i3lock-color screen locker
- Polybar (alternative status bar)
- Picom compositor
- Rofi / dmenu application launchers
- Dunst notification daemon
- xrandr / arandr / autorandr (display management)
- PulseAudio (`pactl`), `brightnessctl`, `playerctl`, `maim`/`flameshot`
- Ubuntu `apt` package management
- GTK theming, Nord color scheme

## Sources Consulted
- i3 User's Guide — https://i3wm.org/docs/userguide.html
- i3status(1) manual — https://i3wm.org/docs/i3status.html
- i3status(1) Ubuntu/Debian manpage — https://manpages.debian.org/testing/i3status/i3status.1.en.html
- Ubuntu `network-manager-gnome` (nm-applet) package — https://launchpad.net/ubuntu/+source/network-manager-applet and https://command-not-found.com/nm-applet
- Ubuntu `policykit-1-gnome` package — https://launchpad.net/ubuntu/+source/policykit-1-gnome
- Ubuntu `brightnessctl` package (universe) — https://ubuntu.pkgs.org/20.04/ubuntu-universe-amd64/brightnessctl_0.5.1-2_amd64.deb.html

## Issues Found
1. **Incorrect PolicyKit authentication agent path (3 occurrences).** The post used `/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1`, which is the Arch Linux path. On Ubuntu the `policykit-1-gnome` package installs the agent to `/usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1`. As written, the autostart `exec` line would silently fail (no auth dialogs). Fixed all three occurrences to the correct Ubuntu path.
2. **Invalid package name for the network applet.** The post ran `sudo apt install -y nm-applet`, but there is no Ubuntu package named `nm-applet`. The `nm-applet` binary is provided by the `network-manager-gnome` package, so this command would fail with "Unable to locate package". Changed the install command to `sudo apt install -y network-manager-gnome` and noted that it provides the `nm-applet` binary.

## Review Notes
- The i3status `memory` placeholder `%percentage_used` and `cpu_usage` thresholds (`max_threshold`, `degraded_threshold`) were verified against the i3status manual and are valid.
- The `i3-gaps` installation is appropriately hedged in the Installing section ("On newer Ubuntu versions, i3-gaps may be merged into i3"). Note that on i3 ≥ 4.22 (Ubuntu 23.10+ / 24.04) gaps are part of mainline `i3` and the standalone `i3-gaps` package no longer exists, so the later `sudo apt install -y i3-gaps` call in "Customizing Appearance" will fail on current Ubuntu — users on recent releases should skip it. Left as-is since it remains valid for older releases and the post flags the caveat.
- Several tools referenced in autostart/keybinding examples (`playerctl`, `xautolock`, `xss-lock`, `clipit`, `parcellite`, `pasystray`, `blueman-applet`, `dex`, `conky`) are not part of the earlier `apt install` lists, and the PolicyKit agent itself requires the (uninstalled) `policykit-1-gnome` package. These are illustrative snippets rather than incorrect statements, so no content was added; readers may need to install those packages separately.
- All keybindings, i3 directives (`gaps`, `smart_gaps`, `smart_borders`, `for_window`, `assign`, `bar` block, `mode "resize"`), Picom/Dunst/Polybar/Rofi config syntax, and `pactl`/`brightnessctl`/`xrandr` command syntax were checked and are correct.
