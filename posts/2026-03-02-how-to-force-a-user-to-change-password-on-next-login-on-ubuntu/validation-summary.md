# Validation Summary: How to Force a User to Change Password on Next Login on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- Linux shadow password suite
- `passwd`
- `chage`
- `/etc/shadow`
- `/etc/login.defs`
- PAM password quality

## Sources Consulted
- Ubuntu Manpage: `passwd(1)` - https://manpages.ubuntu.com/manpages/noble/man1/passwd.1.html
- Ubuntu Manpage: `chage(1)` - https://manpages.ubuntu.com/manpages/noble/man1/chage.1.html
- Ubuntu Manpage: `shadow(5)` - https://manpages.ubuntu.com/manpages/noble/man5/shadow.5.html
- Ubuntu Manpage: `login.defs(5)` - https://manpages.ubuntu.com/manpages/noble/man5/login.defs.5.html
- Local system man pages for `passwd(1)`, `chage(1)`, `shadow(5)`, and `login.defs(5)` from shadow-utils 4.13.

## Issues Found
- The `passwd -S username` example after `passwd -e` showed a recent last-password-change date. Updated it to `01/01/1970`, because expiring a password sets the last-change value to the epoch-style value that indicates a forced change.
- The command for finding users with passwords that never expire only checked for max age `99999`. Updated it to also include an empty max-age field, which `shadow(5)` documents as no maximum password age.
- The command for finding expired passwords grepped `chage -l` output for text that is not part of the documented `chage -l` output and did not actually use `chage` exit codes. Replaced it with an `/etc/shadow` day-count calculation that also treats last-change value `0` as an immediate password-change requirement.

## Review Notes
The remaining commands and configuration examples are consistent with the documented `passwd`, `chage`, `/etc/shadow`, and `/etc/login.defs` behavior on Ubuntu. The SSH and PAM prompt text can vary slightly by Ubuntu release, PAM stack, and login method, but the described forced-change behavior is correct.
