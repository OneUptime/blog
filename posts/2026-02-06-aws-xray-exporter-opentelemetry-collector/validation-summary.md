# Validation Summary: How to Configure the AWS X-Ray Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- AWS X-Ray exporter
- AWS IAM
- AWS VPC interface endpoints / PrivateLink
- AWS ECS, EKS, EC2, and Lambda
- OpenTelemetry Collector processors, connectors, exporters, extensions, and internal telemetry
- AWS CLI

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector contrib awsxrayexporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awsxrayexporter
- OpenTelemetry Collector contrib routingconnector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector contrib resourcedetectionprocessor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- AWS Distro for OpenTelemetry X-Ray exporter guide: https://aws-otel.github.io/docs/getting-started/x-ray/
- AWS X-Ray migration documentation for OpenTelemetry Collector usage: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html
- AWS CLI create-vpc-endpoint command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS X-Ray VPC endpoint announcement / PrivateLink support: https://aws.amazon.com/about-aws/whats-new/2021/05/aws-x-ray-now-supports-vpc-endpoints/
- AWS ADOT Lambda layer announcement: https://aws.amazon.com/blogs/opensource/aws-distro-for-opentelemetry-adds-lambda-layers-for-more-languages-and-collector/

## Issues Found
- The explicit credentials example used an unsupported `aws_auth` block for the `awsxray` exporter. Replaced it with environment-based credential configuration using the default AWS credential chain.
- The X-Ray VPC endpoint CLI example omitted `--vpc-endpoint-type Interface` and mixed gateway endpoint route-table options with interface endpoint subnet options. Updated the command to create an interface endpoint with subnets, security groups, and private DNS.
- The VPC endpoint snippet described `no_verify_ssl: false` as disabling endpoint resolution. Corrected the comment to state that TLS certificate verification remains enabled.
- The multi-region example used the removed/old routing processor shape with `from_attribute`, `exporters`, and `default_exporters`. Replaced it with the current `routing` connector configuration and routed pipelines.
- The production example configured unsupported `retry_on_failure` and `sending_queue` keys under `awsxray`. Replaced them with exporter-supported upload settings: `num_workers`, `request_timeout_seconds`, and `max_retries`.
- The production transform example set numeric status codes directly. Updated it to use the current OTTL enum `STATUS_CODE_ERROR`.
- The production internal metrics example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with a Prometheus pull reader using `host` and `port`.
- The production resource detection list included `eks` alongside ECS/EC2 detectors, which can fail collector startup when not running in an EKS cluster. Removed `eks` from the generic production example and added an EKS-specific note in the container section.
- The Lambda deployment text referred to a sidecar container. Updated it to refer to a Lambda layer or Lambda extension in a container image.
- The hybrid exporter example described `otlphttp` as an Elasticsearch backend. Corrected the wording to "OTLP-compatible backend."

## Review Notes
Validated key corrected Collector configurations with `otel/opentelemetry-collector-contrib:0.153.0 validate`. Some examples remain intentionally partial snippets, but the complete and corrected examples use current component names and supported fields.
