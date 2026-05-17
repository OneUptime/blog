# Validation Summary: How to Switch AppArmor Profiles Between Enforce and Complain Mode on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- AppArmor (Linux Security Module)
- Ubuntu (apparmor-utils package)
- `aa-status`, `aa-complain`, `aa-enforce`, `aa-disable`, `aa-genprof`, `aa-logprof`, `aa-notify`, `aa-easyprof`
- `apparmor_parser`
- systemd (`systemctl reload apparmor`)
- `journalctl`, `ausearch`
- AppArmor profile DSL (`flags=(complain)`, `#include <abstractions/base>`, file/network rules)

## Sources Consulted
- apparmor_parser(8) man page — https://manpages.ubuntu.com/manpages/jammy/man8/apparmor_parser.8.html
- aa-notify(8) man page — https://manpages.ubuntu.com/manpages/jammy/man8/aa-notify.8.html
- aa-disable(8) man page — https://manpages.ubuntu.com/manpages/jammy/man8/aa-disable.8.html
- aa-easyprof(8) man page — https://manpages.ubuntu.com/manpages/jammy/man8/aa-easyprof.8.html
- apparmor.d(5) profile syntax reference — https://manpages.ubuntu.com/manpages/xenial/man5/apparmor.d.5.html
- AppArmor upstream source `binutils/aa_status.c` — https://gitlab.com/apparmor/apparmor/-/raw/master/binutils/aa_status.c
- SUSE AppArmor Profile Components and Syntax docs

## Issues Found

1. **`apparmor_parser -p` claimed to be silent on success.** The post used `sudo apparmor_parser -p /etc/apparmor.d/usr.sbin.nginx` with the comment "No output = no errors". `-p` (`--preprocess`) actually flattens includes and prints the resulting profile to stdout, so it always produces output on success. Replaced with `apparmor_parser -Q` (`--skip-kernel-load`), which performs all parsing/validation but skips the kernel load and is silent on success — matching the stated behavior.

2. **`aa-notify -p` comment incorrect.** The post described `-p` as "print events". `-p` is `--poll`, which continuously polls AppArmor logs and shows desktop notifications — not a one-shot summary. Removed `-p` from the example and updated the comment so `aa-notify -s 1 -f /var/log/syslog` is a proper single-shot summary of recent events.

3. **`aa-status` grep regex in the bulk-management script.** The script used `grep -E "^  [^ ]"` (two leading spaces), but `aa-status` indents profile names with three spaces (verified in upstream `aa_status.c`: `dfprintf(outf, "   %s\n", ...)`). The pattern would never match and the script would output nothing useful. Fixed to `^   [^ ]`.

## Review Notes
- The remainder of the post is technically accurate: `aa-complain` / `aa-enforce` / `aa-disable` usage, `apparmor_parser -a/-r/-R` semantics, `flags=(complain)` profile syntax, profile DSL (`#include <abstractions/base>`, file rules, `network inet stream`), the `aa-genprof` → `aa-logprof` workflow, and the disable-via-symlink mechanism all match official documentation.
- `aa-easyprof` is shown as `sudo aa-easyprof /usr/local/bin/myapp` — this writes the template to stdout (default behavior per the man page). The post implicitly expects readers to redirect or copy/paste; this is correct but could be made more explicit with `--output-directory` for users who want a file written directly.
- The `sed -i 's/flags=(complain)//'` example leaves a double space where the flag was (e.g. `app  {`). AppArmor parses this fine, but a cosmetic `s/ flags=(complain)//` would be cleaner. Not a correctness issue.
- The `ausearch -m AVC -ts today | grep apparmor` example assumes `auditd` is installed and AppArmor denials are being routed through the audit subsystem; this is true on most Ubuntu installs but worth noting that on systems without auditd the events live only in the kernel ring buffer / journald.
