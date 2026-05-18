# Validation Summary: How to Use checkinstall to Create Packages from Source on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- checkinstall (1.6.2)
- Ubuntu / Debian package management (apt, dpkg)
- htop (3.3.0) source build
- nginx (1.26.1) source build with custom modules
- GNU autotools (configure, make)
- CMake and Ninja install commands
- GNU Stow (briefly, in comparison)

## Sources Consulted
- Ubuntu package cache for `checkinstall`, `libncurses-dev`, `libpcre3-dev`, `libssl-dev`, `zlib1g-dev`, `libpcre3`, `libssl3`, `zlib1g`, `libncurses6`, `libc6`
- checkinstall manpage (manpages.debian.org/bookworm/checkinstall, manpages.ubuntu.com)
- htop 3.3.0 GitHub release (https://github.com/htop-dev/htop/releases/tag/3.3.0)
- nginx download page and direct HEAD request to http://nginx.org/download/nginx-1.26.1.tar.gz (verified 200 OK)
- CMake 3.15 release notes (for `cmake --install` syntax)
- apt(8) / apt-get(8) man pages for `autoremove` behavior

## Issues Found
No technical issues found. All commands, flags, URLs, and package names were verified:

- `checkinstall 1.6.2` matches the version in Ubuntu repositories and the header banner shown in the post's example output.
- All `checkinstall` command-line flags (`--pkgname`, `--pkgversion`, `--pkgrelease`, `--pkglicense`, `--pkggroup`, `--maintainer`, `--requires`, `--conflicts`, `--replaces`, `--nodoc`, `--default`) are valid per the official manpage.
- The htop 3.3.0 download URL `https://github.com/htop-dev/htop/releases/download/3.3.0/htop-3.3.0.tar.xz` exists and is correct.
- The nginx 1.26.1 download URL `http://nginx.org/download/nginx-1.26.1.tar.gz` returns HTTP 200 — nginx keeps historical releases available indefinitely.
- Ubuntu package names referenced (`libncurses-dev`, `libpcre3-dev`, `libssl-dev`, `zlib1g-dev`, and the runtime equivalents) all exist.
- `cmake --install build/` syntax is valid (added in CMake 3.15).
- `dpkg -l/-L/-s/-r` and `apt show/remove/autoremove` usage is correct.

## Review Notes
- Running `./autogen.sh` on the htop release tarball is not strictly required (release tarballs ship with a pre-generated `configure` script). It is harmless here because the post installs `autoconf` and `automake` as build dependencies, but a reader building only from a tarball could skip that step. Not corrected — it still works as written.
- `sudo apt autoremove <package>` does work as described (removes the named package and then performs orphan cleanup), but this form is not explicitly documented in the apt(8) man page. The more canonical idiom is `sudo apt remove --auto-remove <package>`. The post's usage is correct in practice and widely used.
- On Ubuntu 24.04+, the OpenSSL runtime library is renamed to `libssl3t64` (time_t 64-bit transition); `libssl3` in the nginx `--requires` list is correct for 22.04 / older systems but readers on 24.04+ may need `libssl3t64`.
- The `--pid-path=/var/run/nginx.pid` in the nginx configure example is fine — `/var/run` is a symlink to `/run` on modern systems.
- `apt build-dep nginx` requires `deb-src` source repositories to be enabled in `/etc/apt/sources.list` (or `ubuntu.sources` on 24.04+); not mentioned but a known prerequisite for `build-dep`.
