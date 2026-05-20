# Validation Summary: How to Configure GNOME Shell Extensions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop
- GNOME Shell
- GNOME Shell extensions
- GNOME Extensions website and browser connector
- GNOME Extensions Manager
- `gnome-extensions` CLI
- GSettings and dconf
- APT packages

## Sources Consulted
- GNOME JavaScript extension anatomy documentation: https://gjs.guide/extensions/overview/anatomy.html
- GNOME JavaScript extension debugging documentation: https://gjs.guide/extensions/development/debugging.html
- Ubuntu `gnome-extensions` man page for 24.04: https://manpages.ubuntu.com/manpages/noble/man1/gnome-extensions.1.html
- GNOME browser integration installation guide: https://gnome.pages.gitlab.gnome.org/gnome-browser-integration/pages/installation-guide.html
- GNOME system administration guide for extension install locations and UUID use: https://help.gnome.org/admin/system-admin-guide/unstable/extensions.html.en
- Ubuntu 22.04 release notes: https://discourse.ubuntu.com/t/jammy-jellyfish-release-notes/24668
- Ubuntu 23.04 release notes: https://discourse.ubuntu.com/t/lunar-lobster-release-notes/31910
- Ubuntu 24.04 release notes: https://documentation.ubuntu.com/release-notes/24.04/
- Ubuntu 26.04 release notes: https://documentation.ubuntu.com/release-notes/26.04/changes-since-previous-interim/
- Ubuntu package metadata for `gnome-shell-extension-manager`, `gnome-browser-connector`, `chrome-gnome-shell`, and `gnome-shell-extension-appindicator`

## Issues Found
- The session-name command was described as a dconf-based version check. It does not report the GNOME Shell version, so the comment was changed to say it checks the current GNOME session name.
- The Ubuntu version list was outdated and slightly imprecise for Ubuntu 22.04. It now notes that Ubuntu 22.04 uses GNOME Shell 42 with some GNOME 41 apps, and adds Ubuntu 26.04 with GNOME 50.
- The browser connector package was listed only as `chrome-gnome-shell`. On Ubuntu 24.04 and later, `gnome-browser-connector` is the current package and `chrome-gnome-shell` is transitional; the post now uses `gnome-browser-connector` and keeps `chrome-gnome-shell` as the Ubuntu 22.04 package.
- The Extensions Manager launch command was incorrect. The Ubuntu package installs `/usr/bin/extension-manager`, so the command was changed from `gnome-shell-extension-manager` to `extension-manager`.
- The GNOME Shell reload command used the restricted `org.gnome.Shell Eval` D-Bus method. Current GNOME documentation recommends the built-in `restart` command from the Run dialog on X11 and logging out/in on Wayland, so the post now uses that guidance.
- The AppIndicator UUID for Ubuntu's apt package was incorrect. The `gnome-shell-extension-appindicator` package installs `ubuntu-appindicators@ubuntu.com`, so the examples and script were updated to enable that UUID.
- The scripted dconf path for AppIndicator settings was incorrect. The Ubuntu package schema uses `/org/gnome/shell/extensions/appindicator/`, so the `icon-size` write path was corrected.

## Review Notes
The remaining examples are version-sensitive because GNOME Shell extension compatibility depends on each extension's declared `shell-version`. Readers should still confirm that any third-party extension supports their installed GNOME Shell release before enabling it.
