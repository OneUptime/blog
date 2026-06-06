# Validation Summary: How to Compare OpenTelemetry Collector vs Fluent Bit

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib filelog receiver
- OpenTelemetry Collector k8sattributes processor
- OpenTelemetry Collector Kubernetes Operator
- Fluent Bit
- Fluent Bit Kubernetes filter
- Fluent Bit tail input
- Fluent Bit OpenTelemetry output
- Kubernetes DaemonSet
- OTLP

## Sources Consulted
- Fluent Bit documentation: https://docs.fluentbit.io/manual
- Fluent Bit YAML configuration documentation: https://docs.fluentbit.io/manual/4.2/administration/configuring-fluent-bit/yaml
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Fluent Bit tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit OpenTelemetry output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/opentelemetry
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Helm chart logs collection documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector contrib stanza container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector contrib stanza severity parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- AWS CloudWatch Container Insights EKS logging documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-EKS-logs.html
- Amazon EKS Fargate logging documentation: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html

## Issues Found
- The Fluent Bit YAML support note said YAML was added in version 2.0. Updated it to say YAML became production-ready in 2.0 and is the standard format as of 3.2.
- The Fluent Bit Kubernetes tail example used `Parser docker`, which is incomplete for current Kubernetes container logs. Updated it to `multiline.parser docker, cri`, matching the current Fluent Bit Kubernetes and tail input documentation.
- The OpenTelemetry Collector Kubernetes log example used `json_parser` against `/var/log/containers/*.log`, which only fits Docker JSON logs and does not extract Kubernetes metadata from pod log paths. Updated it to read `/var/log/pods/*/*/*.log`, enable `include_file_path: true`, and use the `container` operator for Docker, CRI-O, and containerd formats.
- The OpenTelemetry Collector parsing example said `severity_parser` converts a status code to an integer. Updated the comment to correctly describe mapping status code ranges to log severity.
- The Kubernetes DaemonSet snippet was missing `template.metadata.labels`, so its selector would not match the pod template. Added the matching `app: fluent-bit` label.
- The OpenTelemetry Operator description overstated auto-discovery and automatic configuration. Updated it to the documented behavior: managing Collector custom resources and supporting auto-instrumentation injection.
- The README was empty in the worktree at review time, while the task supplied the full post content and Git showed the original content as deleted. Restored the reviewed post content with the technical fixes above.

## Review Notes
- YAML snippets were parsed successfully with PyYAML after the edits.
- Resource usage numbers are reasonable as practical guidance but should be treated as workload-dependent rather than guaranteed limits.
