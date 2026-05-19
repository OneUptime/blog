# Validation Summary: How to Automate Daily Reports with Bash on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Bash scripting
- Cron
- systemd and journalctl
- GNU coreutils and procps tools
- APT package management
- Postfix
- GNU Mailutils

## Sources Consulted
- GNU Bash Reference Manual, Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- GNU Bash built-in help for `set`, `read`, and `pipefail` behavior
- GNU Coreutils `df` documentation: https://www.gnu.org/software/coreutils/df
- procps `ps` help output for `--sort`
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd `systemctl` manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Debian `apt-get(8)` manual: https://manpages.debian.org/bookworm/apt/apt-get.8.en.html
- Postfix configuration parameters: https://www.postfix.org/postconf.5.html
- Postfix TLS documentation: https://www.postfix.org/TLS_README.html
- GNU Mailutils `mail` documentation: https://mailutils.org/manual/html_section/mail.html

## Issues Found
- Several report sections appended output inside pipeline-fed `while` loops. In Bash, commands in multi-command pipelines run in subshells, so updates to the `REPORT` variable would not persist. Replaced those loops with process substitution or captured command output before appending.
- The top CPU and memory consumer commands printed to stdout instead of being appended to the report body. Changed them to append their formatted output.
- The disk warning string used a literal `\n`, so warnings would contain backslash-n text instead of line breaks. Changed it to append a real newline.
- Zero-match `grep -c` commands could produce problematic behavior under `set -euo pipefail`, including duplicated `0` output in some command substitutions. Changed those cases to preserve the single `grep -c` count while allowing zero matches.
- The sudo activity function was defined but never called in the main report sequence. Added it to the report execution list.
- `hostname -f` can fail on systems without a resolvable fully qualified hostname, which would stop the script under `set -e`. Added a fallback to `hostname`.
- The Postfix relay example used `smtp_use_tls = yes`, an older TLS setting. Replaced it with the current `smtp_tls_security_level = encrypt` setting for mandatory TLS to the relay.

## Review Notes
The corrected script examples are syntactically valid under Bash. The update counting approach uses `apt-get -s upgrade` and detects simulated `Inst` lines, which is appropriate for a lightweight report but depends on current package indexes; a real deployment should run `apt-get update` through its normal patch-management workflow before relying on those counts.
