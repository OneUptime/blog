# Validation Summary: How to Find Which Package Provides a Specific File on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- APT
- dpkg and dpkg-query
- apt-file
- apt-cache
- Ubuntu package repositories

## Sources Consulted
- Ubuntu manpage for dpkg-query: https://manpages.ubuntu.com/manpages/resolute/man1/dpkg-query.1.html
- Ubuntu manpage for dpkg: https://manpages.ubuntu.com/manpages/jammy/man1/dpkg.1.html
- Ubuntu manpage for apt-file: https://manpages.ubuntu.com/manpages/jammy/man1/apt-file.1.html
- Ubuntu manpage for apt-cache: https://manpages.ubuntu.com/manpages/resolute/man8/apt-cache.8.html
- Ubuntu Packages Search: https://packages.ubuntu.com/
- Ubuntu package page for dnsutils/bind9-dnsutils: https://packages.ubuntu.com/search?keywords=dnsutils
- Ubuntu package page for libssl3t64: https://packages.ubuntu.com/noble/libs/libssl3t64
- Ubuntu package search results for libpng packages: https://packages.ubuntu.com/libpng
- Ubuntu file list for openssh-server: https://packages.ubuntu.com/noble/amd64/openssh-server/filelist
- Launchpad package page for nginx-common: https://launchpad.net/ubuntu/noble/+package/nginx-common

## Issues Found
- The `apt-file search /usr/bin/dig` example showed `dnsutils` as the package. On current Ubuntu releases, `dnsutils` is transitional or virtual and `dig` is provided by `bind9-dnsutils`, so the example output was updated.
- Several package-output examples used pre-`t64` package names (`libssl3`, `libpng16-16`, and `libreadline8`). These were updated to the current Ubuntu package names (`libssl3t64`, `libpng16-16t64`, and `libreadline8t64`).
- The `apt-cache show nginx | grep -A 5 "Depends"` example was described as showing files a package provides. `apt-cache show` displays package metadata, not file lists, so the comment was corrected.
- The `dpkg -L` section said it was useful before installing a package. `dpkg -L` lists files installed on the current system from an installed package, so the explanation was corrected.
- The nginx configuration ownership example used `nginx`; current Ubuntu packaging places the shared configuration files under `nginx-common`, so the package names in that example were updated.
- The package-integrity example searched for `/usr/bin/sshd`, but Ubuntu installs `sshd` at `/usr/sbin/sshd`; the path was corrected.
- The `dpkg -V` comment mentioned permissions broadly. The dpkg manpage documents file-content digest verification as the current functional check, with limited mode-check behavior, so the comment was narrowed to avoid overstating the verification scope.

## Review Notes
The commands and workflows are otherwise accurate. Some package names and sample outputs can vary across Ubuntu releases and architectures, especially around the `t64` transition, so future updates may need to refresh example output for the target Ubuntu version.
