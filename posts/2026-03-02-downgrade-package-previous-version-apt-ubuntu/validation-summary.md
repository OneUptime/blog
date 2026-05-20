# Validation Summary: How to Downgrade a Package to a Previous Version with APT on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT / apt / apt-get / apt-cache
- dpkg
- apt-mark package holds
- Ubuntu kernels and GRUB
- Launchpad package pages
- PPA purge workflow

## Sources Consulted
- Ubuntu manpage: apt-get - https://manpages.ubuntu.com/manpages/noble/man8/apt-get.8.html
- Ubuntu manpage: apt - https://manpages.ubuntu.com/manpages/noble/man8/apt.8.html
- Ubuntu manpage: apt-cache - https://manpages.ubuntu.com/manpages/noble/man8/apt-cache.8.html
- Ubuntu manpage: apt-mark - https://manpages.ubuntu.com/manpages/noble/man8/apt-mark.8.html
- Ubuntu manpage: apt_preferences - https://manpages.ubuntu.com/manpages/noble/man5/apt_preferences.5.html
- Ubuntu manpage: ppa-purge - https://manpages.ubuntu.com/manpages/focal/man1/ppa-purge.1.html
- Launchpad nginx source package and build pages - https://launchpad.net/ubuntu/+source/nginx/1.18.0-6ubuntu14.4 and https://launchpad.net/ubuntu/+source/nginx/1.18.0-6ubuntu14.4/+build/26344393

## Issues Found
- The description said "pinning" even though the post uses `apt-mark hold`; changed it to "holding packages" to match the actual mechanism.
- The `--allow-downgrades` explanation implied it helps install versions that exist only in the local `.deb` cache. That flag only allows APT to proceed with a downgrade without prompting; changed the explanation accordingly.
- The dependency section recommended `sudo apt install -f nginx=...` as a force flag. `-f` is `--fix-broken`, not a general force-downgrade mechanism; replaced it with an example that installs related nginx packages at matching versions.
- The scripted downgrade heading referenced deprecated `--force-yes`, while the examples correctly used `--allow-downgrades`. Updated the heading.
- The Launchpad `wget` example used a broken direct URL and described Launchpad as package snapshots. Replaced it with guidance to use the Launchpad source/binary package pages and a verified nginx-core binary package page example.
- The documentation example wrote a free-form note under `/etc/apt/preferences.d`, which is reserved for APT preferences fragments with specific parsing rules. Moved the note example to `/var/local/ops-notes/`.

## Review Notes
The remaining examples are broadly correct for Ubuntu systems, but exact nginx package names and available versions depend on the enabled Ubuntu release, pocket, architecture, and whether superseded packages are still available from Launchpad or a configured repository.
