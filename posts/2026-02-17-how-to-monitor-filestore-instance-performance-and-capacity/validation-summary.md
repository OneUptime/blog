# Validation Summary: How to Monitor Filestore Instance Performance and Capacity

## Status
validated

## Post Type
Tutorial / operational monitoring guide

## Technologies Covered
- Google Cloud Filestore
- Cloud Monitoring metrics, dashboards, alerting policies, and notification channels
- Google Cloud CLI
- NFS client tools
- Ops Agent
- Prometheus and Stackdriver exporter

## Sources Consulted
- Google Cloud Filestore monitoring instances and quota documentation: https://cloud.google.com/filestore/docs/monitoring-instances
- Google Cloud Monitoring Filestore metric descriptors: https://cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud Monitoring monitored resource descriptors: https://cloud.google.com/monitoring/api/resources
- Google Cloud CLI `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI `gcloud alpha monitoring channels create` reference: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/channels/create
- Google Cloud CLI `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Cloud Monitoring `projects.timeSeries.list` REST API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Cloud Monitoring dashboard API documentation: https://cloud.google.com/monitoring/dashboards/api-dashboard
- Ops Agent configuration and receiver documentation: https://cloud.google.com/monitoring/agent/ops-agent/configuration
- Prometheus Community Stackdriver exporter documentation: https://github.com/prometheus-community/stackdriver_exporter

## Issues Found
- The post used `resource.type="filestore.googleapis.com/Instance"` in Cloud Monitoring filters. The monitored resource type is `filestore_instance`, so I updated the command examples and dashboard filters.
- The post referenced non-existent Cloud Monitoring API metric names `file.googleapis.com/nfs/server/average_read_latency` and `file.googleapis.com/nfs/server/average_write_latency`. I replaced them with the documented `read_milliseconds_count` and `write_milliseconds_count` metrics and adjusted the dashboard chart title and aligners.
- The post used `gcloud monitoring time-series list`, but the current documented `gcloud monitoring` command groups don't include a time-series listing command. I changed those examples to call the documented Cloud Monitoring `projects.timeSeries.list` REST endpoint, using `gcloud auth print-access-token` for authentication.
- The throughput example used `ALIGN_RATE` without an explicit alignment period. I added `aggregation.alignmentPeriod=60s`, matching Cloud Monitoring aggregation requirements.
- The alert policy command used unsupported threshold flags for `gcloud monitoring policies create`. I replaced them with the current `--if='> 80'` and `--duration=300s` flags.
- The Ops Agent section implied that installing the Ops Agent exports NFS client-specific `nfsstat` metrics. Current Ops Agent built-in receivers collect host and supported application metrics, not `nfsstat` output directly, so I changed the wording to VM-level monitoring alongside NFS checks.
- The Prometheus scrape config used a `match[]` parameter that doesn't match Stackdriver exporter filtering. I changed it to the documented `collect` parameter for `file.googleapis.com/nfs/server`.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI documentation rather than local `--help` output.
