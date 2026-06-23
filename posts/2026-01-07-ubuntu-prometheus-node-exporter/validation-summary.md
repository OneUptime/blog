# Validation Summary: How to Monitor Ubuntu Servers with Prometheus node_exporter

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation, configuration, and operations walkthrough)

## Technologies Covered
- Prometheus node_exporter (binary install, systemd service, collectors)
- Prometheus (scrape configuration, file-based service discovery, alerting rules, PromQL)
- Prometheus Alertmanager
- systemd (unit files, service management)
- Ubuntu / Linux (useradd, ufw, cron, bash scripting)
- OpenSSL / TLS and basic authentication (exporter-toolkit web config)
- Grafana (dashboard queries)
- Textfile collector custom metrics (backup, SSL cert, service-health scripts)

## Sources Consulted
- node_exporter releases (v1.8.2 is a real, valid release) — https://github.com/prometheus/node_exporter/releases
- systemd.syntax manual (line continuation + comment handling) — https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- systemd.syntax manual, Ubuntu 20.04 (focal) — https://manpages.ubuntu.com/manpages/focal/man7/systemd.syntax.7.html
- systemd issue #10598 (trailing backslash in comment) — https://github.com/systemd/systemd/issues/10598
- node_exporter vmstat collector source (node_vmstat_oom_kill) — https://github.com/prometheus/node_exporter/blob/master/collector/vmstat_linux.go
- node_exporter systemd collector references (node_systemd_unit_state) — https://github.com/prometheus/node_exporter/issues/1411
- Prometheus exporter-toolkit web configuration (TLS / basic_auth_users)
- Prometheus configuration and alerting/PromQL documentation — https://prometheus.io/docs/

## Issues Found
No technical issues found.

The following items were specifically scrutinized and confirmed correct:

- **systemd `ExecStart` with interspersed `#` comments inside a backslash line continuation (Step 3).** This initially looked like a syntax error, but the official systemd.syntax documentation — including the Ubuntu 20.04 (focal) manpage matching this post's target platforms (20.04/22.04/24.04) — states: *"When a comment line or lines follow a line ending with a backslash, the comment block is ignored, so the continued line is concatenated with whatever follows the comment block."* The comment lines here do not themselves end in a backslash, so they do not trigger the known breakage in systemd issue #10598. The config is valid as written.
- **`node_vmstat_oom_kill`** — exposed by the default-enabled vmstat collector (`oom_kill` is part of the default `--collector.vmstat.fields` regex). Valid.
- **`node_systemd_unit_state`** — exposed by the systemd collector, which is explicitly enabled via `--collector.systemd` in Step 3. Valid.
- **`node_procs_zombie`** — provided by the processes collector, enabled via `--collector.processes` in Step 3. Valid.
- **PromQL expressions** — CPU utilization, memory (MemAvailable), disk usage, network rate, load-vs-core count, `predict_linear`, inode usage, file descriptor usage, and clock-skew (`node_time_seconds - time()`) queries are all syntactically and semantically correct.
- **Prometheus `static_configs` YAML** (targets + per-target-group `labels` indentation) follows the canonical Prometheus format and parses correctly.
- **exporter-toolkit web config** — `tls_server_config`, `cert_file`/`key_file`, and `basic_auth_users` with a `$2b$` bcrypt hash are the correct field names/format; `--web.config.file` is the correct flag.
- **Bash helper scripts** — `find -printf '%T@'`, `du -b`, `openssl x509 -noout -enddate`, `date -d`, `systemctl show --property=ActiveEnterTimestamp`, and atomic temp-file `mv` pattern are all correct and appropriate for the textfile collector.

## Review Notes
- The post pins `NODE_EXPORTER_VERSION="1.8.2"`, which is a valid real release. Newer 1.9.x releases exist as of mid-2026, but the post explicitly directs readers to the releases page to "check for latest," so this is not an error — just a version that will naturally age.
- The disk-usage formula `1 - (avail / size)` uses `node_filesystem_avail_bytes` (space available to unprivileged users, which excludes root-reserved blocks). This slightly overstates "usage" versus a `free`-based calculation. This is the conventional, widely-accepted approach for alerting and is not incorrect — worth being aware of when comparing against `df` output.
- `HighSwapUsage` divides by `node_memory_SwapTotal_bytes`; on hosts with no swap this yields NaN and simply never fires, which is acceptable (no false alerts), though adding a `SwapTotal > 0` guard would be a minor future improvement.
- The `topk(5, ... namedprocess_namegroup_cpu_seconds_total ...)` dashboard query is correctly flagged in the post as requiring process-exporter rather than node_exporter.
