# Validation Summary: How to Set Up Ceph Metrics in Datadog

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Datadog (monitoring platform)
- Datadog Agent (OpenMetrics V2 integration)
- Helm (Kubernetes package manager)
- Kubernetes (container orchestration)
- Prometheus metrics format

## Sources Consulted
- Datadog OpenMetrics Integration documentation — https://docs.datadoghq.com/integrations/openmetrics/
- Datadog Custom OpenMetrics Check guide — https://docs.datadoghq.com/developers/custom_checks/prometheus/
- Datadog Helm Chart README — https://github.com/DataDog/helm-charts/blob/main/charts/datadog/README.md
- Datadog Helm Charts repository — https://helm.datadoghq.com/
- Rook Ceph Prometheus Monitoring documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Ceph MGR Prometheus module documentation — https://docs.ceph.com/en/latest/mgr/prometheus/
- Datadog API authentication documentation — https://docs.datadoghq.com/api/latest/authentication/
- Datadog Monitors API reference — https://docs.datadoghq.com/api/latest/monitors/

## Issues Found

1. **Incorrect expected output in Step 1**: The comment stated `grep prometheus` would return `rook-ceph-mgr-dashboard-external-https`, but that service name does not contain "prometheus" and would not match the grep. Changed to reference `rook-ceph-mgr` or `rook-ceph-mgr-metrics` with port 9283, which are the actual Rook services that expose Prometheus metrics.

2. **Wrong metric names in dashboard section (Step 5)**: The dashboard referenced metrics like `ceph.health_status`, `ceph.osd_up`, etc. With the OpenMetrics V2 integration configured with `namespace: ceph`, the actual Datadog metric names are `ceph.ceph_health_status`, `ceph.ceph_osd_up`, etc. The namespace is prepended as a prefix to the full Prometheus metric name. Updated all metric references to match the actual output.

3. **Missing authentication headers in monitor creation (Step 6)**: The `curl` command to create a Datadog monitor was missing the required `DD-API-KEY` and `DD-APPLICATION-KEY` headers. Without these, the API call returns 403 Forbidden. Added both headers consistent with the Step 5 curl example.

4. **Incorrect alert threshold in Step 6**: The monitor query used `> 1`, which only triggers on HEALTH_ERR (value 2), completely missing HEALTH_WARN (value 1). Since the monitor is named "Ceph Health Warning" and the message says "health is degraded," it should trigger on HEALTH_WARN as well. Changed threshold to `> 0` to catch both HEALTH_WARN (1) and HEALTH_ERR (2). Also updated the metric name in the query to `ceph.ceph_health_status` for consistency.

## Review Notes
- Step 3 (manual ConfigMap) and Step 4 (Autodiscovery annotations) are presented as sequential steps but are actually alternative approaches to configuring metric collection. A note clarifying this would help readers avoid configuring both.
- The `tag_by_endpoint: true` option in Step 3 is valid but not commonly documented for the OpenMetrics V2 check. It will work but readers may not find it in standard reference docs.
- Endpoint-level Autodiscovery (Step 4) requires the Datadog Cluster Agent to be running. The Helm install in Step 2 does not explicitly enable it (though it is enabled by default in recent chart versions). Readers using older chart versions may need to add `--set clusterAgent.enabled=true`.
- The `date -d '1 hour ago'` syntax in Step 5 is GNU/Linux-specific and will not work on macOS (which requires `date -v-1H`). Since the tutorial targets Kubernetes environments this is acceptable, but worth noting.
- The Datadog API base URL `api.datadoghq.com` is specific to the US1 site. Users on other Datadog regions (EU, US3, US5, etc.) would need to substitute their region-specific URL.
