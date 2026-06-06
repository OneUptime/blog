# Validation Summary: How to Build a Compliance Evidence Package from OpenTelemetry Data for Auditors

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry
- Prometheus HTTP API and PromQL
- Grafana Tempo HTTP API
- Python `requests`, `datetime`, and JSON handling
- Bash
- Git
- `tar`, `shasum`, and GPG
- SOC 2-style audit evidence packaging

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Local `git log --help` and `git shortlog --help`
- Local `tar --help`, `shasum --help`, and `gpg --help`

## Issues Found
- The monitoring script used `datetime.utcnow()`, which is deprecated in Python 3.12+. Changed it to `datetime.now(timezone.utc)` and kept Prometheus range-query timestamps timezone-aware.
- The monitoring script comment referred to `ALERTS_FOR_STATE` while the query used the `ALERTS` metric. Updated the comment to match the actual query.
- The Tempo incident script passed RFC3339 strings to `/api/search` for `start` and `end`, but the Tempo search API documents those parameters as Unix epoch seconds. Converted the incident timestamps to epoch seconds before calling Tempo.
- The Tempo tag search example used a quoted value for a value without spaces. Updated it to the documented logfmt form `service.name=<value>`.
- The retention script queried `prometheus_tsdb_lowest_timestamp`, but the Prometheus metric is exposed as `prometheus_tsdb_lowest_timestamp_seconds`. Corrected the metric name and removed the erroneous millisecond-to-second conversion.
- The retention script used `datetime.fromtimestamp()` without a timezone and `datetime.utcnow()`. Updated both to timezone-aware UTC handling.
- The retention script computed evidence but did not write it into the evidence directory. Added a JSON export to `prometheus-retention.json` so the package includes the retention evidence it describes.

## Review Notes
All code snippets were syntax-checked after the fixes. The Prometheus, Tempo, Git, checksum, archive, and GPG command usage is consistent with the official documentation or local command help. Future improvements could add HTTP status/error handling around the example API calls, but the current snippets are technically valid for a tutorial.
