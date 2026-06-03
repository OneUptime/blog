# Validation Summary: Configure Showback Reports for Kubernetes Team-Level Cloud Spend Attribution

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes labels, annotations, Deployments, and CronJobs
- Kubecost Allocation API and Savings APIs
- Prometheus / PromQL
- Grafana dashboard JSON
- Python requests, pandas, and smtplib
- Slack incoming webhooks and Block Kit

## Sources Consulted
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- Kubecost Filter Parameters documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/1.x?topic=directory-filter-parameters-v2
- Kubecost Container Request Right Sizing Recommendation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-container-request-right-sizing-recommendation-api-v2
- Kubecost metrics documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics
- OpenCost metrics documentation: https://opencost.io/docs/integrations/metrics/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Slack incoming webhook documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Python smtplib documentation: https://docs.python.org/3/library/smtplib.html

## Issues Found
- The Namespace example used `manager: john.doe@example.com` as a label value. Kubernetes label values cannot contain `@`, so this was moved under `metadata.annotations`.
- The Deployment example omitted `spec.selector`, which is required for `apps/v1` Deployments. Added a selector matching the Pod template labels.
- The weekly report script parsed Kubecost Allocation API results as a flat list with `name` fields. Official examples show `data` as allocation sets keyed by allocation name, so the script now iterates allocation sets and derives the team name from the key.
- The weekly report CronJob defined SMTP and Kubecost environment variables, but the Python script used hardcoded values. The script now reads those values from environment variables.
- The Grafana dashboard referenced `kubecost_allocation_total_cost`, which is not a documented Kubecost/OpenCost metric. Replaced the queries with documented cost model metrics such as `container_cpu_allocation`, `container_memory_allocation_bytes`, `node_cpu_hourly_cost`, `node_ram_hourly_cost`, and `kube_namespace_labels`.
- The CPU utilization panel used the raw `container_cpu_usage_seconds_total` counter. Updated it to use `rate(...[5m])`, which is the correct PromQL pattern for CPU usage from that counter.
- The Slack digest script had the same incorrect Kubecost Allocation API response parsing as the weekly report. It now accumulates the allocation window and iterates allocation sets correctly.
- The recommendations script used `/model/savings` as though it returned namespace-scoped recommendation records. Updated it to use the documented `/model/savings/requestSizingV2` endpoint and parse its `monthlySavings` and `recommendedRequest` fields.
- The recommendations script used an invalid allocation filter format for team labels. Updated it to use the documented v2 filter syntax `label[team]:"..."`.

## Review Notes
- The examples are still illustrative and omit production concerns such as `requests.get(..., timeout=...)`, response error handling, secret rotation, and complete Grafana panel metadata.
- `kubectl` was not installed in the workspace, so Kubernetes semantic validation was limited to YAML parsing and review against official API documentation.
