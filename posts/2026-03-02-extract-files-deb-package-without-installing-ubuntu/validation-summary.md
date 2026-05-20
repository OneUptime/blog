# Validation Summary: How to Extract Files from a .deb Package Without Installing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Debian binary packages (.deb)
- dpkg-deb
- apt-get
- ar archives
- tar archives
- Archive Manager / file-roller

## Sources Consulted
- Debian `deb(5)` manual: https://manpages.debian.org/testing/dpkg-dev/deb.5.en.html
- Debian `dpkg-deb(1)` manual: https://manpages.debian.org/unstable/dpkg/dpkg-deb.1.en.html
- Debian `apt-get(8)` manual: https://manpages.debian.org/unstable/apt/apt-get.8.en.html
- Local `dpkg-deb --help` output from dpkg-deb 1.22.6
- Local `apt-get --help` output from apt 2.8.3
- Local `deb(5)` manual page from dpkg suite 1.22.6

## Issues Found
- The package structure section listed `control.tar.xz` or `.gz`, but current `.deb` packages can also use uncompressed `control.tar` or `control.tar.zst`. Updated the bullet to include these supported forms.
- The `data.tar` bullet said "or other compression" but did not identify the supported alternatives. Updated it to list the currently documented supported extensions: `.gz`, `.zst`, `.bz2`, `.lzma`, and uncompressed `data.tar`.
- The `apt-get download package=version` section said it could be used for "older or unavailable versions." `apt-get download` can download versions available from configured repositories, but not arbitrary unavailable versions. Updated the wording to "older versions that are still available from your configured repositories."

## Review Notes
The command examples using `dpkg-deb --extract`, `--control`, `--contents`, `--info`, `--field`, and `--fsys-tarfile` match the documented `dpkg-deb` interface. `apt-get download` is documented to download a binary package into the current directory. The `ar` extraction examples are correct for packages whose members use `.xz` compression, though packages using `.gz`, `.zst`, `.bz2`, `.lzma`, or uncompressed tar members require matching filenames.
