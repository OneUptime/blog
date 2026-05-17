# Validation Summary: How to Use grep and awk Patterns for Log Mining on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GNU grep (and `zgrep`/`zcat` for compressed logs)
- awk (gawk/mawk on Ubuntu)
- Standard Linux/Ubuntu log files (`/var/log/syslog`, `/var/log/auth.log`, `/var/log/kern.log`)
- Nginx combined access log format
- Bash scripting (pipelines, `sort`, `uniq`, `sed`, `xargs`, `tail`)

## Sources Consulted
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU awk user's guide: https://www.gnu.org/software/gawk/manual/gawk.html
- Nginx `log_format` / `combined` documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Linux kernel OOM killer log format (mm/oom_kill.c) — verified against typical `Killed process` log lines
- Empirical testing of patterns against synthetic log lines using the GNU grep 3.11 and mawk 1.3.4 available on this system

## Issues Found

1. **Nginx 5xx/4xx grep patterns were missing a required space.**
   The post originally used `grep '"5[0-9][0-9] '` and `grep '"4[0-9][0-9] '`. In the nginx combined log format the request is quoted (e.g. `"GET / HTTP/1.1"`) and is followed by a *space* before the status code, so the pattern must be `'" 5[0-9][0-9] '` / `'" 4[0-9][0-9] '`. Verified by running both forms against a sample line — the no-space form matched nothing. Fixed and added a short comment explaining why the space is required.

2. **`grep '"500 '` in the "Combining grep and awk" section had the same bug.**
   Changed to `grep '" 500 '` so it actually matches HTTP 500 lines in the standard nginx format.

3. **"Count 5xx errors per minute" snippet was producing per-*hour* counts.**
   The pipeline `awk '{print substr($4, 2, 17)}' | sed 's/:[0-9][0-9]$//'` extracts `DD/Mon/YYYY:HH:MM` (17 chars) and then strips the trailing `:MM`, leaving only the hour. Verified with a sample timestamp `[02/Mar/2026:14:05:23` — output was `02/Mar/2026:14`. Removed the redundant `sed` so the output is per-minute (matching the comment), and added a brief note on what the `substr` slice contains.

4. **OOM-killed process extraction used `$NF`, which returns the wrong field.**
   On modern kernels a "Killed process" line ends with metrics like `oom_score_adj:0`, so `awk '{print $NF}'` outputs that token rather than the process name. Verified against a representative sample line. Replaced with `awk -F'[()]' '{print $2}'`, which reliably extracts the process name from the parenthesized `(name)` segment that all current OOM-kill log formats include.

## Review Notes
- The SSH `Failed password ... awk '{print $11}'` pattern works for valid usernames but shifts by two fields for "invalid user" lines (where the IP ends up at `$13`). Left as-is because the post is illustrative and this caveat is widely understood; a more robust approach would be `grep -oE 'from ([0-9]{1,3}\.){3}[0-9]{1,3}' | awk '{print $2}'`.
- `/var/log/auth.log` and `/var/log/syslog` exist on Ubuntu with rsyslog installed (the default through 24.04 LTS). On systems that have switched fully to `systemd-journald` with no rsyslog, users would need `journalctl` instead — worth mentioning in a future revision.
- `grep -E "..."` being described as "same as egrep" is accurate, but `egrep` has been deprecated since GNU grep 3.7 (2022) and prints a warning. The post already promotes `-E`, which is the right call.
- The "Parse JSON log lines" awk one-liner is fragile by design (the post acknowledges `jq` is preferable). Acceptable as a quick-and-dirty example.
- The script section uses `ls | xargs` which can break on filenames with spaces; nginx rotated log filenames don't contain spaces in practice, so this is fine in context.
