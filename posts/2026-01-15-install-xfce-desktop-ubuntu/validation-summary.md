# Validation Summary: How to Install XFCE Desktop on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- XFCE desktop environment (xfce4, xfwm4, xfce4-panel, xfdesktop4, Thunar)
- Ubuntu (20.04 / 22.04 / 24.04 LTS) and Xubuntu metapackages (xubuntu-desktop, xubuntu-core)
- LightDM display manager and lightdm-gtk-greeter
- xfconf / xfconf-query configuration system
- xfce4-goodies panel plugins (Whisker Menu, etc.)
- GTK/icon/cursor theming
- xrandr multi-monitor configuration
- systemd-analyze, free, ps, htop (resource measurement)

## Sources Consulted
- Xfce xfwm4 keyboard shortcuts documentation — https://docs.xfce.org/xfce/xfwm4/keyboard_shortcuts
- Thunar source (thunar-preferences.c, thumbnail-mode property + enum nicks) — https://github.com/xfce-mirror/thunar/blob/master/thunar/thunar-preferences.c
- Thunar 4.20 hidden settings docs — https://docs.xfce.org/xfce/thunar/4.20/hidden-settings
- Ubuntu package archive (midori, epiphany-browser) — https://packages.ubuntu.com/midori , https://packages.ubuntu.com/noble/epiphany-browser
- UbuntuHandbook: "The Lightweight Midori Browser Revived" (confirms midori removed from repos) — https://ubuntuhandbook.org/index.php/2022/12/midori-revived-appimage-deb/

## Issues Found

1. **Incorrect xfwm4 default keyboard shortcuts (Alt+F7, Alt+F8, Alt+F12).**
   The table listed `Alt+F7` as "Maximize window", `Alt+F8` as "Stick window", and `Alt+F12` as "Show window menu". Per the official Xfce docs, the defaults are `Alt+F7` = Move window, `Alt+F8` = Resize window, `Alt+F12` = toggle "always on top" (above), and the window operations menu is `Alt+Space`. Corrected the three rows and added an `Alt+Space` row for the window menu.

2. **`midori` is no longer installable via apt on the supported Ubuntu versions.**
   Midori was removed from the Ubuntu archive (gone since 22.04; absent in 24.04), so `sudo apt install midori` fails on the very releases the post targets. Replaced it with `epiphany-browser` (GNOME Web), a genuinely lightweight GTK/WebKit browser confirmed present in the 24.04 (noble) universe repository.

3. **Wrong Thunar xfconf property name and enum value.**
   The post used `xfconf-query -c thunar -p /misc-show-thumbnails` with values including `THUNAR_THUMBNAIL_MODE_LOCAL_ONLY`. The current Thunar property is `/misc-thumbnail-mode`, and the correct enum nick is `THUNAR_THUMBNAIL_MODE_ONLY_LOCAL` (not `LOCAL_ONLY`). `misc-show-thumbnails` was the pre-1.8 boolean and does not accept the mode strings. Fixed all three occurrences (two in the "Optimize Thunar" section, one in the optimization script).

## Review Notes
- The `thunar` xfconf channel referenced in the post does exist (verified), so aside from the property-name/value fix the approach is valid.
- `Super+D` (show desktop), `Super+L` (lock screen), and `Ctrl+Alt+Delete` (lock screen) are commonly configured in Xubuntu but the exact default bindings vary by Xfce/Xubuntu version; left as-is since they are reasonable and version-dependent.
- The `position=50%,center` value in the LightDM GTK greeter example is unusual — the greeter expects an `x,y` coordinate pair (e.g. `50%,50%`). Left unchanged as it is a non-critical cosmetic example, but readers should use coordinates.
- RAM/disk/download-size figures throughout are explicitly labeled "approximate" and are reasonable ballpark values; not treated as errors.
- Package and command names (xfce4-goodies plugins, settings dialog commands like `xfce4-appearance-settings`, `xfwm4-tweaks-settings`, `xfce4-display-settings`, etc.), the xfconf paths for theming/compositing/workspaces, and the xsession/.desktop examples were all checked and are accurate.
