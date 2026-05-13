# Validation Summary: How to Configure Fluent Bit Output to Loki with Flux CD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease
- Fluent Bit
- Fluent Bit Helm chart
- Fluent Bit Kubernetes filter
- Fluent Bit Loki output plugin
- Grafana Loki
- LogQL

## Sources Consulted
- Fluent Bit Loki output plugin documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit Helm chart values for chart 0.46.7: https://github.com/fluent/helm-charts/blob/fluent-bit-0.46.7/charts/fluent-bit/values.yaml
- Fluent Bit Helm chart metadata for chart 0.46.7: https://github.com/fluent/helm-charts/blob/fluent-bit-0.46.7/charts/fluent-bit/Chart.yaml
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki label best practices: https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/

## Issues Found
- The custom `Tag`/`Tag_Regex` format did not include a matching Kubernetes filter `Regex_Parser`, which Fluent Bit requires when the tag no longer follows the default container log filename format. Added `config.customParsers`, included the container ID in the tag, and referenced the parser from the Kubernetes filter.
- The Loki examples used `Label_Keys` while the Grafana query expected a `namespace` label. Switched to explicit `Labels` record accessors so the configured labels are named `namespace`, `app`, and `container`.
- The `Auto_Kubernetes_Labels` comment described log-level detection, but the setting controls automatic promotion of all pod labels to Loki labels. Corrected the comment.
- The Loki `query_range` example used `start=1h`, but relative durations should use `since`; `start` expects a timestamp or other supported timestamp format. Replaced it with `since=1h`.
- The label-cardinality advice gave a hard "fewer than 20" threshold. Adjusted it to match Loki's guidance that labels should be low cardinality and ideally limited to tens of values.
- The monitoring note referenced a non-standard `loki.output` metric name. Updated it to refer to Fluent Bit's Prometheus-style `fluentbit_output_*` metrics.

## Review Notes
The Flux API examples and Fluent Bit Helm chart value keys are valid for the versions shown. The pinned Fluent Bit chart version `0.46.7` exists and uses app version `3.0.4`; newer chart releases are available, but the pinned version is still a valid historical example.
