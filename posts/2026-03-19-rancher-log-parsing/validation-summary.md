# Validation Summary: How to Configure Log Parsing in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Logging
- Kubernetes
- Fluentd
- Fluent Bit
- Logging operator
- YAML
- `kubectl`

## Sources Consulted
- Rancher documentation: Flows and ClusterFlows - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/flows-and-clusterflows.html
- Rancher documentation: Outputs and ClusterOutputs - https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- Rancher documentation: Logging Architecture - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/logging-architecture.html
- Rancher documentation: Role-based Access Control for Logging - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/rbac-for-logging.html
- Logging operator documentation: Fluentd Parser filter - https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging operator documentation: Exception Detector filter - https://kube-logging.dev/docs/configuration/plugins/filters/detect_exceptions/
- Logging operator documentation: Record Transformer filter - https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Logging operator documentation: Fluent Bit collector - https://kube-logging.dev/5.4/docs/logging-infrastructure/fluentbit/
- Fluentd documentation: parser filter - https://docs.fluentd.org/filter/parser
- Fluentd documentation: Parse Section - https://docs.fluentd.org/configuration/parse-section
- Fluentd documentation: regexp parser - https://docs.fluentd.org/parser/regexp
- Fluentd documentation: syslog parser - https://docs.fluentd.org/parser/syslog
- Fluent Bit documentation: multiline parsing - https://docs.fluentbit.io/manual/data-pipeline/parsers/multiline-parsing
- Rancher charts source: `rancher-logging` fluentbit agent template - https://github.com/rancher/charts/blob/master/charts/rancher-logging/109.0.0%2Bup4.10.0-rancher.23/templates/_generic_fluentbitagent.yaml

## Issues Found
- The post used `suppress_parse_error_log` in Fluentd parser filter examples. That option is not supported by the Fluentd v1 parser filter, so it was removed and the explanation/performance note were updated to use `emit_invalid_record_to_error` correctly.
- The JSON parser examples used `time_format: "%Y-%m-%dT%H:%M:%S.%NZ"` while the sample timestamps in the post were ISO 8601 strings without fractional seconds. These examples were changed to `"%iso8601"` so they match the sample data and current Fluentd parsing guidance.
- The custom multiline parser example used `fluentbit.config.customParsers`, which does not match Rancher's `rancher-logging` chart overlay structure. It was corrected to use `fluentbitAgentOverlay.customParsers`.
- The validation section suggested checking Fluentd logs for parsed application records and used an ephemeral `kubectl run --rm -it` pod. That is not a reliable validation flow, so it was replaced with a non-interactive test pod and a Fluentd log check focused on parser/configuration errors.

## Review Notes
- The examples consistently use `key_name: log`. That is common in Rancher logging pipelines, but the underlying parser filter can also use the container-runtime default field when `key_name` is omitted.
- The `detectExceptions` filter is valid, but it is mutually exclusive with the `tag_normaliser` filter according to the Logging operator documentation.
