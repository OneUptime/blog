# Validation Summary: How to Send Logs to Fluentd from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher logging
- Kubernetes
- Logging Operator
- Fluentd forward protocol
- Fluentd Elasticsearch output

## Sources Consulted
- Rancher logging architecture: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging-architecture.html
- Rancher `Outputs` and `ClusterOutputs`: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- Logging Operator `forward` output: https://kube-logging.dev/docs/configuration/plugins/outputs/forward/
- Logging Operator `tag_normaliser` filter: https://kube-logging.dev/docs/configuration/plugins/filters/tagnormaliser/
- Logging Operator `record_transformer` filter: https://kube-logging.dev/4.5/docs/configuration/plugins/filters/record_transformer/
- Logging Operator secret handling: https://kube-logging.dev/4.7/docs/configuration/plugins/outputs/secret/
- Fluentd `in_forward` input: https://docs.fluentd.org/input/forward
- Fluentd `out_forward` output: https://docs.fluentd.org/output/forward
- Fluentd container deployment and Elasticsearch plugin example: https://docs.fluentd.org/container-deployment/docker-compose
- Fluentd aggregator image README: https://github.com/fluent/fluentd-aggregator-docker-image
- Kubernetes StatefulSet requirements: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The basic `ClusterOutput` used `retry_max_interval: 30`, but the Logging Operator buffer schema expects a string time value. This was corrected to `30s`.
- The secure forward example omitted `transport: tls`, which Fluentd requires when sending to a TLS-enabled `in_forward` listener. This was added.
- The secure forward example used `valueFrom` for `tls_cert_path`. That field expects a file path, so it was changed to `mountFrom` to match Logging Operator secret-mount behavior.
- The Step 6 explanation said the flow would "preserve" tags, but `tag_normaliser` actually rewrites tags. The text was corrected to reflect retagging.
- The compression section presented `forward.compress` as universally available. Current Logging Operator docs support it, but older releases did not document it, so the text was narrowed to chart versions that expose that field.
- The in-cluster Fluentd manifest used `fluent/fluentd:v1.16`, which does not include the Elasticsearch plugin needed by the sample aggregator config. It was changed to the official Fluentd aggregator image that includes common aggregation plugins.
- The `StatefulSet` service was defined as a normal Service even though StatefulSets require a headless governing Service for stable network identity. `clusterIP: None` was added.
- The verification commands were too environment-specific. The Fluentd log check now uses a pod-name placeholder, and the metrics check now uses a generic `<aggregator-host>` placeholder.
- The duplicate-log troubleshooting note incorrectly described `require_ack_response: true` as exactly-once delivery. Fluentd documents this as at-least-once delivery, so the explanation was corrected.

## Review Notes
- The post still assumes the `fluentd-aggregator-config` ConfigMap contains the `fluentd.conf` shown in Step 1.
- `forward.compress` is present in current Logging Operator documentation, but compatibility should be checked on older Rancher logging chart versions.
