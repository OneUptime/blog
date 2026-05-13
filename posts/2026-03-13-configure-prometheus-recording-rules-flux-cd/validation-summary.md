# Validation Summary: How to Configure Prometheus Recording Rules with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- Kustomize
- Prometheus
- Prometheus Operator
- PrometheusRule custom resources
- PromQL
- kube-state-metrics

## Sources Consulted
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Flux Kustomization API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The pod count recording rule used `kube_pod_info{phase="Running"}`. Current kube-state-metrics documents `kube_pod_info` as an info metric with labels such as `pod`, `namespace`, `node`, and `uid`, but not `phase`. The pod phase is exposed by `kube_pod_status_phase`. Updated the expression to join `kube_pod_info` with `kube_pod_status_phase{phase="Running"} == 1` on `namespace`, `pod`, and `uid`, so the result keeps the `node` label while filtering to running pods.

## Review Notes
- The PrometheusRule API version, rule group structure, `record` and `expr` fields, group `interval`, Flux Kustomization fields, and Prometheus `/api/v1/rules?type=record` usage are consistent with the consulted documentation.
- The PrometheusRule labels shown are deployment-specific and must match the Prometheus Operator `ruleSelector` in the reader's cluster, as the post already notes.
