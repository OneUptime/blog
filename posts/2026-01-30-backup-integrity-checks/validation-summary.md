# Validation Summary: How to Implement Backup Integrity Checks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Bash shell scripting
- GNU tar, gzip, find, and coreutils checksum utilities
- Python 3 standard library: hashlib, pathlib, json, datetime, smtplib, subprocess, tempfile
- Flask webhook handling
- Kubernetes CronJob
- Prometheus, PromQL, PrometheusRule, and Alertmanager webhooks
- Slack incoming webhooks
- PagerDuty Events API v2

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- GNU Coreutils sha2 utilities manual: https://www.gnu.org/s/coreutils/manual/html_node/sha2-utilities.html
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- GNU findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator PrometheusRule API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Flask quickstart and API documentation: https://flask.palletsprojects.com/en/stable/quickstart/ and https://flask.palletsprojects.com/en/stable/api/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/send-alert-event

## Issues Found
- The main `backup_integrity.py` example used `Path.with_suffix('.manifest.json')`, which would turn `backup.tar.gz` into `backup.tar.manifest.json`. Later examples expect `backup.tar.gz.manifest.json`, so the manifest path was corrected to append `.manifest.json` to the current suffix.
- Python examples used `datetime.utcnow()`, which is deprecated in current Python documentation and returns naive UTC datetimes. These calls were changed to `datetime.now(timezone.utc).isoformat()`.
- The deep verification shell loop used command substitution around `find`, which breaks on paths containing whitespace and had loose `find` expression precedence. It now uses `find ... -type f \( ... \) -print0` with a NUL-delimited read loop.
- The SQL dump validation comment implied a universal SQL completion marker. It now accurately describes the check as a common MySQL dump completion marker.
- The block-level verifier did not detect appended data if all recorded blocks still matched. It now verifies file size and overall file hash before returning success.
- The tiered verifier's weekly check called `random.sample()` with a sample size of 1 even when no backups existed. It now returns cleanly when the backup list is empty.
- The Prometheus counter alerts compared cumulative counters directly, which could keep alerts firing after historical failures. They now use `increase(...[window])` over recent ranges.

## Review Notes
The examples are technically valid after correction, but they remain illustrative. Production systems should add stronger error handling around missing manifest keys, failed HTTP alert delivery, SMTP TLS/auth variants, and filesystem permission failures.
