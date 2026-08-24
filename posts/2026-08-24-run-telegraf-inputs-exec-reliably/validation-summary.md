# Validation Summary: Run Telegraf `inputs.exec` Reliably with Parser-Safe Output

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Telegraf `inputs.exec`, `inputs.execd`, and `inputs.internal`
- Telegraf TOML configuration
- POSIX shell scripting
- InfluxDB line protocol
- Linux service execution, systemd, and `sudo`

## Sources Consulted

- [Telegraf Exec input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/exec/)
- [Common Telegraf plugin options](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/)
- [Telegraf 1.39.0 release notes](https://github.com/influxdata/telegraf/releases/tag/v1.39.0)
- [Telegraf 1.39.3 release](https://github.com/influxdata/telegraf/releases/tag/v1.39.3)
- [Telegraf 1.39.3 Exec implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/exec/exec.go)
- [Telegraf 1.39.3 Unix Exec runner](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/exec/run_notwindows.go)
- [Telegraf 1.39.3 Unix timeout implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/internal/exec_unix.go)
- [Telegraf Internal input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/internal/)
- [Telegraf 1.39.3 input scheduling implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/agent/agent.go)
- [Telegraf InfluxDB line protocol input format](https://docs.influxdata.com/telegraf/v1/data_formats/input/influx/)
- [Telegraf 1.39.3 line protocol parser grammar](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/parsers/influx/machine.go.rl)
- [InfluxDB line protocol reference](https://docs.influxdata.com/influxdb/v1/write_protocols/line_protocol_reference/)
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/)
- [Run Telegraf as a service](https://docs.influxdata.com/telegraf/v1/administer/run-as-service/)
- [Telegraf 1.39.3 systemd unit](https://github.com/influxdata/telegraf/blob/v1.39.3/scripts/telegraf.service)
- [Telegraf Execd input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/execd/)
- [POSIX locale environment-variable precedence](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap08.html)

## Issues Found

- The argument-array syntax was described as merely current, without its minimum version. Clarified that nested executable-and-argument arrays require Telegraf 1.39.0 or later. Also narrowed the shell wildcard claim because `inputs.exec` itself expands globs in the executable path; argument wildcards and other shell expansions still require an explicitly invoked shell.
- The line-protocol discussion incorrectly said a blank record could cause parsing to fail. Telegraf's Influx parser ignores blank and whitespace-only lines, so the claim was corrected. The sample's digit-only validation also allowed leading-zero representations rejected by Telegraf's integer grammar and values above the signed 64-bit limit. Added normalization and a POSIX-portable decimal range check so the script emits parser-safe integer fields.
- The stderr description implied unconditional line-by-line relaying. Clarified that prefix-aware `log_stderr` handling occurs when a run proceeds to parsing; for ordinary formats, that means a successful run or an error allowed through by `ignore_error`. With the default error policy, retained stderr is included in the input error instead. Also documented the Nagios exception, current non-debug truncation behavior, and the required space after a severity prefix.
- The timeout was presented as a strict process boundary. Clarified that, on Unix, expiry initiates `SIGTERM`, followed by up to five seconds of grace before `SIGKILL`, and that a clean response to `SIGTERM` is treated as success. Added an explicit 15-second input interval so the sample's 5-second timeout plus termination grace remains below its schedule. Corrected the monitoring advice because `internal_gather.gather_timeouts` counts gathers exceeding the scheduling interval, while an `inputs.exec.timeout` failure is reflected as a logged plugin error in `internal_gather.errors`.
- The `ignore_error` explanation covered only non-zero exits. The implementation bypasses the run-error check for other execution failures as well, including timeouts, so it can parse captured partial stdout in those cases. Clarified this behavior and documented the Nagios parser's deliberate exit-status exception.
- The environment section implied that `environment` creates a minimal replacement environment. Telegraf actually augments the inherited service environment and overrides duplicate keys. Renamed the section, explained the inheritance behavior, and changed `LANG=C` to `LC_ALL=C` so inherited category-specific locale variables cannot override the intended locale.

## Review Notes

- The review targeted Telegraf 1.39.3, the current release on 2026-08-24. Legacy string commands are deprecated as of 1.39.0 and scheduled for removal in 1.45.0; the post already uses the replacement argv-array syntax.
- The shell snippet passed POSIX `/bin/sh` syntax validation and representative tests for normal, leading-zero, zero, maximum signed 64-bit, overflow, and non-numeric input.
- The documented `telegraf --config ... --test` invocation is valid. If the deployed service uses files in `/etc/telegraf/telegraf.d`, add `--config-directory /etc/telegraf/telegraf.d` to mirror the packaged systemd unit fully.
- All external documentation links in the post resolved to the intended official pages during review.
