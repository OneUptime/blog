# Validation Summary: How to Configure Prometheus Pushgateway to Listen on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus Pushgateway
- Prometheus scrape configuration
- Linux `systemd`
- Bash shell scripting
- Linux networking tools (`ss`, `curl`)

## Sources Consulted
- Pushgateway official README and API reference — https://github.com/prometheus/pushgateway
- Prometheus official documentation: Pushing metrics — https://prometheus.io/docs/instrumenting/pushing/
- Prometheus official documentation: When to use the Pushgateway — https://prometheus.io/docs/practices/pushing/
- Prometheus official documentation: Configuration (`honor_labels`) — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Pushgateway official releases page — https://github.com/prometheus/pushgateway/releases

## Issues Found
1. **Broken release download URL**: The post used `https://github.com/prometheus/pushgateway/releases/latest/download/pushgateway-*.linux-amd64.tar.gz`, but GitHub does not expand shell wildcards in remote asset names, so that URL resolves to a `404`. **Fix:** Replaced it with an explicit versioned release URL for Pushgateway `1.11.2`, which was the latest release on April 24, 2026.
2. **Incorrect success metric behavior on failed runs**: The shell script always updated `backup_last_success_timestamp`, even when the backup command failed. That would incorrectly record a failed run as a successful backup time. **Fix:** Changed the script to emit `backup_last_success_timestamp` only when the backup exits with status `0`. Because the example uses Pushgateway's `POST` behavior via `curl --data-binary`, omitting that metric on failure preserves the previous successful timestamp for the same group.
3. **Overstated Query API description**: The `/api/v1/metrics` comment described the output as job+instance combinations. Pushgateway metric groups are identified by a grouping key containing `job` plus zero or more additional labels. **Fix:** Updated the description to "pushed metric groups in JSON format."
4. **Incorrect delete semantics**: The post said deleting `/metrics/job/backup_job` deletes all metrics for a job. Official Pushgateway documentation notes that deleting a job-only group does **not** delete groups with additional labels such as `instance`. **Fix:** Corrected the comment to reflect the actual API behavior.
5. **Non-portable browser command**: The post used `open http://...`, which is a macOS command and is not appropriate in a Linux/systemd-focused guide. **Fix:** Replaced it with a neutral instruction to open the URL in a browser.
6. **Misleading stale-metrics guidance**: The original takeaway said to delete pushed metrics after the job completes. Pushgateway retains metrics until they are deleted or overwritten, and deleting immediately after completion can cause Prometheus to miss them before a scrape. **Fix:** Reworded the guidance to emphasize explicit lifecycle management and aligned the use-case guidance with Prometheus documentation by noting that machine-level cron jobs are better served by the Node Exporter textfile collector.

## Review Notes
- The post now pins Pushgateway `1.11.2` in the installation example. That was current as of April 24, 2026, but the version should be refreshed in a future review if the article is meant to track the latest release.
- The example still demonstrates an `instance` grouping label. This is supported by the Pushgateway API and official README examples, but Prometheus documentation recommends avoiding machine-specific Pushgateway metrics unless you are intentionally managing their lifecycle.
