# Validation Summary: How to Enable Logging in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Logging Operator
- Fluent Bit
- Fluentd

## Sources Consulted
- Rancher logging integration docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Rancher logging architecture docs: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging/logging-architecture
- Rancher outputs and cluster outputs docs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Rancher taints and tolerations docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging/taints-and-tolerations
- Rancher Helm charts and apps docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher `rancher-logging` chart source and values: https://github.com/rancher/charts/tree/dev-v2.13/charts/rancher-logging/108.0.4+up4.10.0-rancher.23
- Logging Operator `FluentbitSpec` CRD docs: https://kube-logging.dev/6.0/docs/configuration/crds/v1beta1/fluentbit_types/
- Logging Operator `ClusterFlow` CRD docs: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging Operator output docs: https://kube-logging.dev/docs/configuration/output/
- Logging Operator filter docs for `stdout`: https://kube-logging.dev/docs/configuration/plugins/filters/stdout/

## Issues Found
- The post used outdated Rancher UI navigation wording. I changed `Apps & Marketplace > Charts` to `Apps > Charts` and noted the older label for older Rancher 2.6 releases, matching Rancher’s current docs.
- The post said Fluentd runs as a Deployment or StatefulSet. For Rancher logging, Fluentd is deployed as a StatefulSet, so I corrected that.
- The Fluent Bit configuration snippet used unsupported and incorrectly cased chart values such as `input.tail.memBufLimit`, `path`, `parser`, `tag`, and `refreshInterval`. I replaced the snippet with supported Rancher chart values under `fluentbit.inputTail`, using the field names exposed by the chart.
- The example pod names were inaccurate for Rancher’s default root logging resources. I corrected them to the `rancher-logging-root-fluentbit-*` and `rancher-logging-root-fluentd-0` pattern.
- The Helm install example was incomplete for direct CLI installs because Rancher packages the CRDs as a separate `rancher-logging-crd` chart. I added the CRD installation step before the main chart install and noted that direct Helm installs should use chart versions compatible with the Rancher release.
- The `ClusterOutput` example used `stdout` as an output plugin, which is not a supported Fluentd output in Logging Operator. I replaced it with a valid `nullout` `ClusterOutput` and a `stdout` filter in the `ClusterFlow`, so the example still works for testing by printing logs to Fluentd stdout.
- The Helm upgrade example only upgraded the main chart. I added the CRD chart upgrade step so CLI upgrades stay aligned with Rancher’s packaged chart layout.
- The post referred to the project as the `Banzai Cloud Logging Operator`, which is outdated in current Rancher and upstream documentation. I updated it to `Logging Operator`.

## Review Notes
- For K3s and RKE2 clusters, collecting some control plane and node logs may require setting `systemdLogPath`, as documented by Rancher. The post remains technically correct for enabling the built-in stack, but that is a version and distribution-specific caveat to keep in mind.
