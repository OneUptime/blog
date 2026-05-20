# Validation Summary: How to Auto-Login to Ubuntu Desktop Without Prompt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Desktop
- GDM3
- LightDM
- SDDM
- systemd
- LUKS full-disk encryption
- sudoers

## Sources Consulted
- Ubuntu Desktop Guide: automatic login, https://help.ubuntu.com/stable/ubuntu-help/user-autologin.html.en
- Ubuntu manpage for gdm3, https://manpages.ubuntu.com/manpages/noble/man8/gdm3.8.html
- GNOME GDM administration documentation, https://help.gnome.org/admin/gdm/stable/configuration.html.es
- LightDM upstream example configuration, https://github.com/canonical/lightdm/blob/main/data/lightdm.conf
- Ubuntu Wiki for LightDM configuration, https://wiki.ubuntu.com/LightDM
- SDDM upstream configuration manpage source, https://github.com/sddm/sddm/blob/develop/data/man/sddm.conf.rst.in
- Debian Wiki for SDDM autologin, https://wiki.debian.org/SDDM
- Local sudoers manpage (`man sudoers`)

## Issues Found
- Removed the `lightdm-set-defaults` commands. That helper is obsolete on current Ubuntu/LightDM configurations; current guidance is to edit LightDM configuration files directly or use `/etc/lightdm/lightdm.conf.d/`.
- Fixed inline comments in configuration values. Examples like `TimedLoginDelay=30  # Seconds before auto-login` can be parsed as an invalid value by key-file style configuration parsers, so the comment was moved to its own line.
- Fixed the LightDM `autologin-session` example by moving the explanatory text to a separate comment and clarifying that LightDM session names should come from `/usr/share/xsessions/` without the `.desktop` suffix.
- Fixed the SDDM autologin example from `Session=plasma` to `Session=plasma.desktop`, matching documented SDDM guidance to use a session desktop file name.
- Replaced the root auto-login instructions. The `AllowRoot=true` guidance is not a supported modern Ubuntu/GDM path, and root graphical auto-login should not be presented as a workable GDM3 recipe. The section now directs readers to a dedicated non-root account.
- Fixed the kiosk sudoers example. `kiosk ALL=(ALL) NOPASSWD: NOPASSWD` is not a valid way to prevent sudo use and could mislead readers; the example now says not to add the kiosk user to the `sudo` group.
- Updated the GNOME GUI navigation note to account for newer Ubuntu Settings layout where Users appears under Settings > System > Users.

## Review Notes
The main GDM3, LightDM, SDDM, LUKS, and systemd commands are technically sound after the edits. The post could later mention that GNOME Keyring/KWallet may still prompt after auto-login because the login password was not entered, but that is an operational caveat rather than a correctness issue in the core auto-login configuration.
