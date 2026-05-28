# Validation Summary: How to Configure OpenTelemetry Sampling Strategies to Reduce Cost

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Trace
- Google Cloud Observability pricing
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector Google Cloud exporter
- OpenTelemetry Collector probabilistic sampling processor
- OpenTelemetry Collector tail sampling processor

## Sources Consulted
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- Google Cloud OpenTelemetry Python Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- OpenTelemetry Collector probabilistic sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Google Cloud exporter documentation: https://github.com/GoogleCloudPlatform/opentelemetry-operations-go/blob/main/exporter/collector/README.md
- Google Cloud Observability pricing documentation: https://cloud.google.com/products/observability/pricing

## Issues Found
- The custom Python sampler returned a tuple instead of `SamplingResult`, and its `should_sample` signature omitted the current `trace_state` argument. Updated the snippet to import and return `SamplingResult`, accept `trace_state`, and pass it through to the fallback sampler.
- The rule-based sampler introduction claimed it always sampled error traces, but head-based sampling cannot reliably know final error status at span start. Updated the text to describe the actual example: always sampling critical endpoints.
- The service-tier Collector example used older filter-style service matching for routing sampling decisions. Replaced it with a tail-sampling configuration using `and`, `string_attribute`, and `probabilistic` policies.
- The error-preservation Collector example used a filter processor condition that would drop error spans, not keep them. Removed the filter processor and used tail sampling with a `status_code` policy for errors plus a probabilistic fallback policy.
- The cost-estimation script ignored Cloud Trace's free monthly span allotment. Added a `free_monthly_spans` parameter and updated the sample output.

## Review Notes
The examples are technically valid as illustrative snippets. In production, tail sampling requires all spans for a trace to reach the same Collector instance, and the Google Cloud exporter requires appropriate Application Default Credentials and Cloud Trace IAM permissions.
