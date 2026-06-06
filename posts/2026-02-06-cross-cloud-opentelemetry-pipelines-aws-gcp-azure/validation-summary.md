# Validation Summary: How to Set Up Cross-Cloud OpenTelemetry Pipelines (AWS + GCP + Azure)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK for Node.js
- OpenTelemetry Collector and Collector Contrib
- OTLP gRPC and HTTP receivers/exporters
- AWS X-Ray exporter and AWS resource detection
- Google Cloud exporter and GCP resource detection
- Azure Monitor exporter and Azure resource detection
- W3C Trace Context propagation
- Python OpenTelemetry propagation APIs
- Tail sampling, attributes processor, batch processor, and file storage extension

## Sources Consulted
- OpenTelemetry JS SDK Node README: https://www.npmjs.com/package/@opentelemetry/sdk-node
- OpenTelemetry JS 2.x upgrade notes for resources API: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry AWS resource detector README: https://www.npmjs.com/package/@opentelemetry/resource-detector-aws
- OpenTelemetry GCP resource detector README: https://www.npmjs.com/package/@opentelemetry/resource-detector-gcp
- Azure Monitor OpenTelemetry for JavaScript README: https://www.npmjs.com/package/@azure/monitor-opentelemetry
- OpenTelemetry Collector OTLP receiver docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP exporter docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector Contrib resource detection processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib AWS X-Ray exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsxrayexporter/README.md
- OpenTelemetry Collector Contrib Google Cloud exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md
- OpenTelemetry Collector Contrib Azure Monitor exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuremonitorexporter/README.md
- OpenTelemetry Collector Contrib tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector attributes processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector file storage extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector exporter helper persistent queue docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md

## Issues Found
- The JavaScript example used `new Resource(...)` from `@opentelemetry/resources`. In OpenTelemetry JS 2.x, the `Resource` class is no longer exported for resource creation; changed it to `resourceFromAttributes(...)`.
- The Collector examples used `resourcedetection`, which current Collector Contrib docs describe as a deprecated alias. Updated the processor type and pipeline references to `resource_detection`.
- The AWS Collector example listed detectors as `[env, ec2, ecs, eks]`. Current resource detection docs recommend AWS detector ordering of `lambda`, `elastic_beanstalk`, `eks`, `ecs`, `ec2` because the first detector wins when attributes overlap. Updated the example to `[env, eks, ecs, ec2]`.
- The Azure deployment text implied the Azure detector alone covers AKS. Updated the wording to point AKS users to the `aks` detector or `k8sattributes` processor, while keeping the shown VM/Azure metadata detector config intact.
- The persistent queue example configured `file_storage` but did not enable it under `service.extensions`. Added `service: extensions: [file_storage]` to make the snippet complete.

## Review Notes
The remaining Collector component names and fields checked out against current official docs. The OTLP, AWS X-Ray, Google Cloud, Azure Monitor, attributes, tail sampling, and persistent queue configuration fields are current as of June 6, 2026. I did not run a live Collector config validation because no `otelcol` or `otelcol-contrib` binary was available locally.
