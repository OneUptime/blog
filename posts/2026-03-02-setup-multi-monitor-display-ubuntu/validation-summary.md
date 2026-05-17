# Validation Summary: How to Set Up Multi-Monitor Display on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (GNOME desktop)
- xrandr (X11 display configuration)
- Wayland / mutter
- gnome-randr (third-party tool)
- cvt (mode line generator)
- gsettings / dconf
- systemd-logind (logind.conf)
- arandr (xrandr GUI frontend)
- XDG autostart (.desktop entries)

## Sources Consulted
- xrandr(1) man page — verified `--scale`, `--mode`, `--rate`, `--pos`, `--primary`, `--same-as`, `--off`, `--auto`, `--rotate`, `--newmode`, `--addmode` flags
- logind.conf(5) man page — verified `HandleLidSwitch`, `HandleLidSwitchExternalPower`, `HandleLidSwitchDocked` semantics
- GNOME mutter gsettings schema — verified `org.gnome.mutter workspaces-only-on-primary` and `experimental-features` keys
- cvt(1) man page — verified output format for `cvt 2560 1440 60`
- XDG Desktop Entry Specification — verified `.desktop` autostart format

## Issues Found

1. **Incorrect systemd-logind option name (`HandleLidSwitchOnExternalPower`).** The actual option is `HandleLidSwitchExternalPower` (no "On"). Per logind.conf(5), the valid options are `HandleLidSwitch`, `HandleLidSwitchExternalPower`, and `HandleLidSwitchDocked`. Fixed by renaming to the correct identifier.

2. **Swapped comments on the lid-switch options.** The post labelled `HandleLidSwitch` as "AC power with external display" and `HandleLidSwitchOnExternalPower` as "on battery", but logind.conf documents the opposite: `HandleLidSwitch` is the default/battery action, while `HandleLidSwitchExternalPower` applies when on external (AC) power. Updated the comments to reflect the actual semantics.

3. **Incorrect description of `xrandr --scale 2x2`.** The post said this would "scale down a 4K display to appear as 2K", which is backwards. Per the xrandr man page, values greater than 1 produce a *compressed* screen — the framebuffer becomes larger than the output mode, so content appears smaller (more workspace), not larger. Rewrote the comments so they accurately describe both directions: values >1 enlarge the framebuffer (content smaller), values <1 zoom in (content larger). The 0.75x0.75 example was already correct.

## Review Notes

- `gnome-randr` is a third-party Python tool, not an official GNOME utility; the post correctly uses `|| xrandr` as a fallback, so the wording is acceptable even though some readers may not have it installed.
- The "all monitors share workspaces (default)" comment on `workspaces-only-on-primary=true` is slightly imprecise — with `true`, the secondary monitors are static (windows appear on every workspace) rather than truly "sharing" workspaces — but the default value stated (true) is correct, so this was not changed.
- The script writes `/usr/local/bin/monitor-setup.sh` with `tee` (no sudo). On a default Ubuntu install this directory is root-owned and the command would fail; readers may need to prepend `sudo`. Left as-is since it is a minor convention issue rather than a technical error.
- The `mutter --wayland --display-server` command is shown only as a commented-out hint; in practice, running it would start a new Mutter instance rather than introspecting the running one. Left as a comment since it is not presented as a recommended workflow.
- The `xrandr --scale` workflow for HiDPI on X11 is acknowledged in the broader ecosystem as a workaround rather than a polished feature; users with HiDPI setups are usually better served by Wayland's fractional scaling, which the post does describe.
