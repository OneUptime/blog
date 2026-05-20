# Validation Summary: How to Use apt-mark to Hold and Unhold Package Versions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT
- apt-mark
- apt-get
- dpkg package selections
- APT preferences / pinning
- Debian package management

## Sources Consulted
- Debian `apt-mark(8)` man page: https://manpages.debian.org/unstable/apt/apt-mark.8.en.html
- Debian `apt-get(8)` man page: https://manpages.debian.org/bookworm/apt/apt-get.8.en.html
- Debian `apt_preferences(5)` man page: https://manpages.debian.org/apt_preferences
- Local `apt-mark(8)` man page from APT 2.8.3.
- Local `apt-get(8)` man page from APT 2.8.3.
- Local `apt_preferences(5)` man page from APT 2.8.3.
- Local `dpkg(1)` man page.
- Local `apt-mark --help` and `apt-get --help` output.

## Issues Found
- The `dist-upgrade` section incorrectly said `apt dist-upgrade` can still upgrade held packages to resolve dependency conflicts and suggested dpkg selection plus pinning was needed for a hold that `dist-upgrade` respects. The section was corrected to state that `apt upgrade` and `apt dist-upgrade` respect held packages by default, and that held-package changes require explicit override options such as `--ignore-hold` or `--allow-change-held-packages`.
- The APT preferences example was described as preventing a package from upgrading. The shown `Pin: version 14.*` rule prefers matching PostgreSQL 14 versions rather than freezing one exact package build, so the comments and explanation were narrowed to describe keeping the package on the selected version series.

## Review Notes
The remaining `apt-mark hold`, `unhold`, `showhold`, `manual`, `auto`, `showmanual`, and `showauto` examples are consistent with the documented `apt-mark` commands. The `dpkg --set-selections`, `dpkg --get-selections`, and `apt-get dselect-upgrade` examples are consistent with dpkg selection state behavior and APT's documented dselect integration. The bulk hold examples are operationally broad and should be used carefully on real systems, but the commands are technically valid.
