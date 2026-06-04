# Validation Summary: How to Use HPA with New Relic Metrics for Performance-Based Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes external metrics API
- New Relic Kubernetes Metrics Adapter
- New Relic NRQL
- Helm
- Python New Relic agent

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- New Relic Metrics Adapter documentation: https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/advanced-configuration/newrelic-metrics-adapter/
- New Relic Metrics Adapter chart values: https://github.com/newrelic/newrelic-k8s-metrics-adapter/blob/main/charts/newrelic-k8s-metrics-adapter/values.yaml
- New Relic Metrics Adapter chart README: https://github.com/newrelic/newrelic-k8s-metrics-adapter/blob/main/charts/newrelic-k8s-metrics-adapter/README.md
- New Relic nri-bundle chart metadata and values: https://github.com/newrelic/helm-charts/tree/master/charts/nri-bundle
- New Relic NRQL reference: https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/
- New Relic NRQL math using SELECT: https://docs.newrelic.com/docs/nrql/nrql-references/nrql-math-using-select/
- New Relic Python agent record_custom_event API: https://docs.newrelic.com/docs/apm/agents/python-agent/python-agent-api/recordcustomevent-python-agent-api/

## Issues Found
- The setup example used an unsupported standalone ConfigMap/list format for adapter metrics. Replaced it with the chart-supported `values.yaml` structure under `newrelic-k8s-metrics-adapter.config.externalMetrics`.
- The Helm example set the adapter account ID at the wrong path and did not pass the metric configuration. Changed it to use `--values values.yaml`, where `config.accountID` and all external metrics are defined.
- The HPA examples referenced metric names such as `newrelic.apdex_score` that were not configured by the adapter. Updated all HPA metric names to match the configured external metrics.
- The Apdex example used the raw Apdex score with a target of `0.85`, but HPA scales up when the current metric is above the target. Changed the adapter metric to `apdex_deficit` (`1 - apdex`) and updated the HPA target to `0.15`.
- The response-time metric was labeled as milliseconds while querying `duration`, which New Relic APM stores in seconds. Updated the NRQL query to multiply by 1000.
- The selectors used `app` and `transaction`, but the adapter appends selectors as NRQL filters. Updated examples to use New Relic attributes such as `appName` and `name`.
- The custom event HPA used an `eventType` selector that would be appended as a WHERE clause even though the event type is already represented by `FROM BatchProcessing`. Removed the selector and configured a matching `custom_queue_depth` metric.
- The APIService and log verification commands used selectors/names that may not match the chart resources. Updated them to `v1beta1.external.metrics.k8s.io` and the chart's standard `app.kubernetes.io/name` label.
- The query-cost note implied every HPA evaluation runs a NRQL query. Adjusted it to account for the adapter's cache.

## Review Notes
The post is now technically consistent with the current New Relic metrics adapter chart and Kubernetes `autoscaling/v2` HPA behavior. The example still assumes the selected New Relic attributes, such as `env` and transaction `name`, exist in the account data.
