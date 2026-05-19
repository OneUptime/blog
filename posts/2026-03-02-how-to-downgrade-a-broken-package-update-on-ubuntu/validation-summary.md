# Validation Summary: How to Downgrade a Broken Package Update on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- APT
- dpkg
- APT preferences and package pinning
- apt-mark package holds
- Ubuntu snapshot service
- Timeshift, LVM, Btrfs, and ZFS snapshots

## Sources Consulted
- Ubuntu manpage for apt-cache: https://manpages.ubuntu.com/manpages/resolute/man8/apt-cache.8.html
- Ubuntu manpage for dpkg: https://manpages.ubuntu.com/manpages/jammy/man1/dpkg.1.html
- Local apt-get, apt-cache, apt-mark, apt_preferences, and dpkg manpages
- Ubuntu Snapshot Service: https://snapshot.ubuntu.com/
- Ubuntu Server documentation for the snapshot service: https://ubuntu.com/server/docs/how-to/software/snapshot-service/
- Ubuntu archive package URL check for the nginx example: http://archive.ubuntu.com/ubuntu/pool/main/n/nginx/nginx_1.18.0-6ubuntu14_amd64.deb

## Issues Found
- The snapshot archive section was outdated and misleading. It described `snapshot.debian.org` and unofficial Ubuntu snapshot services as the primary snapshot options for Ubuntu packages. Ubuntu now has an official snapshot service at `snapshot.ubuntu.com`. Updated the section to describe the official Ubuntu snapshot service, its date/support limits, and `apt --snapshot` usage.
- The download section implied older Ubuntu package versions are simply archived at packages.ubuntu.com. Adjusted the wording to distinguish package pages and publishing history from exact superseded binaries, and pointed readers to Launchpad history or the Ubuntu snapshot service when the binary is no longer in the regular archive.

## Review Notes
- The APT and dpkg commands are syntactically valid. `apt install package=version`, `apt install -s`, `apt install -f`, `apt-cache policy`, `apt-cache madison`, `apt-cache rdepends`, `dpkg -i`, `apt-mark hold`, and APT preferences pinning were checked against manpages.
- The example nginx archive URL was verified to exist on May 19, 2026.
- Downgrading can reintroduce security vulnerabilities. The post already frames downgrades as temporary; future improvements could add a stronger warning to check the release's current security pocket before keeping an older package installed.
