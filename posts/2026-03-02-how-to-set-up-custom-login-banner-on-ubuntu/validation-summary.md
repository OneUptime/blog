# Validation Summary: How to Set Up Custom Login Banner on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (system administration)
- OpenSSH (`sshd_config` `Banner` directive)
- agetty / `/etc/issue` escape sequences
- Ubuntu dynamic MOTD (`/etc/update-motd.d/`, `run-parts`)
- PAM (`pam_motd.so`)
- Bash scripting
- Standard Linux utilities: `last`, `lastb`, `uptime`, `free`, `df`, `ip`, `hostname`, `awk`, `tee`, `chmod`, `systemctl`

## Sources Consulted
- `sshd_config(5)` man page (Banner directive: "The contents of the specified file are sent to the remote user before authentication is allowed.")
- `agetty(8)` man page — ISSUE ESCAPES section for `/etc/issue` escape sequences (`\n`, `\r`, `\l`, `\d`, `\t`, `\s`, `\v`)
- `last(1)` and `lastb(1)` (util-linux) help output — verified `-n`, `-R` flags
- `run-parts(8)` documentation — verified script-execution model
- `pam_motd(8)` — verified MOTD is rendered via PAM on login
- Ubuntu Server documentation for `/etc/update-motd.d/` (default scripts: 00-header, 10-help-text, 50-motd-news, 80-esm-announce, 91-contract-ua-esm-status, etc.)

## Issues Found
No technical issues found.

The following items were each verified:
- `Banner /etc/issue.net` in `sshd_config` is correct; file is sent verbatim before authentication, so escape sequences are not processed (correctly noted in the post).
- `sudo systemctl restart ssh` is the correct unit name on Ubuntu (with `sshd.service` aliased).
- agetty escape-sequence table is accurate per `agetty(8)`.
- `chmod -x` on `/etc/update-motd.d/<script>` correctly disables a MOTD component because `run-parts` only executes executable files.
- `ip route get 1.1.1.1 | awk '{print $7; exit}'` correctly extracts the source IP field from typical `ip route get` output (verified: `1.1.1.1 via X dev Y src Z uid N` → `$7` is the source IP).
- `last -n 1 -R $USER` and `lastb -n 5` flags exist and behave as described in current util-linux.
- The note that `lastb` needs root access to `/var/log/btmp` is accurate (file is typically mode 0600 owned by root:utmp or similar).
- `sudo sshd -T | grep banner` works because `sshd -T` emits config keys lowercased.
- The heredoc in `update-login-banner` correctly performs command substitution (`$(hostname -f)`) because the `EOF` delimiter is not quoted.

## Review Notes
- In the `15-login-info` script, `LAST_LOGIN` is captured but never displayed. This is a minor stylistic point, not a technical error, so no change was made.
- The `grep -v "^$\|^btmp\|^$"` pattern contains a duplicate `^$` alternative — harmless and functionally correct.
- The `\s` escape in `/etc/issue` produces `Linux` (from `uname -s`), not `Ubuntu`; the post labels it "OS name", which is consistent with the agetty man page wording.
- Compliance framing (PCI-DSS / HIPAA / SOC 2 "require" a banner) is slightly overstated — these frameworks recommend or strongly imply such notices via related controls — but it is a common operational interpretation and not a code/command correctness issue.
- The default MOTD script list is plausible but non-exhaustive; modern Ubuntu releases (22.04/24.04) ship additional scripts such as `50-landscape-sysinfo`, `90-updates-available`, `91-release-upgrade`, `92-unattended-upgrades`. Not incorrect, just abbreviated for the example.
