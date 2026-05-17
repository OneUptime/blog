# Validation Summary: How to Use the tee Command for Output Redirection on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GNU coreutils `tee` command
- Bash shell (process substitution, `PIPESTATUS`, `set -o pipefail`, heredocs, `exec` redirection)
- Ubuntu / Linux system administration (sysctl, nginx config, `/etc/hosts`)
- Common Linux utilities used in examples: `grep`, `awk`, `sort`, `uniq`, `wc`, `vmstat`, `df`, `free`, `uptime`, `apt-get`, `systemctl`, `make`

## Sources Consulted
- `man tee` (GNU coreutils) — verified flags `-a`/`--append`, behavior of stdin/stdout/file writes
- GNU coreutils manual: https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html
- Bash Reference Manual — Process Substitution: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
- Bash Reference Manual — `PIPESTATUS` and `pipefail`: https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html and https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html
- Linux kernel sysctl documentation for `net.ipv4.tcp_syncookies`
- nginx documentation for `/etc/nginx/conf.d/` include behavior
- `vmstat` man page — verified `vmstat 5 12` semantics (12 samples at 5-second intervals = 60s)

## Issues Found
No technical issues found.

All verified items:
- `tee` description (reads stdin, writes to stdout and one or more files) — correct.
- `-a` for append, default is overwrite — correct.
- Multiple file argument support — correct.
- The `sudo echo ... > /etc/file` failure explanation (shell opens the redirection target as the invoking user before `sudo` runs) — correct.
- `echo ... | sudo tee /etc/file` and `sudo tee -a` patterns — correct.
- `exec > >(tee -a "$LOG_FILE") 2>&1` Bash process-substitution pattern — correct (Bash-only, and the script declares `#!/bin/bash`).
- `${PIPESTATUS[0]}` capturing the exit status of the first command in a pipeline (e.g., `make` in `make | tee`) — correct.
- `set -o pipefail` causing the pipeline to return a non-zero status if any command (including `tee`) fails — correct.
- `vmstat 5 12` produces a 60-second sample (12 × 5s) — correct.
- `grep -E " [45][0-9]{2} "` matches HTTP 4xx/5xx status codes in nginx access logs — correct.
- Heredoc with `cat << 'EOF' | sudo tee ...` — correct syntax; quoting `'EOF'` disables expansion which is appropriate for literal config content.
- nginx `client_max_body_size`, `gzip on`, and `gzip_types` directives are valid.
- `/etc/sysctl.d/99-security.conf` is a valid drop-in path for sysctl on Ubuntu.

## Review Notes
- The `exec > >(tee -a "$LOG_FILE") 2>&1` pattern has a well-known subtlety: when the script exits, the parent shell may return before the backgrounded `tee` process finishes writing/flushing, which can occasionally result in the final lines appearing after the prompt or being interleaved oddly in interactive use. Not incorrect in the post, but worth noting if readers see odd output ordering.
- The post uses `cat /var/log/nginx/access.log | grep ...` (a useless use of `cat`). This is stylistic, not technically wrong — left as-is per the instruction to not make stylistic changes.
- `vmstat 5 12` will print 13 lines of stats output (one initial "since boot" line plus 12 interval samples). Total elapsed sampling time is 60 seconds as the post states; not an error.
- `set -o pipefail` is a Bash/Ksh/Zsh feature, not POSIX. All examples use `#!/bin/bash`, so this is fine in context.
