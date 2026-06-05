# Validation Summary: How to Version Control OpenTelemetry Sampling Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib tail sampling processor
- OpenTelemetry semantic conventions
- YAML configuration
- Python
- pytest
- GitHub Actions
- Docker

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- GitHub Actions Python build documentation: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-python
- actions/checkout README: https://github.com/actions/checkout
- actions/setup-python README: https://github.com/actions/setup-python

## Issues Found
- The tail sampling example included `decision: Sample` inside a `status_code` policy. The official tail sampling processor schema does not define a `decision` field for this policy; a matching sample policy is enough to sample the trace unless a drop policy overrides it. Removed the invalid field.
- The health check policy used the deprecated `http.target` semantic convention attribute. Updated it to `url.path`, which aligns with the current HTTP semantic conventions.
- The merge script added `processors.tail_sampling` but did not enable it in the traces pipeline. OpenTelemetry Collector processors are only active when referenced under `service.pipelines.<signal>.processors`. Updated the script to append `tail_sampling` to the traces pipeline.
- The sample pytest checks only inspected top-level policies, so they missed the nested probabilistic policies in the `and` policies shown in the same post. Added recursive policy iteration and used it in the relevant tests.
- The "Payment services must have 100% sampling" test only checked that the policy existed. Added assertions that the policy matches `service.name` and includes `payment-service`.

## Review Notes
The CI example uses `otel/opentelemetry-collector-contrib:latest`, which is valid for a general example but can make validation results change when the Collector image updates. Pinning a Collector version is recommended for production repositories.
