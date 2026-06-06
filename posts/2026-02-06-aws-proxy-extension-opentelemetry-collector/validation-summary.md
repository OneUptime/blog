# Validation Summary: How to Configure the AWS Proxy Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib AWS Proxy Extension
- AWS Signature Version 4
- AWS IAM roles and AWS SDK credential resolution
- Amazon EC2 instance profiles
- Amazon EKS IAM Roles for Service Accounts
- AWS X-Ray
- Amazon CloudWatch Logs

## Sources Consulted
- OpenTelemetry Collector extension component list: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector Contrib AWS Proxy Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/awsproxy
- OpenTelemetry Collector Contrib AWS Proxy Extension source and schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/internal/aws/proxy
- OpenTelemetry Collector Contrib SigV4 Authenticator Extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/sigv4authextension
- OpenTelemetry Collector Contrib AWS CloudWatch Logs Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awscloudwatchlogsexporter
- OpenTelemetry Collector Contrib AWS X-Ray Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter
- AWS CloudWatch OpenTelemetry Collector setup documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-OTLPSimplesetup.html
- AWS SDK for Go credential configuration documentation: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-gosdk.html
- AWS Signature Version 4 documentation: https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html

## Issues Found
- The original post described `awsproxy` as a general Collector authentication layer for AWS exporters. I corrected this: `awsproxy` is a local HTTP signing proxy and must be called through its configured listener endpoint.
- The original snippets used unsupported `awsproxy` fields including `credential_chain`, nested `endpoint` service maps, `assume_role`, `cache`, `parallel_refresh`, `rate_limit`, `connection_pool`, `logging`, `metrics`, and `audit`. I replaced those snippets with supported fields: `endpoint`, `proxy_address`, `tls`, `region`, `role_arn`, `aws_endpoint`, `local_mode`, and `service_name`.
- The original EKS IRSA example configured web identity fields under `awsproxy`. I corrected it to rely on the AWS SDK credential provider behavior used by the Collector process.
- The original cross-account examples used unsupported `external_id`, `role_session_name`, and `duration_seconds` under `awsproxy`. I corrected the example to use only `role_arn` for the proxy and noted the required `sts:AssumeRole` permission.
- The original regional routing example used the deprecated/incorrect processor-style `routing` configuration and implied `awsproxy` routes telemetry pipelines. I replaced it with multiple valid proxy instances, each with its own listener, region, and service.
- The original VPC endpoint example used unsupported nested per-service endpoint and DNS resolver fields. I replaced it with the supported `aws_endpoint`, `proxy_address`, and `tls.insecure` settings.
- The original performance and monitoring sections listed unsupported proxy settings and undocumented metrics. I corrected those sections to explain what the proxy actually exposes and pointed direct telemetry export tuning to exporter-supported queue and retry settings.
- The original CloudTrail audit example used unsupported `audit` configuration. I corrected the guidance to configure CloudTrail in AWS, not in the Collector extension.
- The original production example mixed unsupported `awsproxy` settings with direct AWS exporters as if the extension authenticated those exporters. I separated the valid proxy configuration from direct AWS exporter configuration.

## Review Notes
The AWS Proxy Extension is beta in the OpenTelemetry Collector Contrib distribution. Direct AWS exporters such as `awscloudwatchlogs` and `awsxray` remain the better documented path for normal Collector telemetry pipelines; `sigv4auth` is the documented authenticator extension for HTTP exporters such as `otlphttp` when sending to AWS OTLP endpoints.
