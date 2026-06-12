# Validation Summary: How to Build Backup Verification Testing

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Python 3
- Python hashlib and datetime modules
- psycopg2 / PostgreSQL
- Bash
- jq and sha256sum
- Kubernetes CronJob and Job configuration
- Prometheus alerting rules
- Prometheus Operator PrometheusRule custom resource
- kube-state-metrics

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python 3.12 release notes / deprecations: https://docs.python.org/3/whatsnew/3.12.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- psycopg2 SQL composition documentation: https://www.psycopg.org/docs/sql.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator PrometheusRule CRD reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml

## Issues Found
- Replaced `datetime.utcnow()` and naive `datetime.fromtimestamp()` usage with timezone-aware UTC calls. Python 3.12 deprecates `utcnow()` and recommends timezone-aware UTC datetimes.
- Changed the PostgreSQL row-count query to use `psycopg2.sql.Identifier` instead of interpolating table names into SQL with an f-string. psycopg2 documents that identifiers must be composed with `psycopg2.sql`, not passed or interpolated like values.
- Fixed the PostgreSQL `string_agg` checksum example. `ORDER BY id` outside the aggregate is invalid in that aggregate query; the ordering now appears inside `string_agg(email, '' ORDER BY id)`.
- Updated the data-integrity validator to compare computed checksums against expected baseline checksums instead of marking every successfully computed checksum as passed.
- Fixed the Bash sample verifier so `((verified++))` and `((failed++))` do not terminate the script under `set -e` when counters start at zero.
- Added handling for empty manifests and sample sizes larger than the manifest file count before calling `shuf`.

## Review Notes
- The Kubernetes CronJob fields and PrometheusRule structure are valid for current `batch/v1` CronJobs and Prometheus Operator `monitoring.coreos.com/v1` rules.
- `backup-cli`, `backup-validator`, and the custom `backup_verification_*` metrics are example-specific placeholders; a real implementation must provide those commands and export those metrics.
- Python, Bash, and YAML fenced snippets were syntax-checked after the corrections.
