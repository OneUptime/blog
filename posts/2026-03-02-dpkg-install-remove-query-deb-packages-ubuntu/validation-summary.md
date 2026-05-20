# Validation Summary: How to Use dpkg to Install, Remove, and Query .deb Packages on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Debian package management
- dpkg
- dpkg-query
- dpkg-deb
- apt and apt-get
- Bash shell commands

## Sources Consulted
- Debian dpkg(1) manpage: https://manpages.debian.org/dpkg.1
- Debian dpkg-query(1) manpage: https://manpages.debian.org/dpkg-query
- Debian dpkg-deb(1) manpage: https://manpages.debian.org/dpkg-deb
- Debian apt-get(8) manpage: https://manpages.debian.org/apt-get.8
- Local manpages for dpkg 1.22.6, dpkg-query 1.22.6, dpkg-deb 1.22.6, and apt 2.8.3

## Issues Found
- `dpkg -s` was described as showing installed files. Corrected the comment because `dpkg -s` displays the package status database entry, while installed files are listed with `dpkg -L`.
- The `dpkg -V` flag explanation included timestamp changes. Corrected it to match the current dpkg rpm-format verification output, where `5` indicates digest/content changes, `M` indicates a file mode check failure, and unsupported or unavailable checks are shown as `?`.
- The package selection example used `sudo dpkg --configure -a` to apply selections. Corrected it to `sudo apt-get dselect-upgrade`, because `dpkg --set-selections` only sets selection states and another frontend must realize those selections.
- The broken-state filter `dpkg -l | grep -E "^[^ii]"` did not correctly identify non-`ii` package states. Replaced it with an `awk` filter that skips the header and prints packages whose status field is not `ii`.
- The comments for `iF` and `iH` states were reversed. Corrected `iF` to half-configured and `iH` to half-installed.

## Review Notes
The tutorial is broadly accurate after these corrections. The `dpkg -l` output is intended for human reading rather than stable machine parsing; scripts should prefer `dpkg-query -W` with an explicit format, as the post later demonstrates.
