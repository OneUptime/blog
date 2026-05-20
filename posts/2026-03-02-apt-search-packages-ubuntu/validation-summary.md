# Validation Summary: How to Use APT to Search for Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT
- apt
- apt-cache
- apt-get
- dpkg and dpkg-query
- apt-file
- aptitude
- Bash pipelines

## Sources Consulted
- Debian apt(8) manual: https://manpages.debian.org/apt.8
- Debian apt-cache(8) manual: https://manpages.debian.org/apt-cache.8
- Debian apt-get(8) manual: https://manpages.debian.org/apt-get.8
- Debian dpkg-query(1) manual: https://manpages.debian.org/unstable/dpkg/dpkg-query.1.en.html
- Debian apt-file(1) manual: https://manpages.debian.org/bookworm/apt-file/apt-file.1.en.html
- Debian aptitude search term reference: https://www.debian.org/doc/manuals/aptitude/ch02s04s05.en.html
- Local Ubuntu man/help output for apt 2.8.3, apt-cache 2.8.3, apt-get, dpkg, and dpkg-query.

## Issues Found
- The command for checking a specific package version used `apt-cache showpkg nginx | grep "^Versions"`, which only matches the `Versions:` header. Changed it to filter `apt-cache policy nginx` for the target version string.
- The installed package list used `dpkg --get-selections | grep install`, which can also match `deinstall`. Changed it to an `awk` field comparison for the exact `install` selection state.
- The `dpkg -s nginx` installed check relied on `dpkg -s` exit status, which can succeed for packages known to dpkg but not currently installed. Added a check for `Status: install ok installed`.
- The package section examples filtered package names or displayed one package's section instead of listing packages by section or available sections. Replaced them with `apt-cache dumpavail` pipelines that inspect `Section:` fields.
- The package count example counted all output lines rather than package result rows. Changed it to count package result lines from `apt search`.
- The aptitude "not-installed" example used `~U`, which means upgradable, not uninstalled. Changed it to `!~i nginx`.
- The documentation package search used `apt search "-doc "`, which is parsed as an option by `apt`. Added `--` before the search term.
- The source-package section implied source records are available without prerequisites and included a binary package search as "all sources." Added the `deb-src` prerequisite note and replaced the incorrect source-search example with `apt-cache showsrc --only-source nginx` plus a binary package search for source-related packages.

## Review Notes
The post is now technically valid. Some commands are best suited for interactive use rather than scripts because `apt(8)` explicitly warns that its CLI can change; the post already uses these examples as command-line workflows rather than automation.
