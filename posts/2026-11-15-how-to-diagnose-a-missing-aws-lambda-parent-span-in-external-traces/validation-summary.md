# Validation Summary: How to Diagnose a Missing AWS Lambda Parent Span in External Traces

## Status

Validated through documentation review and the local checks listed below.

## Post Type

Practical troubleshooting tutorial.

## Technologies Covered

OpenTelemetry, AWS

## Sources Consulted

- https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
- https://opentelemetry.io/docs/platforms/faas/lambda-auto-instrument/

## Issues Found

No unresolved structural issues found. Environment-dependent validation is identified below.

## Review Notes

- Reviewed technical guidance against the linked official documentation.
- Checked title length, canonical tags, unique title and slug, required metadata, and fenced code structure.
- Python examples parsed with Python ast; no external services were contacted.
- Shell examples passed bash -n syntax checks; commands were not run against infrastructure.
- Reviewed AWS-managed segment and community Lambda layer documentation; parsed Python and shell. No AWS API call or Lambda invocation was executed.
- Executed 1 Python example(s) locally using their embedded illustrative inputs; all completed successfully. This did not exercise a telemetry backend or production workload.
