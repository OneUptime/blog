# Validation Summary: How to Export journald Logs to JSON for External Analysis on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- systemd journal and `journalctl`
- JSON and newline-delimited JSON
- Python `json` and `csv`
- `jq`
- Elasticsearch Bulk API
- cron
- GNU/Linux shell utilities

## Sources Consulted
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journal fields manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.journal-fields.html
- Red Hat Enterprise Linux 9 logging documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_troubleshooting-problems-using-log-files_configuring-basic-system-settings
- Python `json` module documentation: https://docs.python.org/3/library/json.html
- Python `csv` module documentation: https://docs.python.org/3/library/csv.html
- jq manual: https://jqlang.github.io/jq/manual/
- Elasticsearch Bulk API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk

## Issues Found
- The `journalctl -o json -n 3 --no-pager` example showed only two JSON records. Changed the command to `-n 2` so the command and displayed output agree.
- The comment for `journalctl -p err` said it exported all error-level logs. A single `--priority=err` includes `err` and more important severities, according to the `journalctl` manual. Changed the comment to "error and higher-priority logs".
- The authentication export used `journalctl -u sshd -u sudo`, but `sudo` is normally a syslog identifier rather than a systemd unit. Changed the example to `journalctl -t sshd -t sudo`, which uses the documented `--identifier` filter and combines repeated identifiers as alternatives.

## Review Notes
The remaining commands and examples are technically valid for RHEL 9/systemd journald workflows. `journalctl -o json` emits newline-separated JSON objects, while `json-pretty` is intended for human-readable multi-line output. Journal JSON fields are generally strings, but very large, duplicate, or binary fields can be represented as `null` or arrays; future hardening of the Python examples could account for those edge cases if the scripts are promoted from examples to production tooling.
