# Validation Summary: How to Handle Held-Back Packages After an Ubuntu Upgrade

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- APT
- apt, apt-get, apt-cache, apt-mark
- APT preferences and package pinning
- sources.list and sources.list.d repositories
- dpkg
- aptitude

## Sources Consulted
- Local `apt(8)` man page and Debian manpage: https://manpages.debian.org/man/apt.8
- Local `apt-get(8)` man page and Debian manpage: https://manpages.debian.org/man/apt-get.8
- Local `apt-cache(8)` man page
- Local `apt-mark(8)` man page
- Local `apt_preferences(5)` man page and Debian manpage: https://manpages.debian.org/apt_preferences
- Local `sources.list(5)` man page and Debian manpage: https://manpages.debian.org/man/sources.list
- Local `dpkg --help` output for `--configure` and `--list`
- Debian aptitude manual: https://www.debian.org/doc/manuals/aptitude/rn01re01.en.html

## Issues Found
- The post said `apt upgrade` refuses to install new dependencies. Current `apt upgrade` can install new packages when required, but it will not remove installed packages. I updated the explanation to distinguish `apt upgrade` from the stricter `apt-get upgrade`, and pointed readers to `apt full-upgrade` or `apt-get dist-upgrade` for dependency changes involving removals.
- The post used `sudo apt dist-upgrade`. Although this may work as an alias on some systems, `dist-upgrade` is the documented `apt-get` command and `full-upgrade` is the documented `apt` command. I changed the example to `sudo apt-get dist-upgrade` and kept `sudo apt full-upgrade`.
- The `--fix-missing` example was described as automatic dependency resolution. Official `apt-get` documentation describes it as ignoring missing package files, not as a dependency resolver. I replaced that example with refreshing package lists and retrying `apt install`.
- The aptitude section used `sudo aptitude upgrade`, but the current aptitude manual documents `safe-upgrade` and `full-upgrade`. I changed the example to `sudo aptitude safe-upgrade`.
- The package issue listing command `dpkg -l | grep "^[^ii]"` would also match dpkg header lines. I changed it to an `awk` command that skips headers and lists non-`ii` package states.
- The preferences documentation example used shell redirection into `/etc/apt/preferences.d/`, which fails under `sudo` unless the whole shell is root. I changed it to `sudo tee ... >/dev/null`.
- The pin-priority explanation implied any priority above 1000 prefers the installed package. I clarified that this applies when the high priority is on the installed version.

## Review Notes
The guide is technically relevant and current after the corrections. Aptitude was not installed in the local environment, so aptitude commands were verified against the official Debian aptitude manual rather than local `--help` output.
