# Validation Summary: How to Resolve 'Unmet Dependencies' Errors in APT on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- APT (Advanced Package Tool) — `apt`, `apt-get`, `apt-cache`, `apt-mark`
- dpkg
- aptitude
- ppa-purge
- Ubuntu repository management (sources.list, PPAs, APT pinning)
- Virtual packages and Multi-Arch

## Sources Consulted
- `apt-get(8)` man page — verified `-f/--fix-broken`, `--dry-run/--simulate/--no-act` flags
- `dpkg(1)` man page — verified `--configure -a`, `--force-remove-reinstreq`, `--force-depends`, `--dry-run` options
- `apt-mark(8)` — verified `hold`, `unhold`, `showhold` subcommands
- `apt_preferences(5)` — verified pin priority semantics (100 ≤ P < 500 behavior)
- `apt-cache(8)` — verified `policy`, `showpkg`, `search --names-only` behavior
- Ubuntu packaging documentation (help.ubuntu.com) — confirmed `ppa-purge` usage and multi-arch behavior with `dpkg --print-architecture` / `--print-foreign-architectures`

## Issues Found
No technical issues found. All commands, flags, and explanations were verified against the actual tool man pages on a current Ubuntu/APT 2.8 system:

- The `-f install` / `--fix-broken install` equivalence is correct.
- `dpkg --configure -a --dry-run` is a valid combination (dpkg supports `--dry-run` as documented).
- The `apt-cache policy` output example correctly shows the conventional priority 500 (regular archive) and 100 (/var/lib/dpkg/status, the installed-package source).
- The version-pinning preferences file syntax (`Pin: release o=...`, `Pin-Priority: 100`) is correct per `apt_preferences(5)`.
- `apt-mark hold/unhold/showhold` subcommands and `ppa-purge ppa:owner/name` syntax are accurate.
- Multi-arch commands (`dpkg --print-architecture`, `--print-foreign-architectures`, `apt install pkg:amd64`) are correct.
- Force-removal/install dpkg flags and the recommended follow-up `apt-get install -f` are correctly described.

## Review Notes
- The `grep -r "^deb " /etc/apt/sources.list /etc/apt/sources.list.d/` command only finds legacy one-line format repositories. Modern Ubuntu (24.04+) also supports DEB822-format `.sources` files in `/etc/apt/sources.list.d/`, which this grep will miss. Not strictly wrong since the post doesn't claim to be exhaustive, but worth noting for completeness.
- The "Or" alternative `apt-cache search --names-only virtual-package | head` to find providers of a virtual package is the weakest part of the post — for true virtual-package provider discovery, the `Reverse Provides:` section of `apt-cache showpkg` is the authoritative source. The `search` command will only match if "virtual-package" appears in package names, not in `Provides:` declarations. Still useful as a related discovery technique, not technically incorrect.
- The claim that "A priority of 100 means APT only installs from that repo when explicitly asked to" is operationally accurate when official repos sit at priority 500 (the default), though the strict `apt_preferences(5)` definition is more nuanced ("unless there is a version available belonging to some other distribution or the installed version is more recent"). The practical effect described in the post is correct.
- Version strings like `2.0-1ubuntu1` and `1.0-1` are illustrative placeholders, which is appropriate for a generic troubleshooting guide.
