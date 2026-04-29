# Validation Summary: How to Monitor Kubewarden Policy Decisions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- OpenReports
- `kubectl`

## Sources Consulted
- Kubewarden metrics reference: https://docs.kubewarden.io/reference/metrics-reference
- Kubewarden metrics quickstart: https://docs.kubewarden.io/howtos/telemetry/metrics-qs
- Kubewarden audit scanner guide: https://docs.kubewarden.io/howtos/audit-scanner
- Kubewarden audit scanner policy reports: https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden Rancher monitoring how-to: https://docs.kubewarden.io/howtos/ui-extension/metrics
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubewarden policy-server source (`metrics.rs`): https://github.com/kubewarden/policy-server/blob/main/src/metrics.rs
- Kubewarden policy-server source (`policy_evaluations_latency.rs`): https://github.com/kubewarden/policy-server/blob/main/src/metrics/policy_evaluations_latency.rs
- Kubewarden policy-server dashboard queries: https://github.com/kubewarden/policy-server/blob/main/kubewarden-dashboard.json
- Kubewarden controller audit scanner CronJob template: https://github.com/kubewarden/kubewarden-controller/blob/main/charts/kubewarden-controller/templates/audit-scanner.yaml
- Kubewarden controller Helm helpers (`audit-scanner.fullname`): https://github.com/kubewarden/kubewarden-controller/blob/main/charts/kubewarden-controller/templates/_helpers.tpl

## Issues Found
- The metrics table listed outdated or incorrect metric names and dimensions. I replaced `kubewarden_policy_evaluation_duration_seconds` with `kubewarden_policy_evaluation_latency_milliseconds`, removed the incorrect `kubewarden_policy_status` entry, and updated the `kubewarden_policy_evaluations_total` description to match current labels such as `accepted`, `mutated`, and `request_origin`.
- The monitoring setup implied metrics were exposed automatically and used the wrong ServiceMonitor selector label. I corrected the text to note that telemetry must be enabled first and changed the selector from `app: kubewarden-policy-server` to `app: kubewarden-policy-server-default` for the default Policy Server.
- The alert rules and Grafana queries used a non-existent `decision` label and mixed admission evaluations with audit scanner evaluations. I rewrote the queries to use current labels such as `accepted` and `request_origin="validate"`, and fixed the rejection-rate expressions so they calculate a real ratio instead of a raw rejected-request rate.
- The audit scanner section treated the scanner as a Deployment and used the wrong CronJob name. I updated it to the current CronJob-based implementation and corrected the manual job trigger command to use `cronjob/audit-scanner`.
- The audit reporting section used deprecated `PolicyReport` resources as the default. I updated the post to the current default OpenReports resources, `Report` and `ClusterReport`, and noted the deprecated `policyreport`/`clusterpolicyreport` compatibility path for clusters that explicitly enable it.
- The description referred to audit logs, but the post actually covers Audit Scanner reports. I corrected that wording to match Kubewarden’s current reporting model.

## Review Notes
- Kubewarden’s current docs state that OpenReports are the default storage backend for audit results as of Kubewarden 1.33, while PolicyReport CRDs are deprecated and not installed by default.
- The current metrics reference page documents `kubewarden_policy_evaluations_total`, but the official policy-server source and shipped Grafana dashboard also show the latency histogram and labels such as `request_origin`; those sources were used to validate the PromQL fixes.
