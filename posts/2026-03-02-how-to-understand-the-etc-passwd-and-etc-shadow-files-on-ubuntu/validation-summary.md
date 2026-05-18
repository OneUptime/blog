# Validation Summary: How to Understand the /etc/passwd and /etc/shadow Files on Ubuntu

## Status
validated

## Post Type
Reference / Tutorial — explains the structure, fields, and administration of two core Linux authentication files.

## Technologies Covered
- Ubuntu (22.04+ specifically referenced for yescrypt)
- `/etc/passwd` file format
- `/etc/shadow` file format
- `/etc/group` and `/etc/gshadow` (briefly)
- Password hash algorithms: MD5, SHA-256, SHA-512, yescrypt
- User/group management tools: `useradd`, `usermod`, `adduser`, `chfn`, `chsh`, `chage`, `vipw`, `pwck`, `grpck`, `passwd`
- Lookup tools: `getent`, `cut`, `awk`, `grep`

## Sources Consulted
- shadow(5) man page (Ubuntu) — verified 9-field format and special password field values
- passwd(5) man page — verified 7-field format
- crypt(5) man page — verified hash prefix IDs ($1$ MD5, $5$ SHA-256, $6$ SHA-512, $y$ yescrypt)
- Ubuntu `/etc/login.defs` — verified UID conventions (UID_MIN=1000, SYS_UID_MIN=100, SYS_UID_MAX=999)
- Live verification of file permissions on Ubuntu (`/etc/passwd` 644, `/etc/shadow` 640 root:shadow)
- Tool availability check (`which`) for all referenced commands
- Ubuntu 22.04 release notes — yescrypt became the default password hashing method via pam_unix

## Issues Found
No technical issues found. The post is accurate:
- File format descriptions (7 fields for passwd, 9 fields for shadow) match the shadow(5) and passwd(5) man pages.
- Permission claims (644 for passwd, 640 for shadow owned by root:shadow) match Ubuntu defaults.
- All referenced commands exist on standard Ubuntu installs.
- The yescrypt `$y$` default for Ubuntu 22.04+ is correct (handled via PAM's pam_unix module).
- The GECOS historical etymology ("General Electric Comprehensive Operating System") is correct.
- The awk command using `!system("test -d "$6)` correctly inverts the exit-status semantics (system returns 0 on success, so `!system(...)` is truthy when the directory exists).
- The `vipw` / `vipw -s` recommendation for safe editing is the standard advice.

## Review Notes
- The UID convention "1000-65533: regular user accounts" reflects the historical 16-bit ceiling rather than Ubuntu's default `UID_MAX=60000` from `/etc/login.defs`. This is acceptable framing because UIDs above 60000 are still valid kernel-side, and the post explicitly says "conventions" rather than enforced limits.
- The `cut -d$ -f2` idiom works in bash because `$` followed by whitespace is a literal, but quoting (`cut -d'$' -f2`) would be more portable. Not a correctness issue.
- The note about `!!` indicating "password never set" is the long-standing convention documented in shadow(5); on Ubuntu, fresh `useradd` (without `-p`) typically writes `!` (single bang). Both forms function as "locked / no usable password," so the security checks remain meaningful, but readers may see `!` more often than `!!` in practice on Ubuntu.
- The `grep "nologin\|false" /etc/passwd` pattern matches anywhere on a line, not just the shell field. In a personal/typical system this is fine, but on systems where a username or GECOS field could contain those substrings it would over-match. Not a correctness issue for the use case shown.
- The `cut -d$ -f2 | cut -d$ -f2` pipeline to extract the hash ID does not account for yescrypt's full `$y$<params>$<salt>$<hash>` structure beyond the ID character, but the comment in the post only claims to identify the algorithm letter/digit, which it does correctly.
