# Validation Summary: How to Monitor IPv4 Load Balancer Performance and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (stats page, admin socket via socat, Prometheus exporter)
- Nginx (stub_status module, nginx-prometheus-exporter)
- AWS Application Load Balancer (CloudWatch metrics, alarms)
- Google Cloud Load Balancing (Cloud Monitoring API)
- Prometheus / metric scraping
- Bash, awk, curl, gcloud, aws CLI

## Sources Consulted
- HAProxy management documentation, "9.1. CSV format" of `show stat`: https://docs.haproxy.org/dev/management.html
- HAProxy Prometheus exporter (built-in via `http-request use-service prometheus-exporter`): https://www.haproxy.com/blog/haproxy-exposes-a-prometheus-metrics-endpoint
- Nginx `ngx_http_stub_status_module` docs: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- nginx-prometheus-exporter README and flag reference: https://github.com/nginxinc/nginx-prometheus-exporter
- AWS CloudWatch metrics for Application Load Balancer (namespace `AWS/ApplicationELB`, metrics `RequestCount`, `UnHealthyHostCount`, `HTTPCode_Target_5XX_Count`, `TargetResponseTime`): https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS CLI `cloudwatch get-metric-statistics` and `put-metric-alarm` references: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/
- gcloud `monitoring` command group reference (no `read` / time-series subcommand): https://cloud.google.com/sdk/gcloud/reference/monitoring
- Google Cloud Monitoring API `projects.timeSeries.list`: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Cloud HTTP(S) load balancing metric `loadbalancing.googleapis.com/https/request_count`: https://cloud.google.com/monitoring/api/metrics_gcp

## Issues Found
1. **HAProxy CSV stats field numbers were wrong.** The post's awk command read `$1,$2,$18,$19,$47` and described `$19 = act (active sessions)` and `$47 = hrsp_5xx`. Per the official HAProxy `show stat` CSV layout (1-indexed): column 19 is `weight`, not `act`; `act` is column 20 and means "server is active" (a flag), not active sessions; current sessions is `scur` at column 5; and `hrsp_5xx` is column 44, not 47. Updated the awk fields to `$1,$2,$5,$18,$44` and rewrote the field legend to match.
2. **`gcloud monitoring read` is not a real command.** The `gcloud monitoring` group has no `read` or time-series-list subcommand and does not accept `--freshness` for metric data. Replaced the snippet with a `curl` call against the Cloud Monitoring API's `projects.timeSeries.list` endpoint, authenticated via `gcloud auth print-access-token`, which is the documented way to read time-series data from the CLI.

## Review Notes
- The HAProxy CSV format has accumulated additional columns over major versions, but the column positions for the fields used here (`pxname`, `svname`, `scur`, `status`, `hrsp_5xx`) have been stable for many years.
- The HAProxy built-in Prometheus exporter (`http-request use-service prometheus-exporter`) requires HAProxy 2.0+. Worth noting if a reader is on an older LTS.
- `date -u -d '1 hour ago' ...` is GNU `date` syntax and will not work on macOS/BSD `date` without `coreutils`. Acceptable as-is for a Linux-focused ops post but a portability caveat.
- The nginx-prometheus-exporter flag `-nginx.scrape-uri` uses a single dash, which is correct for Go's `flag` package as used by the exporter.
- The "Key Metrics to Monitor" thresholds (e.g., 5xx >1%, P99 >500ms) are reasonable defaults but should be tuned per service SLO; this is implicit guidance rather than a technical error.
