# Validation Summary: How to Rebuild a Package from Source on Ubuntu with APT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (22.04 Jammy and 24.04 Noble)
- APT / apt-get (source repositories, build-dep)
- Debian source packaging (.dsc, .orig.tar.gz, .debian.tar.xz)
- dpkg-buildpackage / debuild
- devscripts (dch)
- quilt (patch management)
- pbuilder (clean chroot builds)
- dpkg / apt-mark
- deb822 sources format
- nginx and curl (used as worked examples)

## Sources Consulted
- Debian Policy Manual — Source packages, debian/rules, debian/control: https://www.debian.org/doc/debian-policy/
- Ubuntu documentation for `apt-get source` and `apt-get build-dep`: https://manpages.ubuntu.com/manpages/jammy/man8/apt-get.8.html
- `dpkg-buildpackage(1)` man page: https://manpages.debian.org/bookworm/dpkg-dev/dpkg-buildpackage.1.en.html
- `dch(1)` man page (devscripts): https://manpages.debian.org/bookworm/devscripts/dch.1.en.html
- `quilt(1)` man page: https://manpages.debian.org/bookworm/quilt/quilt.1.en.html
- `pbuilder(8)` man page: https://manpages.debian.org/bookworm/pbuilder/pbuilder.8.en.html
- Ubuntu 24.04 release notes / `sources.list.d/ubuntu.sources` deb822 default: https://wiki.ubuntu.com/NobleNumbat/ReleaseNotes
- Ubuntu package archive — nginx (1.18.0-6ubuntu14.x in Jammy) and curl (7.81.0 in Jammy): https://packages.ubuntu.com/

## Issues Found
- The post claimed the new deb822 sources format (`/etc/apt/sources.list.d/ubuntu.sources`) is available "on Ubuntu 22.04 and later." This was incorrect: while APT itself has supported deb822 since around APT 1.1, Ubuntu only ships the deb822-style `ubuntu.sources` as the **default** starting with Ubuntu 24.04 (Noble Numbat). Ubuntu 22.04 (Jammy) still uses the classic `/etc/apt/sources.list` by default. Updated the wording to "on Ubuntu 24.04 and later (which use the new deb822 format by default)."

## Review Notes
- All other commands and flags are accurate:
  - `apt-get source <pkg>` (no sudo required) and `apt-get -s build-dep <pkg>` (the `-s` simulate flag is supported by apt-get) are correct.
  - `dpkg-buildpackage -b -us -uc` and the descriptions of `-b`, `-us`, `-uc` are correct.
  - `dpkg-buildpackage -j$(nproc)` is the correct way to pass parallelism.
  - `dch --local` and `dch --newversion` usage and the `+custom` suffix recommendation are consistent with Debian/Ubuntu version-comparison rules.
  - The quilt workflow (`debian/patches/series`, `quilt push -a`) is correct.
  - `pbuilder create --distribution jammy` and `pbuilder build <dsc>` are correct.
  - `apt-mark hold <pkg>` correctly pins the installed version.
- Versions used in worked examples (nginx 1.18.0-6ubuntu14.x and curl 7.81.0) match what Ubuntu 22.04 (Jammy) actually shipped, so they are realistic at the time the post was written. Readers on later releases (24.04+) will see different versions but the workflow is unchanged.
- The "Adding a Compile-time Option" subsection is somewhat illustrative rather than concrete (it tells the reader to edit `debian/rules` without showing the exact edit). That is a stylistic limitation, not a technical error.
- No deprecated APIs or commands were used.
