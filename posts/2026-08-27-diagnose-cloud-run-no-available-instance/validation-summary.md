# Validation Summary: Diagnose Cloud Run `No Available Instance` Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Google Cloud Run services and revisions
- Cloud Run automatic and manual scaling, maximum and minimum instances, and concurrency
- Google Cloud CLI (`gcloud`)
- Cloud Logging and the Logging query language
- Cloud Monitoring metrics
- Cloud Run health checks and startup CPU boost

## Sources Consulted

- [Troubleshoot Cloud Run issues: no available instances](https://cloud.google.com/run/docs/troubleshooting#429-max-instances)
- [Troubleshoot Cloud Run issues: traffic-rate aborts](https://cloud.google.com/run/docs/troubleshooting#abort-request)
- [About instance autoscaling in Cloud Run services](https://cloud.google.com/run/docs/about-instance-autoscaling)
- [Cloud Run container runtime contract](https://cloud.google.com/run/docs/container-contract)
- [Set maximum instances for services](https://cloud.google.com/run/docs/configuring/max-instances)
- [About maximum instances](https://cloud.google.com/run/docs/configuring/max-instances-limits)
- [Set minimum instances for services](https://cloud.google.com/run/docs/configuring/min-instances)
- [Manual scaling for Cloud Run services](https://cloud.google.com/run/docs/configuring/services/manual-scaling)
- [About maximum concurrent requests per instance](https://cloud.google.com/run/docs/about-concurrency)
- [Set maximum concurrent requests per instance](https://cloud.google.com/run/docs/configuring/concurrency)
- [Configure CPU limits and startup CPU boost](https://cloud.google.com/run/docs/configuring/services/cpu)
- [Configure container health checks for services](https://cloud.google.com/run/docs/configuring/healthchecks)
- [Logging and viewing logs in Cloud Run](https://cloud.google.com/run/docs/logging)
- [Cloud Run audit logging](https://cloud.google.com/run/docs/audit-logging)
- [Manage Cloud Run revisions](https://cloud.google.com/run/docs/managing/revisions#view_revision_details)
- [Cloud Logging query language](https://cloud.google.com/logging/docs/view/logging-query-language#search-functions)
- [`gcloud logging read` reference](https://cloud.google.com/sdk/gcloud/reference/logging/read)
- [`gcloud run services describe` reference](https://cloud.google.com/sdk/gcloud/reference/run/services/describe)
- [`gcloud run revisions describe` reference](https://cloud.google.com/sdk/gcloud/reference/run/revisions/describe)
- [Monitor Cloud Run health and performance](https://cloud.google.com/run/docs/monitoring)
- [Cloud Run metrics reference](https://cloud.google.com/monitoring/api/metrics_gcp_p_z#gcp-run)
- [Cloud Run quotas and limits](https://cloud.google.com/run/quotas)
- [Cloud Run known issues](https://cloud.google.com/run/docs/known-issues#spend-cap-recovery)

## Issues Found

- The log filter defined `REGION` but did not use it, so it could return logs from a same-named service in another region. It also used `SEARCH` without backticks, which matches all tokens case-insensitively in any order rather than matching the phrase. The filter now constrains `resource.labels.location` and uses shell-escaped backticks for an exact phrase search. Notes now explain the command's default one-day freshness and the need to inspect surrounding logs over the incident window.
- The maximum-instance diagnosis treated the configured maximum as one service-wide value. Cloud Run supports service-level and revision-level maxima, and a service-level maximum is allocated proportionally across revisions in a traffic split. The affected revision can therefore return the no-available-instance error before the service-wide instance count reaches the service-level maximum. The post now compares the failed revision's instance count with its effective allocation.
- Manual scaling was not considered. The configuration and capacity checks now distinguish automatic scaling limits from a manually configured service instance count and note that revision-level minimum and maximum settings are ignored for revisions receiving traffic under manual scaling.
- The service-description command reports the current service and template, not the immutable configuration of an older revision named in an incident log. A revision-specific `gcloud run revisions describe` command was added, along with a note to consult Admin Activity audit logs when mutable service-level settings may have changed.
- The post could imply that failure to observe an instance-count plateau ruled out a maximum-instance limit. It now notes the metric's 60-second sampling and Cloud Run's documented temporary maximum overshoot behavior.
- The phrase "overall request latency" was ambiguous because the GA request-latency metric begins at a running container and excludes startup latency. It now names the end-to-end request-latency metric explicitly.
- The validation advice said to deploy a new revision after any change. Service-level scaling changes apply without creating a revision, so the advice now separates revision-scoped canary validation from direct, reversible service-level changes.
- The conclusion focused on `429` and `500` without naming the documented `503` case. The known-issues guidance and conclusion now identify the up-to-30-minute billing or spend-cap recovery period in which the same message can accompany `429` or `503` responses.
- The platform-event check now includes Personalized Service Health for project-specific incidents as recommended by Cloud Run troubleshooting guidance, while retaining the public Google Cloud Service Health dashboard for broader incidents.
- Two official-documentation links used stale fragment identifiers. The troubleshooting link now targets `#429-max-instances`, and the metrics-reference link now targets `#gcp-run`.

## Review Notes

- The documented `429` and `500` meanings, retry guidance, 10-second troubleshooting resolution, metric exclusions, concurrency tradeoffs, startup CPU boost guidance, and billing-recovery behavior were confirmed against current official documentation.
- Cloud Run's autoscaling and container runtime documentation state the pending window as 3.5 times average startup time or 10 seconds, whichever is greater. The separate About maximum instances page currently describes an attempt of up to 30 seconds when all instances are busy. The post retains the former wording because it is the rule given in the autoscaling documentation for the `429` path, but the official pages are not fully consistent.
- As of the validation date, readiness probes are Preview; pending and end-to-end request latency and container startup latency metrics are Beta, and the pending-request-count metric is Alpha.
- All linked documentation pages in the post resolved successfully during validation.
