# Validation Summary: How to Remove Orphaned Packages on Ubuntu with deborphan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (system administration)
- APT (`apt`, `apt-get`, `apt-cache`)
- `deborphan` and its companion `orphaner`
- `dpkg` (package status queries, `--purge`)
- `aptitude` (search patterns)
- Bash scripting

## Sources Consulted
- Debian manpage for `deborphan(1)`: https://manpages.debian.org/bookworm/deborphan/deborphan.1.en.html
- Debian manpage for `orphaner(8)`: https://manpages.debian.org/unstable/deborphan/orphaner.8.en.html
- Debian Wiki on Aptitude: https://wiki.debian.org/Aptitude
- Raphael Hertzog, "Debian Cleanup Tip #2: Get rid of obsolete packages": https://raphaelhertzog.com/2011/02/07/debian-cleanup-tip-2-get-rid-of-obsolete-packages/
- `apt(8)` documented behavior of `--dry-run`, `autoremove`, and `--purge`

## Issues Found

1. **Incorrect `deborphan` flag `--show-keep`.**
   The post used `deborphan --show-keep` to list the keep list. `deborphan` does not document `--show-keep`; the correct option per the man page is `-L, --list-keep`. Changed the command to `deborphan --list-keep`.

2. **Wrong default location for the keep list.**
   The post stated the keep list is "stored in `~/.deborphan` or `/etc/deborphan/keep`". Per the deborphan man page, the default location is `/var/lib/deborphan/keep`. Corrected the statement.

3. **Incorrect `orphaner` interface description and key bindings.**
   The post said `orphaner` is a "curses interface" and that the user should "press 'q' to quit, 'r' to remove marked packages". `orphaner` is actually a dialog/whiptail-based frontend that uses on-screen OK/Cancel/Simulate/Help buttons, navigated with Tab and activated with Enter. Replaced the description and key instructions accordingly.

4. **Contradictory and incorrect `aptitude` search for obsolete packages.**
   The post used `aptitude search '~i !~M !~ahold' | grep "^i A"` to find packages installed but no longer in any repository. This expression is contradictory (`!~M` excludes auto-installed, then `grep "^i A"` selects only auto-installed) and does not actually identify obsolete packages. Replaced it with the canonical `aptitude search '~o'`, which matches packages installed but not present in any configured apt source.

## Review Notes

- `deborphan --all` is accepted by `getopt_long` as an unambiguous abbreviation of the documented `--all-packages` (`-a`) flag and works in practice; left as-is to preserve the author's wording.
- `apt list --installed` output is intentionally human-readable and is not guaranteed stable for scripting (apt prints a warning to stderr about this). The post's shell pipeline using `apt list --installed` already redirects stderr; readers writing scripts may prefer `dpkg-query -W -f='${Package}\n'` for robustness, but the example as written does function.
- The post's iterative-removal loop and "while there are still orphans" pattern is technically sound for `deborphan`'s default (libraries only); using it with `--all-packages` non-interactively would be risky, and the post's caveats already warn against that.
- Default Ubuntu behaviour: since Ubuntu 22.04, `apt remove`/`autoremove` of packages installed via APT will normally also purge configuration files when the package was originally installed; the post's recommendation to follow up with `dpkg -l | grep '^rc'` remains a useful safety net for leftovers from older installs or non-APT removals.
