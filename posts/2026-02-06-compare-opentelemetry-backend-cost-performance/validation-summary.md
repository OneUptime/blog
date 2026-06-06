# Validation Summary: How to Compare OpenTelemetry Backend Options for Cost and Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Jaeger
- Elasticsearch
- Cassandra
- ClickHouse
- Prometheus
- Thanos
- Cortex
- AWS EC2 and S3 pricing
- YAML configuration
- curl benchmarking commands

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- Jaeger storage backends documentation: https://www.jaegertracing.io/docs/2.16/storage/
- Jaeger v2 Elasticsearch storage documentation: https://jaeger.website.cncfstack.com/docs/2.1/storage/elasticsearch/
- Jaeger v2 Cassandra storage documentation: https://jaeger.website.cncfstack.com/docs/2.1/storage/cassandra/
- Jaeger UI API client source for HTTP query path examples: https://github.com/jaegertracing/jaeger-ui
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Thanos object storage documentation: https://thanos.io/v0.22/thanos/storage.md/
- ClickHouse compression documentation: https://clickhouse.com/engineering-resources/database-compression
- AWS EC2 On-Demand pricing page and AWS public pricing API: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS S3 public pricing API for us-east-1 Standard storage rates.

## Issues Found
- The self-hosted cost table used AWS us-east-1 instance types but the EC2 compute totals did not match current on-demand Linux pricing for the named instances. Updated the compute and total monthly estimates for the listed i3.2xlarge, i3.xlarge, and m5.4xlarge node counts.
- The benchmark commands implied a generic trace backend API, but the shown `/api/traces` paths are Jaeger-style HTTP JSON APIs. Added a note that backends without Jaeger's HTTP API need equivalent paths and parameters.
- The Jaeger search examples used human-readable `lookback` values and a non-JSON tag encoding. Updated them to millisecond lookback values and URL-encoded JSON tags.
- The latency aggregation example used a generic `/api/metrics` endpoint that is not the Jaeger SPM metrics shape. Updated it to a Jaeger-style `/api/metrics/latencies` example.
- The OpenTelemetry Collector dual-write YAML referenced `otlp`, `batch`, and two exporters in the pipeline without defining them. Added minimal `receivers`, `processors`, and `exporters` sections so the snippet has the required Collector configuration structure.

## Review Notes
The article's numeric capacity and storage-per-span estimates are still approximate sizing guidance rather than reproducible benchmark results. The post correctly warns that actual costs and performance vary significantly by configuration and workload.
