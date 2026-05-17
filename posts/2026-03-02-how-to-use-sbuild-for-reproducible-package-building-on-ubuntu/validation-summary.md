# Validation Summary: How to Use sbuild for Reproducible Package Building on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sbuild (Debian/Ubuntu package builder)
- schroot (chroot session manager)
- debootstrap
- dpkg-buildpackage
- sbuild-createchroot, sbuild-update
- lintian
- diffoscope
- SOURCE_DATE_EPOCH / DEB_BUILD_OPTIONS reproducibility tooling
- Ubuntu 24.04 (Noble) and 22.04 (Jammy)
- Build profiles, cross-compilation (arm64)

## Sources Consulted
- sbuild(1) and sbuild.conf(5) man pages (Debian/Ubuntu)
- sbuild-update(1) man page
- sbuild-createchroot(8) man page
- schroot(1) man page
- dpkg-buildpackage(1) and dpkg-parsechangelog(1) man pages
- Debian Reproducible Builds documentation (https://reproducible-builds.org/)
- Debian Build Profiles spec (https://wiki.debian.org/BuildProfileSpec)
- Debian wiki: sbuild (https://wiki.debian.org/sbuild)

## Issues Found

1. **Misleading `$pgp_options` comment in `~/.sbuildrc` example.** The comment read "Sign packages with your GPG key" above `$pgp_options = ['-us', '-uc'];`. These are dpkg-buildpackage flags meaning "unsigned source" and "unsigned changes" — i.e. they DISABLE signing. This is the upstream default. Replaced with an accurate comment explaining that the default disables signing and that signing is enabled by removing the flags and passing `--sign-with=KEYID` on the command line.

2. **Incorrect `--debbuildopt` usage in the Reproducible Builds section.** The post used `--debbuildopt="-DEB_BUILD_OPTIONS=reproducible=+all"`. `--debbuildopt` passes a single argument to dpkg-buildpackage, but `DEB_BUILD_OPTIONS` is an environment variable, not a dpkg-buildpackage option — `-DEB_BUILD_OPTIONS=...` would be parsed as the (unrelated) `-D` flag followed by garbage. Replaced with the documented, working approach: setting `DEB_BUILD_OPTIONS` in `$build_environment` inside `~/.sbuildrc` so it is propagated into the chroot, and then invoking `sbuild` normally.

## Review Notes
- The sbuildrc example uses `$build_arch`, which is the documented sbuild.conf variable for the build architecture; this is correct.
- `sbuild-update --update --upgrade --autoclean` uses the long-option spellings supported by sbuild-update.
- `dpkg-parsechangelog -STimestamp` correctly returns the changelog date as a Unix timestamp suitable for `SOURCE_DATE_EPOCH`.
- The build-profile dependency syntax `libdoc-dev <!nodoc>` and `--debbuildopt="--build-profiles=nodoc"` are valid per the Debian Build Profiles spec; sbuild also has a native `--profiles=` option, which would be slightly more idiomatic but the current form works.
- The `--include=apt-transport-https` flag in the noble `sbuild-createchroot` example is harmless but no longer strictly necessary on modern Ubuntu, since HTTPS transport is part of apt itself.
- `groups | grep sbuild` only reflects sbuild group membership after re-login (or `newgrp sbuild`); the post correctly notes this above the command.
