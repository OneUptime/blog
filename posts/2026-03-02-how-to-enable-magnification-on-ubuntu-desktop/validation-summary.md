# Validation Summary: How to Enable Magnification on Ubuntu Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop
- GNOME accessibility settings
- GNOME Shell magnifier
- GSettings / gsettings
- Ubuntu APT packages

## Sources Consulted
- GNOME Help: Magnify a screen area: https://help.gnome.org/gnome-help/a11y-mag.html
- Ubuntu Desktop Guide: Magnify a screen area: https://help.ubuntu.com/stable/ubuntu-help/a11y-mag.html.en
- GNOME Help: Set keyboard shortcuts: https://help.gnome.org/gnome-help/keyboard-shortcuts-set.html
- GNOME Wiki archive: GNOME Shell Magnification GSettings reference: https://wiki.gnome.org/Projects/GnomeShell/Magnification
- Ubuntu Launchpad package page for vmg: https://launchpad.net/ubuntu/resolute/+package/vmg
- Local Ubuntu gsettings-desktop-schemas file: /usr/share/glib-2.0/schemas/org.gnome.desktop.a11y.magnifier.gschema.xml
- Local command checks: gsettings list-schemas, gsettings range, apt-cache policy, apt-cache show, dpkg-deb -c

## Issues Found
- The post used the incorrect schema `org.gnome.desktop.magnifier` for magnifier settings. Changed those commands to `org.gnome.desktop.a11y.magnifier`, which is the schema exposed by current GNOME gsettings-desktop-schemas.
- The `focus-tracking` example set the key to `true`, but this key is an enum with values such as `none`, `centered`, `proportional`, and `push`. Changed the example to `focus-tracking centered`.
- The GNOME Tweaks section claimed magnifier color effects were configured through an Accessibility tab in Tweaks. Current GNOME and Ubuntu documentation place these controls under Settings > Accessibility > Zoom, so the section was corrected to reference GNOME Settings.
- The post recommended `wmagnify`, which was not available in the checked Ubuntu repositories. Replaced it with `vmg`, an Ubuntu-packaged standalone magnifier, and updated the install and launch commands.
- The troubleshooting commands used the incorrect magnifier schema. Updated them to `org.gnome.desktop.a11y.magnifier`.
- The statement that zoom shortcuts are active whenever the magnifier is installed was too broad because the shortcuts are predefined GNOME shortcuts and can be changed. Reworded it to reflect that they are configurable in Keyboard Shortcuts settings.

## Review Notes
The remaining GNOME Settings and shortcut descriptions match current GNOME and Ubuntu documentation. The crosshair color key accepts a string value; GNOME's historical magnifier reference documents examples including RGBA-style hex strings, so the existing `#ff0000ff` example was retained.
