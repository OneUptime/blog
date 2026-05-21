# Validation Summary: How to Configure Thanos with Prometheus for Istio

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Istio
- Prometheus
- Prometheus Operator
- Thanos Sidecar
- Thanos Store Gateway
- Thanos Querier
- Thanos Compactor
- Kubernetes StatefulSets, Deployments, Services, Secrets, and ConfigMaps
- Grafana Prometheus data sources
- S3 and Google Cloud Storage object storage

## Sources Consulted
- Thanos v0.41.0 release notes: https://github.com/thanos-io/thanos/releases/tag/v0.41.0
- Thanos object storage configuration docs: https://thanos.io/tip/thanos/storage.md/
- Thanos Sidecar docs: https://thanos.io/tip/components/sidecar.md/
- Thanos Query docs: https://thanos.io/tip/components/query.md/
- Thanos Store Gateway docs: https://thanos.io/tip/components/store.md/
- Thanos Compactor docs: https://thanos.io/tip/components/compact.md/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post used Thanos `v0.34.1`, which is outdated for a 2026 guide. Updated the Prometheus Operator sidecar version and Thanos component images to `v0.41.0`, the current release checked during validation.
- The Store Gateway and Compactor StatefulSet examples omitted `spec.serviceName`, which is required for StatefulSets. Added `serviceName` to both StatefulSets.
- The Store Gateway Service was not headless even though it governs a StatefulSet. Added `clusterIP: None`.
- The Compactor StatefulSet referenced a service name but had no Service manifest. Added a minimal headless Service for `thanos-compact`.
- The Querier example used the deprecated `--store` flag. Replaced it with the current `--endpoint` flag.
- The Querier example ran two Prometheus replicas without a replica label for deduplication. Added `--query.replica-label=prometheus_replica` and clarified the explanation.
- The performance tuning section used an invalid flag, `--store.grpc.series-max-size`. Replaced it with `--store.limits.request-series=50000`, which is the current Thanos request series limit flag.

## Review Notes
The guide remains intentionally minimal and does not cover production hardening such as TLS between Thanos components, IAM/workload identity setup details, resource sizing, readiness probes, or bucket lifecycle policies. Those are valid future improvements but not required to make the examples technically correct.
