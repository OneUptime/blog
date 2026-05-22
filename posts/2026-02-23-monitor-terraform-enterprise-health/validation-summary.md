# Validation Summary: How to Monitor Terraform Enterprise Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- Terraform Enterprise readiness and admin APIs
- Prometheus
- Prometheus Blackbox Exporter
- PostgreSQL
- Redis
- Docker
- Bash, curl, and jq
- OneUptime HTTP monitoring

## Sources Consulted
- HashiCorp Terraform Enterprise diagnostics documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/troubleshoot/perform-diagnostics
- HashiCorp Terraform Enterprise readiness endpoint API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/readiness
- HashiCorp Terraform Enterprise monitoring documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/replicated/monitoring/monitoring
- HashiCorp Terraform Enterprise Admin Runs API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/runs
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus Blackbox Exporter documentation: https://github.com/prometheus/blackbox_exporter
- PostgreSQL monitoring statistics documentation: https://www.postgresql.org/docs/current/monitoring.html
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Docker stats CLI documentation: https://docs.docker.com/reference/cli/docker/container/stats/

## Issues Found
- The post used the deprecated Terraform Enterprise `/_health_check` endpoint as the primary current recommendation. Replaced examples with the current `/api/v1/health/readiness?timeout=5` endpoint and updated the expected JSON shape from `.passed` and object-style checks to `.status` and array-style readiness checks.
- The component list referred to `object_storage` from the old example response. Updated it to match current readiness checks, including Archivist/backend storage and task worker state.
- The Prometheus scrape configuration attempted to scrape the health endpoint directly as metrics. Replaced it with a Blackbox Exporter `/probe` scrape job and added a separate TFE metrics scrape job using `/metrics?format=prometheus`.
- The Blackbox module and alert expressions used the old `tfe-health` job naming. Updated them to the new `tfe-readiness` scrape job so `probe_success`, `probe_http_status_code`, and `probe_duration_seconds` match the actual scraped metrics.
- The PostgreSQL connection alert compared each `pg_stat_activity_count` series individually. Updated it to sum connection counts by database before comparing to the threshold.
- The Redis memory alert divided by `redis_memory_max_bytes` without guarding for Redis instances that have no maxmemory limit. Added a `redis_memory_max_bytes > 0` condition.
- The Terraform Enterprise Admin Runs API examples used `filter[status]` directly in curl URLs. Percent-encoded the brackets as `filter%5Bstatus%5D` to avoid curl URL glob parsing and to match HashiCorp's API guidance.

## Review Notes
- The guide now targets current Terraform Enterprise 1.2.x/2.0.x health monitoring behavior. Older Replicated-era deployments may still expose `/_health_check`, but HashiCorp documents it as deprecated in current releases.
- Terraform Enterprise metrics require `metrics_endpoint_enabled` to be enabled before the Prometheus metrics scrape job will work.
