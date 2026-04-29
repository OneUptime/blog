# Validation Summary: How to Monitor NTP Synchronization over IPv6

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- chrony / chronyc (NTP client/server)
- timedatectl (systemd time utility)
- SuperQ/chrony_exporter (Prometheus exporter)
- Prometheus (metrics, alerting rules, PromQL)
- Grafana (dashboards)
- systemd (service unit)
- Bash (shell script)
- IPv6 (address literals in URLs and Prometheus targets)

## Sources Consulted
- chrony_exporter source — tracking metrics: https://raw.githubusercontent.com/SuperQ/chrony_exporter/main/collector/tracking.go
- chrony_exporter source — sources metrics: https://raw.githubusercontent.com/SuperQ/chrony_exporter/main/collector/sources.go
- chrony_exporter releases (latest v0.13.3, 2026-03-01): https://github.com/SuperQ/chrony_exporter/releases
- chrony documentation for `chronyc tracking` and `chronyc sources` output
- Prometheus configuration docs (scrape_configs, alerting rules, IPv6 target syntax)

## Issues Found
1. **Incorrect chrony_exporter download URL and tarball layout.** The post used `https://github.com/SuperQ/chrony_exporter/releases/latest/download/chrony_exporter_linux_amd64.tar.gz`, but the actual asset name follows the pattern `chrony_exporter-<version>.linux-amd64.tar.gz` (e.g., `chrony_exporter-0.13.3.linux-amd64.tar.gz`), and extraction creates a versioned directory containing the binary. Updated the install snippet to use a versioned URL and to move the binary out of the extracted directory.
2. **Wrong frequency metric name.** The post referred to `chrony_tracking_frequency_error_ppm`, which does not exist in chrony_exporter. The correct metric is `chrony_tracking_frequency_ppms`. Replaced both occurrences (Key Metrics section and Grafana queries section).
3. **Wrong source-reachability metric subsystem name.** The post used `chrony_source_reachability_ratio` (singular `source`), but the exporter uses the `sources` subsystem, so the actual metric is `chrony_sources_reachability_ratio`. Replaced all four occurrences (Key Metrics, the `count(...)` example, the `NTPSourceUnreachable` alert, and the Grafana `avg_over_time` query).

## Review Notes
- `chrony_tracking_reference_timestamp_seconds` is a real metric in chrony_exporter, but the alerting expression `chrony_tracking_reference_timestamp_seconds == 0` is a heuristic that depends on whether the exporter actually emits 0 when chrony has never synchronized; in normal operation this metric represents the Unix-epoch timestamp of the last update, so an alternate approach (e.g., `time() - chrony_tracking_reference_timestamp_seconds > <threshold>`) would more reliably detect a stalled clock. Left as-is since the original expression is not strictly wrong, only fragile.
- The `chronyc sources -v` status-symbol legend in the post lists `*`, `+`, `-`, `?` but omits `x` (falseticker) and `~` (jittery source), which chrony also emits. Not a correctness issue, just incomplete.
- The shell script's `synced=$(timedatectl | grep "synchronized: yes" && echo "yes" || echo "no")` will assign both the matched `grep` line and the literal `yes` to `synced` when synchronized; the logging line will still be readable but is slightly noisy. Left as-is since no factual claim is wrong.
- Versions: chrony_exporter v0.13.3 was the latest at review time (released 2026-03-01).
