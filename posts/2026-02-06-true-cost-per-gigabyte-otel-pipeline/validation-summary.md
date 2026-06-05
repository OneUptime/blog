# Validation Summary: Calculate the True Cost per Gigabyte of OpenTelemetry Data Across Your Pipeline

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry Python
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Transformation Language (OTTL)
- Prometheus exporter
- AWS EC2, EBS, S3, and data transfer pricing
- Python
- YAML
- Mermaid

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector components documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- AWS architecture guidance on data transfer costs: https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/
- Amazon EBS pricing documentation: https://aws.amazon.com/ebs/pricing/
- Amazon S3 pricing documentation: https://aws.amazon.com/s3/pricing/
- Amazon EC2 On-Demand pricing documentation: https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The Python SDK overhead benchmark used `ConsoleSpanExporter`, which measures console output overhead in addition to SDK span creation and processing. Replaced it with a minimal `DropSpanExporter` based on the documented `SpanExporter` API so the benchmark does not include console or network I/O.
- The post stated a typical 1-5% CPU overhead as if it were generally reliable. Changed the note to clarify that overhead varies by SDK, exporter, sampling, and workload.
- The Collector sizing section presented a fixed spans-per-second rule. Reworded it as a starting estimate that must be validated against the actual Collector configuration and payload shape.
- The Collector cost worksheet listed c5.large at $95/month. Updated the example to $62/month for Linux on-demand in us-east-1 and adjusted the derived processing cost.
- The OTLP compression section named zstd alongside gzip. The OTLP exporter specification currently standardizes gzip, so the wording and code comment now refer to gzip and advise measuring the actual compression ratio.
- The AWS network example labeled same-AZ transfer as $0.01/GB. Updated it to $0.00/GB for same-AZ private networking and clarified the cross-AZ example as $0.01/GB each direction.
- The storage table used `$0.023 (EBS)`, which is not the documented gp3 EBS storage example rate. Updated the self-hosted ClickHouse row to use `$0.08 (EBS gp3, region-dependent)` and adjusted the example cost.
- The table called `$0.023` "S3 cold storage." Updated the row to "S3 Standard storage," which matches the cited S3 Standard example pricing.
- Updated the final roll-up calculation to reflect the corrected Collector cost.

## Review Notes
The Prometheus exporter and transform processor snippets are partial Collector configuration fragments, but the component names, `endpoint` field, `metric_statements`, `context: datapoint`, and OTTL `set(attributes[...], ...)` usage match current upstream Collector documentation. Cloud prices vary by region and can change, so the examples should remain labeled as illustrative rather than authoritative pricing guidance.
