# Validation Summary: How to Build Compliance Dashboards for Kubernetes Using Gatekeeper Audit Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Prometheus and Prometheus Operator
- Grafana dashboards
- Python Prometheus exporters
- Kubernetes Python client
- Kubernetes CronJobs

## Sources Consulted
- Gatekeeper Audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit
- Gatekeeper Metrics & Observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper Runtime Flags documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper Handling Constraint Violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Prometheus Operator ServiceMonitor getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.4/querying/functions
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/

## Issues Found
- The metrics section said to configure Gatekeeper to expose Prometheus metrics, but Gatekeeper exposes Prometheus metrics by default on port `8888` at `/metrics`. Updated the wording so the YAML is correctly described as adding a Service and ServiceMonitor for scraping.
- The custom exporter dropped constraint `metadata` before calling `extract_severity`, so severity extraction always fell back to `medium`. Kept `metadata` in the constraint object and added support for the common `policy.open-cluster-management.io/severity` annotation.
- The exporter read `enforcementAction` from `status`, but Gatekeeper defines constraint enforcement action in `spec.enforcementAction`, and violations include per-violation enforcement action under `status.violations`. Updated the exporter to read the constraint-level value from `spec`.
- The exporter selected the first CRD version without checking whether it was served. Updated it to select a served CRD version.
- The compliance exporter ServiceMonitor selected Services with `app: compliance-exporter`, but the Service did not have that label. Added the missing Service label so the ServiceMonitor can select it.
- The report generator ignored the CronJob's `PROMETHEUS_URL` environment variable because the URL was hardcoded. Updated the script to read `PROMETHEUS_URL` from the environment, added request timeout/error handling, and removed unused imports.
- The CronJob mounted `/reports`, but the report generator wrote to the current working directory. Added `REPORT_DIR` support to the script and set it to `/reports` in the CronJob.
- The Prometheus alert query used `delta(sum(gatekeeper_constraint_violations)[1h])`, which applies a range selector to an aggregate expression. Updated it to `sum(delta(gatekeeper_constraint_violations[1h]))`, where `delta()` receives a range vector as required.
- The alert name `ViolationsTrending Up` contained a space. Prometheus allows broad label values for alert names, but its own guidance recommends CamelCase, so it was corrected to `ViolationsTrendingUp`.

## Review Notes
The embedded Python blocks were parsed successfully with Python `ast`, the dashboard JSON parsed successfully with Python `json`, and all YAML blocks parsed successfully with PyYAML. `promtool` was not installed in the local environment, so PromQL was reviewed against the official Prometheus documentation rather than checked with `promtool`.
