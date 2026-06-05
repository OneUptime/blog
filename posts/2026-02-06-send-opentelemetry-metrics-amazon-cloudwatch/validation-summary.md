# Validation Summary: How to Send OpenTelemetry Metrics to Amazon CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- AWS CloudWatch EMF exporter (`awsemf`)
- Amazon CloudWatch Logs and Metrics
- AWS CLI
- Python OpenTelemetry metrics SDK
- Node.js OpenTelemetry metrics SDK
- Docker
- IAM permissions

## Sources Consulted
- OpenTelemetry Collector Contrib AWS CloudWatch EMF exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awsemfexporter/README.md
- OpenTelemetry Collector Contrib AWS EMF exporter package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/awsemfexporter
- Amazon CloudWatch Embedded Metric Format documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html
- Amazon CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The collector image version was outdated (`0.98.0`). Updated the Docker pull and run examples to `0.153.0`, the current OpenTelemetry Collector Contrib release available during review.
- The `log_stream_name` example used an unsupported `{ServiceName}` placeholder. Replaced it with a static log stream name because the `awsemf` exporter documents placeholders such as `{TaskId}`, `{ClusterName}`, `{NodeName}`, `{ContainerInstanceId}`, and `{TaskDefinitionFamily}`, not `{ServiceName}`.
- The metric declarations used `service.name` as a dimension without enabling resource-to-telemetry conversion. Added `resource_to_telemetry_conversion.enabled: true` so resource attributes such as `service.name` become metric labels eligible for EMF dimensions.
- The post described `metric_name_selectors` as wildcard selectors. Corrected this to regular expressions and anchored the example selectors.
- The IAM policy included `cloudwatch:PutMetricData`, but EMF metric extraction from CloudWatch Logs does not require that permission. Removed it and kept CloudWatch Logs permissions.
- The Python HTTP example used old HTTP semantic convention attributes (`http.method`, `http.status_code`) and milliseconds for `http.server.request.duration`. Updated it to `http.request.method`, `http.response.status_code`, unit `s`, and seconds-based recording.
- The CloudWatch alarm threshold still assumed milliseconds. Updated the example from `500` to `0.5` seconds.
- The Node.js resource example used `new Resource(...)`, while current OpenTelemetry JavaScript docs use `defaultResource().merge(resourceFromAttributes(...))`. Updated the sample accordingly.
- The Node.js payment metrics and Python request count metric were not selected by `metric_declarations`, so they would be written as logs but not extracted as CloudWatch metrics. Added matching declarations/selectors.
- The `date -v-1H` example is BSD/macOS-specific while the post also uses GNU `date -d`. Updated the CloudWatch metric query example to use GNU `date -d '1 hour ago'` consistently.
- The explanation claimed EMF supports high-cardinality dimensions better than `PutMetricData`. Revised it to clarify that EMF can retain high-cardinality context in logs while selected low-cardinality fields become metric dimensions.

## Review Notes
The guide is technically valid after the fixes. The AWS CLI date examples now assume GNU `date`, which is common on Linux but not native on macOS.
