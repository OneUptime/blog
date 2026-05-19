# Validation Summary: How to Configure systemd Portable Services on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd portable services
- portablectl
- systemd unit files
- debootstrap
- mkosi
- squashfs

## Sources Consulted
- systemd Portable Services documentation: https://systemd.io/PORTABLE_SERVICES/
- portablectl(1) official systemd manual: https://www.freedesktop.org/software/systemd/man/portablectl.html
- portablectl(1) systemd 247 manual: https://www.freedesktop.org/software/systemd/man/247/portablectl.html
- os-release(5) official systemd manual: https://www.freedesktop.org/software/systemd/man/os-release.html
- Ubuntu portablectl man page for systemd-container package: https://manpages.ubuntu.com/manpages/focal/man1/portablectl.1.html
- Ubuntu mkosi man page: https://manpages.ubuntu.com/manpages/focal/man1/mkosi.1.html

## Issues Found
- The prerequisites implied systemd 247+ was needed for full support while also targeting Ubuntu 20.04. Ubuntu 20.04 ships portablectl in systemd-container with systemd 245, and extension-image support is not present in the systemd 247 portablectl manual. I changed the prerequisite to distinguish basic portable services from extension-image usage and recommend Ubuntu 24.04 or later for extensions.
- The post described attached services as running in a lightweight namespace. Official systemd documentation describes portable services as regular services with `RootDirectory=` or `RootImage=` drop-ins and profile sandboxing. I updated the explanation to match that mechanism.
- The unit-file example wrote to `/usr/lib/systemd/system/` inside the image without ensuring that directory exists. I added a `mkdir -p` command before writing the unit.
- The default profile was described as allowing access to most host resources. The official portablectl documentation calls it fairly restrictive. I corrected the description in both the attach example and profile list.
- The profile directory paths used `/usr/lib/systemd/portable/` and `/etc/systemd/portable/profiles/`. The documented paths are `/usr/lib/systemd/portable/profile/` and `/etc/systemd/portable/profile/`. I corrected the commands and prose.
- The extension-image example omitted required `extension-release` metadata. I added an `/etc/extension-release.d/extension-release.myapp-config` file matching the Ubuntu base image used in the tutorial.
- The troubleshooting section used `systemd-analyze verify` on a portable image path, but `portablectl inspect` is the documented way to validate image metadata and matching unit files. I replaced that command.

## Review Notes
The local review environment had systemd 255 installed but did not have `portablectl` or `mkosi` available, so CLI details were verified against official systemd and Ubuntu man pages rather than local `--help` output.
