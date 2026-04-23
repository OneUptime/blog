# Validation Summary: How to Set Up Multi-Cluster Logging in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging
- Logging operator
- Fluent Bit
- Fluentd
- OpenSearch
- Amazon S3
- Fleet
- Helm

## Sources Consulted
- SUSE Rancher logging docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging.html
- SUSE Rancher logging architecture: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging-architecture.html
- SUSE Rancher Flows and ClusterFlows docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/flows-and-clusterflows.html
- SUSE Rancher Outputs and ClusterOutputs docs: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- SUSE Rancher logging best practices: https://documentation.suse.com/en-us/cloudnative/rancher-srfa/latest/en/observability/logging/best-practices.html
- Logging operator log routing docs: https://kube-logging.dev/4.7/docs/configuration/log-routing/
- Logging operator ClusterFlow CRD docs: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging operator FlowSpec docs: https://kube-logging.dev/docs/configuration/crds/v1beta1/flow_types/
- Logging operator OpenSearch output docs: https://kube-logging.dev/docs/configuration/plugins/outputs/opensearch/
- Logging operator Amazon S3 output docs: https://kube-logging.dev/docs/configuration/plugins/outputs/s3/
- Logging operator Tag Normaliser docs: https://kube-logging.dev/docs/configuration/plugins/filters/tagnormaliser/
- Logging operator secret handling docs: https://kube-logging.dev/docs/configuration/plugins/outputs/secret/
- Fluentd `record_transformer` docs: https://docs.fluentd.org/filter/record_transformer
- Fluentd OpenSearch output docs: https://docs.fluentd.org/output/opensearch
- Rancher charts index and packaged chart metadata: https://charts.rancher.io/index.yaml
- Fleet GitRepo reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet target selection docs: https://fleet.rancher.io/0.10/gitrepo-targets
- OpenSearch Alerting API docs: https://docs.opensearch.org/latest/observing-your-data/alerting/api/
- OpenSearch trigger docs: https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/
- OpenSearch action docs: https://docs.opensearch.org/latest/observing-your-data/alerting/actions/

## Issues Found
- The Helm install example was incomplete for direct CLI usage. The published `rancher-logging` chart expects the CRD chart to be installed separately in Rancher packaging, and the chart defaults `logging.enabled` to `false`. I updated the commands to install `rancher-logging-crd` first and to install `rancher-logging` with `--set logging.enabled=true`.
- The OpenSearch `ClusterOutput` used an invalid dynamic `index_name`, a `template_file` path where the operator expects a secret-backed file reference, and `type_name: _doc`, which is not the recommended current configuration for OpenSearch. I replaced those with documented `logstash_format`, `logstash_prefix`, and `suppress_type_name` settings.
- The `ClusterFlow` match rules were ordered incorrectly. In the original version, `select` matched everything before the later `exclude` rule could run, so the exclusion would never apply. I changed the flow to exclude first and then use an empty `select` to include the remaining logs.
- The S3 archive example used a dynamic record placeholder in `path` and extra time-slice settings that were not aligned with the current Logging Operator S3 output documentation. I replaced that with a documented date-based `path` and the standard `buffer.timekey` settings.
- The `tag_normaliser` example used `${namespace}`, but the supported Kubernetes metadata variable is `${namespace_name}`. I corrected the format string.
- The OpenSearch alerting JSON was incomplete and mixed an outdated trigger structure with invalid message-template variables. I replaced it with a valid query-level monitor request body that includes `enabled`, `schedule`, `severity`, a current-style time range filter, and a Mustache message template that uses supported `ctx` paths.

## Review Notes
- The current Rancher logging chart versions are gated by Rancher and Kubernetes compatibility ranges, so the exact chart version used in production should be checked against the target Rancher release at publish time.
- The examples inject `cluster_name` as a static field. In a real Fleet rollout, that value should typically be parameterized per cluster or overlaid per target.
- The OpenSearch alert example still assumes a pre-created notification destination identified by `destination_id`.
