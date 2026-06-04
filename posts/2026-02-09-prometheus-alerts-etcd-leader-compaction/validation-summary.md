# Validation Summary: How to Create Prometheus Alerts for Kubernetes etcd Leader Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- PromQL
- etcd metrics, compaction, defragmentation, and leader elections

## Sources Consulted
- etcd v3.6 Metrics documentation: https://etcd.io/docs/v3.6/metrics/
- etcd v3.6 generated metrics list: https://github.com/etcd-io/website/blob/main/content/en/docs/v3.6/metrics/etcd-metrics-latest.txt
- etcd v3.6 Monitoring guide: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd v3.6 Maintenance guide: https://etcd.io/docs/v3.6/op-guide/maintenance/
- etcd v3.6 System limits: https://etcd.io/docs/v3.6/dev-guide/limit/
- Kubernetes Services without selectors and EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors
- Prometheus configuration documentation for Kubernetes service discovery: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Kubernetes metrics Service example combined a selector-bearing Service with manually managed endpoint data. Updated it to use a selectorless Service with a manually managed EndpointSlice, matching current Kubernetes guidance.
- The Prometheus scrape example used `role: endpoints` while the post now defines an EndpointSlice. Updated it to `role: endpointslice` and changed the relabel source label to the EndpointSlice label.
- The Prometheus scrape example used HTTPS and client TLS against port 2381. Updated it to HTTP for a `--listen-metrics-urls` metrics listener, and clarified that the metrics listener must be reachable by Prometheus.
- The frequent leader-election alert used `rate()` with a threshold intended as a count over 15 minutes. Changed it to `increase()` and updated the alert description.
- The post treated internally free etcd database pages as something fixed by compaction alone. Updated the relevant wording and alerts to distinguish history compaction from defragmentation, which is what returns internally free database space to the filesystem.
- The database growth-rate alert used `deriv()` but compared it to a 100 MB per 30 minute threshold as if `deriv()` returned a 30 minute delta. Corrected the threshold to bytes per second.
- The compaction error alert compared unrelated counters and did not actually detect errors. Replaced it with a slow MVCC compaction alert using the documented compaction duration histogram.
- The member-count alert used `etcd_server_has_leader`, which detects leader availability rather than member count changes. Replaced it with a scrapeable-member-count change query.
- The quorum alert used a non-integer majority threshold that incorrectly treats 3 of 5 members as insufficient. Updated it to use `floor(count(...) / 2) + 1`.
- The failed-proposals alert used `rate()` while the wording and threshold described a count over 15 minutes. Changed it to `increase()` and updated the description.
- Dashboard and recording-rule queries attempted to apply range selectors directly to computed expressions. Updated them to use Prometheus subquery syntax.
- The leader-stability score used `rate()` for a score intended to reflect the number of leader changes over one hour. Changed it to `increase()`.
- The debugging query referenced `etcd_server_proposal_duration_seconds_bucket`, which is not present in the current etcd v3.6 generated metrics list. Replaced it with `etcd_server_proposals_pending`.

## Review Notes
- Several `etcd_debugging_*` metrics used by the post exist in current etcd metrics output, but etcd documents the `etcd_debugging` namespace as implementation-dependent and volatile. These alerts should be version-checked when upgrading etcd.
- The EndpointSlice discovery role requires Prometheus support for Kubernetes EndpointSlice discovery and a Kubernetes cluster with `discovery.k8s.io/v1` EndpointSlice support.
