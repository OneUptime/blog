# Validation Summary: How to Set Password Policies and Expiration Rules on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (system administration)
- `chage` (shadow-utils) for password aging
- `/etc/login.defs` and `/etc/default/useradd` (account defaults)
- PAM (Pluggable Authentication Modules)
- `pam_pwquality` / `libpam-pwquality` (password complexity)
- `pam_unix.so` (Unix authentication, `remember=` history)
- `pam_faillock` / `pam_tally2` (account lockout)
- `passwd`, `faillock` CLI tools

## Sources Consulted
- `login.defs(5)` man page (shadow-utils) — https://man7.org/linux/man-pages/man5/login.defs.5.html
- `chage(1)` man page — https://man7.org/linux/man-pages/man1/chage.1.html (and `chage --help` on a current Ubuntu system)
- `pwquality.conf(5)` man page — https://man7.org/linux/man-pages/man5/pwquality.conf.5.html
- `pam_unix(8)` man page — https://man7.org/linux/man-pages/man8/pam_unix.8.html
- `pam_pwquality(8)` man page — https://man7.org/linux/man-pages/man8/pam_pwquality.8.html
- `pam_faillock(8)` and `faillock.conf(5)` man pages
- `passwd(1)` man page (shadow-utils)
- Ubuntu package versions for `libpam-modules` (PAM 1.3.x on 20.04, 1.4.x on 22.04, 1.5.x on 24.04)

## Issues Found

1. **`INACTIVE` listed under `/etc/login.defs`.** `INACTIVE` is not a valid variable in `/etc/login.defs` (it does not appear in `login.defs(5)`). The default inactivity period for new accounts is stored in `/etc/default/useradd` and configured via `useradd -D -f N`. Removed the `INACTIVE` line from the login.defs snippet and added a small block showing the correct location.

2. **`PASS_MIN_LEN` shown as enforceable.** `PASS_MIN_LEN` is obsolete in current shadow-utils and is no longer honored — password length is enforced by PAM (`pam_pwquality`). Removed it from the login.defs snippet and added a clarifying note.

3. **`remember = 12` placed in `/etc/security/pwquality.conf`.** `remember` is NOT a `pwquality.conf` option — it is a `pam_unix.so` module argument. The post's own later section adds it correctly to `pam_unix.so`, so the duplicate (incorrect) placement was removed and replaced with a pointer to the next section.

4. **`enforce_for_root` comment had the polarity reversed.** Original comment read "0 = enforce, 1 = exempt root". Per `pwquality.conf(5)`, the option is off by default and setting it (to 1) enables enforcement for root. Corrected the comment.

5. **`pam_faillock` availability misstated.** Original said "Ubuntu 20.04+ uses faillock". `pam_faillock` was introduced in Linux-PAM 1.4.0; Ubuntu 20.04 ships PAM 1.3.1 (still uses `pam_tally2`), while Ubuntu 22.04 was the first LTS to ship PAM 1.4 with `pam_faillock`. Corrected to "Ubuntu 22.04+".

6. **`chage --list --all` does not exist.** `chage(1)` has no `--all` flag — only single-user operation is supported. Replaced with a working `passwd -S -a | awk '...'` pipeline that filters by password status, and tightened the per-user expiration script (use `cut`/`xargs` so the date isn't reduced to just the year, and exclude `nobody`).

## Review Notes
- The `pam_pwquality` line shown for `/etc/pam.d/common-password` (`password requisite pam_pwquality.so retry=3`) reflects Ubuntu's `pam-auth-update`-generated configuration; depending on Ubuntu version, this file is auto-generated and direct edits may be overwritten by `pam-auth-update`. Readers running automated config management on PAM should be aware of this.
- The `yescrypt` hashing scheme is the default on Ubuntu 22.04+; on older Ubuntu the default was `sha512`. The post's example line uses `yescrypt`, which is correct for current LTS releases but would need adjusting on 20.04 and earlier.
- `enforce_for_root` only affects the `pam_pwquality.so` module specifically; root using `chpasswd` or directly editing `/etc/shadow` is not constrained.
- The `apply-password-policy.sh` script does not skip already-locked or service accounts beyond filtering UID >= 1000 and `nobody`; on real systems with non-human UIDs >= 1000 (e.g. `systemd-coredump`, container users), additional filtering may be warranted.
