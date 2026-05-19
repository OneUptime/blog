# Validation Summary: How to Fix 'Sub-process /usr/bin/dpkg returned error' on Ubuntu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ubuntu
- Debian package management
- dpkg
- APT
- systemd and journalctl
- Shell commands

## Sources Consulted
- Debian dpkg manual: https://manpages.debian.org/dpkg
- Debian dpkg-query manual: https://manpages.debian.org/dpkg-query
- APT apt manual: https://manpages.debian.org/apt
- APT apt-get manual: https://manpages.debian.org/apt-get
- Debian Policy Manual, maintainer scripts: https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The force-remove section said `--force-remove-reinstreq` removes packages while ignoring scripts. This is inaccurate: the dpkg force option permits removing a package marked `reinstreq`, but it does not generally bypass failing maintainer scripts. Updated the wording to explain when the option applies and that failing maintainer scripts still need to be fixed or stubbed.
- The reinstall section used `sudo dpkg --clear-selection somepackage`, which is not a valid per-package command and does not mark a package as needing reinstallation. Replaced it with `sudo apt install --reinstall somepackage` and clarified that dpkg's `reinstreq` flag is internal package state.
- The cascading failures section described `--force-configure-any` as a way to ignore a specific package. dpkg documents it as allowing configuration of unpacked dependencies needed by the current package. Updated the comment and example command accordingly.

## Review Notes
The remaining commands and explanations are consistent with current dpkg, dpkg-query, APT, systemd, and journalctl documentation. Editing or stubbing maintainer scripts is technically possible but risky; the post already warns that this can leave package configuration incomplete.
