# Validation Summary: How to Configure SigV4 Auth Extension for AWS in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib SigV4 auth extension
- Prometheus Remote Write exporter
- Amazon Managed Service for Prometheus
- AWS X-Ray exporter
- AWS CloudWatch Logs exporter
- AWS IAM roles, IRSA, and EC2 instance profiles
- AWS Signature Version 4
- Kubernetes manifests

## Sources Consulted
- OpenTelemetry Collector Contrib SigV4 Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/sigv4authextension
- OpenTelemetry Collector Contrib SigV4 extension config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/sigv4authextension/config.go
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README and metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector Contrib AWS X-Ray exporter README and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter
- OpenTelemetry Collector Contrib AWS CloudWatch Logs exporter README and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awscloudwatchlogsexporter
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector Contrib resourcedetection processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- AWS Signature Version 4 documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
- AWS SDK for Go credential configuration documentation: https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html
- Amazon Managed Service for Prometheus RemoteWrite API documentation: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-APIReference-RemoteWrite.html
- AWS Service Authorization Reference for Amazon Managed Service for Prometheus: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonmanagedserviceforprometheus.html

## Issues Found
- The post incorrectly showed the SigV4 auth extension attached to `awsxray` exporters. The AWS X-Ray exporter signs requests through AWS SDK credential resolution and does not accept `auth.authenticator`, so the X-Ray examples were corrected to remove the SigV4 extension and auth blocks.
- The post incorrectly showed the SigV4 auth extension attached to `awscloudwatchlogs` exporters. The CloudWatch Logs exporter also uses AWS SDK credential resolution directly and requires `log_stream_name`, so the examples were corrected to remove the invalid auth blocks and include a stream name where needed.
- The AssumeRole and EC2 examples used AWS X-Ray to demonstrate the SigV4 extension. Those examples were changed to Amazon Managed Service for Prometheus remote write, where `auth.authenticator: sigv4auth` is supported.
- The production example used the removed/deprecated `logging` exporter with `loglevel`. It was updated to the current `debug` exporter with `verbosity`.
- The production example configured `sending_queue` on the Prometheus Remote Write exporter. The current exporter uses `remote_write_queue`, so the field was corrected.
- Introductory wording and the architecture diagram implied the SigV4 auth extension was the right path for CloudWatch Logs and X-Ray exporters. The wording was narrowed to AMP and clarified that X-Ray and CloudWatch Logs use AWS SDK signing.
- The default credential chain comments were incomplete. They were updated to include shared config files, web identity credentials such as IRSA, ECS task credentials, EKS Pod Identity container credentials, and EC2 instance metadata.

## Review Notes
Validated standalone Collector YAML examples with `otel/opentelemetry-collector-contrib:0.153.0 validate` where they do not require real AWS STS role assumption or Kubernetes/EKS runtime metadata. For examples containing EC2/EKS resource detectors, copied configs were normalized to `detectors: [env]` to verify the rest of the Collector schema outside AWS/Kubernetes. All YAML blocks parsed successfully. `kubectl` was not installed, so Kubernetes manifest validation was limited to YAML parsing and manual review against Kubernetes object structure.
