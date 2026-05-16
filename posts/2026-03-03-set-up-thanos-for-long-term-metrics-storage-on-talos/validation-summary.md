# Validation Summary: How to Set Up Thanos for Long-Term Metrics Storage on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus and kube-prometheus-stack
- Prometheus Operator
- Thanos Sidecar, Query, Store Gateway, Compactor, and Query Frontend
- Bitnami Thanos Helm chart
- Helm
- kubectl
- Grafana datasource provisioning
- S3-compatible object storage and MinIO

## Sources Consulted
- Prometheus Operator Thanos documentation: https://prometheus-operator.dev/docs/platform/thanos/
- kube-prometheus-stack values and templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Bitnami Thanos Helm chart values and templates: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos Query documentation: https://thanos.io/tip/components/query.md/
- Thanos Compactor documentation: https://thanos.io/tip/components/compact.md/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus datasource documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The post said Thanos downsampling saves storage. Thanos documentation states downsampling is primarily for efficient long-range queries and can increase storage usage because additional downsampled blocks are stored. Updated the explanation to describe query performance and trend visibility instead of storage savings.
- The Bitnami Thanos values used a hard-coded sidecar discovery DNS name that did not match the kube-prometheus-stack release name shown in the Helm upgrade command. Updated the example to use Bitnami's `query.dnsDiscovery` fields and the discovery service name generated for the `prometheus-stack` release.
- The Query configuration comment implied Store Gateway was connected by an unrelated flag. Clarified that the flag enables automatic downsampled data selection for long-range queries; the Bitnami chart adds Store Gateway endpoints when Store Gateway and DNS discovery are enabled.
- The verification commands used hard-coded Prometheus pod names that vary by release name and chart naming. Replaced them with a `kubectl get pods ... -o jsonpath` lookup before reading sidecar logs.
- The test query description claimed `up` should return both sidecar and Store Gateway data. An instant query generally verifies recent data; historical Store Gateway data is visible after blocks have been uploaded and queried over a longer time range. Updated the verification text accordingly.
- The object storage upload verification did not mention that Thanos sidecar uploads completed Prometheus blocks, usually after about two hours. Added that timing caveat.

## Review Notes
- The local review environment did not have `helm`, `kubectl`, or `ruby` installed, so CLI behavior was checked against official chart templates and documentation rather than local command help.
- The Bitnami chart currently renders some deprecated Thanos endpoint flags internally for `query.stores`, but the documented chart values remain supported by the chart. The post now uses `query.dnsDiscovery` for the sidecar path.
