# Validation Summary: How to Add and Switch Between Input Languages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu GNOME desktop input sources
- GNOME Settings and GSettings
- XKB keyboard layouts
- IBus input method framework
- Fcitx5 input method framework
- im-config
- localectl
- setxkbmap
- GNOME Shell extensions

## Sources Consulted
- GNOME Help: Use alternative keyboard layouts: https://help.gnome.org/users/gnome-help/stable/keyboard-layouts.html
- GNOME gsettings schema descriptions installed locally for `org.gnome.desktop.input-sources` and `org.gnome.desktop.wm.keybindings`
- systemd `localectl(1)` manual: https://www.freedesktop.org/software/systemd/man/latest/localectl.html
- Debian/Ubuntu `im-config(8)` manual installed locally
- IBus command help installed locally for `ibus` and `ibus-daemon`
- X.Org `setxkbmap(1)` command help installed locally
- Ubuntu package metadata checked locally with `apt-cache policy` for `ibus-mozc`, `ibus-anthy`, `ibus-hangul`, `ibus-pinyin`, `fcitx5`, `fcitx5-chinese-addons`, `fcitx5-frontend-gtk3`, and `gnome-browser-connector`

## Issues Found
- The introduction and IBus section implied Arabic and Thai generally require an IME. I narrowed the examples to IME-based languages such as Chinese, Japanese, and Korean.
- The Japanese IBus package example used `ibus-anthy`, which is not available in current Ubuntu Noble package metadata. I changed it to `ibus-mozc`.
- The `im-config` verification command pointed to `~/.config/im-config/70_user.conf`, but current `im-config` writes the user setting to `~/.xinputrc`. I corrected the path.
- The `setxkbmap -query` section did not distinguish X11 from Wayland. I added a short caveat and pointed Wayland GNOME users back to the GSettings input source query.
- The GNOME Shell extension installation command used `gnome-shell-extensions`, which installs bundled extensions rather than the native browser connector for extensions.gnome.org. I changed it to `gnome-browser-connector`.
- The troubleshooting section queried `org.gnome.shell.keybindings switch-input-source`, which is not a valid key in the current GNOME schema. I changed it to `org.gnome.desktop.wm.keybindings switch-input-source-backward`.
- The final performance note attributed layout switching partly to the kernel. I reworded it to XKB, IBus, and the X11 or Wayland desktop session.

## Review Notes
The remaining commands and settings were consistent with local command help, GNOME schema descriptions, and Ubuntu package metadata. The `ibus-daemon -drx` example is syntactically valid, though GNOME sessions commonly start IBus through the desktop session or input method configuration.
