# Validation Summary: How to Implement Dashboards as Code with Grafonnet for Kubernetes Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafonnet
- Grafana dashboards
- Jsonnet and go-jsonnet
- jsonnet-bundler
- Prometheus queries
- Grafana dashboard variables
- Grafana-managed alerting
- GitLab CI/CD
- Kubernetes ConfigMaps

## Sources Consulted
- Grafonnet README: https://github.com/grafana/grafonnet
- Deprecated grafonnet-lib README: https://github.com/grafana/grafonnet-lib
- Grafonnet simple dashboard example: https://grafana.github.io/grafonnet/examples/simple.html
- Grafonnet dashboard API: https://grafana.github.io/grafonnet/API/dashboard/
- Grafonnet time series panel API: https://grafana.github.io/grafonnet/API/panel/timeSeries/
- Grafonnet stat panel API: https://grafana.github.io/grafonnet/API/panel/stat/
- Grafonnet Prometheus query API: https://grafana.github.io/grafonnet/API/query/prometheus.html
- Grafonnet dashboard variable API: https://grafana.github.io/grafonnet/API/dashboard/variable.html
- Grafonnet alerting rule group API: https://grafana.github.io/grafonnet/API/alerting/ruleGroup/
- Jsonnet getting started and multiple-output documentation: https://jsonnet.org/learning/getting_started.html
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana v10 breaking changes for legacy dashboard alerting: https://grafana.com/docs/grafana/latest/breaking-changes/breaking-changes-v10-0/

## Issues Found
- The installation section used the deprecated `grafana/grafonnet-lib` repository. Updated it to install the current generated Grafonnet package with `jsonnet-bundler`, use `go-jsonnet`, and compile with `-J vendor`.
- The Jsonnet examples used the old `grafonnet-lib` builder API (`grafonnet/grafana.libsonnet`, `graphPanel`, `.addPanel`, `.addTarget`, `.addTemplate`, `.addRow`). Updated examples to current Grafonnet patterns using `g.dashboard`, `g.panel.timeSeries`, `g.panel.stat`, `g.query.prometheus`, `withPanels`, `withVariables`, and `withTargets`.
- The examples used the legacy graph panel. Updated them to the current time series panel API.
- The dashboard variable examples used legacy template construction and exact-match variable filters with multi-select variables. Updated them to current variable APIs and regex label matchers (`=~`) for multi-select compatibility.
- The alerting example used legacy panel alerts (`.addAlert`, `.addCondition`), which are deprecated in modern Grafana. Replaced it with a Grafana-managed alert rule group example.
- The dashboard API deployment example posted raw dashboard JSON to `/api/dashboards/db`. Updated it to send the documented wrapper payload containing `dashboard` and `overwrite`.
- The CI deployment image did not include `jq`, which the corrected payload generation requires. Updated the job to use Alpine and install `curl` and `jq`.
- The dashboard testing command did not include the Grafonnet vendor import path. Updated it to use `jsonnet -J vendor`.
- The ConfigMap example used a Helm template expression inside a plain Kubernetes manifest, which would not work outside Helm. Replaced it with inline dashboard JSON and clarified that automatic loading requires Grafana provisioning or a sidecar configured to watch labeled ConfigMaps.
- The dashboard was described as "production-ready." Changed that to "complete" because the example is illustrative and current Grafonnet is still marked experimental by Grafana.

## Review Notes
Current Grafonnet is the correct replacement for `grafonnet-lib`, but Grafana describes it as experimental and generated from Grafana schemas. Teams should pin a specific Grafonnet version instead of `grafonnet-latest` when they need reproducible production builds.
