# Validation Summary: How to Use AWS Distro for OpenTelemetry (ADOT) vs Upstream Collector

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Distro for OpenTelemetry
- OpenTelemetry Collector and Collector Contrib
- Amazon ECS and AWS Fargate task definitions
- Amazon EKS add-ons and Kubernetes DaemonSets
- AWS X-Ray exporter
- AWS CloudWatch EMF exporter
- OpenTelemetry OTLP and OTLP/HTTP exporter
- IAM policies for ADOT
- OneUptime OTLP ingestion

## Sources Consulted
- AWS Distro for OpenTelemetry overview and FAQ: https://aws.amazon.com/otel/faqs/
- AWS Distro for OpenTelemetry releases and included Collector components: https://aws-otel.github.io/docs/releases/
- AWS Distro for OpenTelemetry EKS add-on getting started and installation docs: https://aws-otel.github.io/docs/getting-started/adot-eks-add-on and https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/installation/
- AWS Distro for OpenTelemetry EKS add-on advanced configuration docs: https://aws-otel.github.io/docs/getting-started/adot-eks-add-on/add-on-configuration
- AWS Distro for OpenTelemetry ECS configuration docs: https://aws-otel.github.io/docs/getting-started/ecs-configurations/ecs-config-section
- AWS Observability best practices for ADOT on ECS: https://aws-observability.github.io/observability-best-practices/guides/containers/oss/ecs/best-practices-metrics-collection-2/
- AWS Distro for OpenTelemetry permissions docs: https://aws-otel.github.io/docs/setup/permissions
- AWS X-Ray ADOT documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-adot.html
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib repository and release information: https://github.com/open-telemetry/opentelemetry-collector-contrib and https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector Contrib AWS X-Ray exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter
- OpenTelemetry Collector Contrib AWS CloudWatch EMF exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter
- OpenTelemetry Collector Contrib resource detection processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OneUptime OpenTelemetry ingestion docs: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The ADOT EKS add-on section said the add-on command deploys the collector as a managed component and pinned an outdated add-on version. Updated the text and command to state that `aws eks create-addon --addon-name adot` installs the ADOT Operator, with collectors deployed through the operator or add-on advanced configuration.
- The upstream contrib image example used `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated. Updated it to `0.153.0`, the latest official Collector Contrib release found during review.
- The ADOT diagram implied a direct Amazon OpenSearch exporter path from ADOT. Changed that target to OTLP-compatible backends to avoid implying a bundled OpenSearch exporter in the ADOT Collector.
- The OneUptime OTLP/HTTP exporter example used `https://otlp.oneuptime.com` without the JSON encoding and content type required by OneUptime's Collector example. Updated it to `https://oneuptime.com/otlp`, `encoding: json`, and `Content-Type: application/json`.
- The IAM policy was labeled minimal and omitted permissions listed in AWS's ADOT permissions guidance. Updated it to a common policy and added `xray:GetSamplingStatisticSummaries`, `logs:DescribeLogGroups`, and `logs:PutRetentionPolicy`.

## Review Notes
The remaining Collector YAML, Kubernetes manifests, ECS sidecar pattern, AWS X-Ray exporter settings, CloudWatch EMF exporter settings, and resourcedetection processor usage are consistent with current official documentation. For production use, readers should still query region-specific EKS add-on versions with `aws eks describe-addon-versions` and pin Collector images to a tested version rather than using mutable `latest` tags.
