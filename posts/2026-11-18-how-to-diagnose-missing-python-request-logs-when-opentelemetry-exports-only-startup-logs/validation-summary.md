# Validation Summary: How to Diagnose Missing Python Request Logs with OpenTelemetry

## Status
validated

## Post Type
Technical troubleshooting guide with Python diagnostics and shell commands.

## Technologies Covered
- Python standard-library logging and logging configuration
- OpenTelemetry Python SDK, distro, and logging instrumentation
- OpenTelemetry Protocol (OTLP) and console log export
- Trace-context correlation and application worker lifecycle
- pip package inspection

## Sources Consulted
- Python logging reference: https://docs.python.org/3/library/logging.html
- Python logging configuration reference: https://docs.python.org/3/library/logging.config.html
- OpenTelemetry Python logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Python logs auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/logs-example/
- OpenTelemetry SDK environment-variable specification, exporter selection: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
- OpenTelemetry Python Logs SDK example and handler deprecation notice: https://opentelemetry-python.readthedocs.io/en/latest/examples/logs/README.html
- pip show command reference: https://pip.pypa.io/en/stable/cli/pip_show/

## Issues Found
No technical issues found.

## Review Notes
- Left the technical content of README.md unchanged. Its diagnostic code uses supported Python logging APIs and attributes. Extracted, compiled, and executed the Python code successfully; it printed the process ID and logger chain and emitted the WARNING probe.
- Confirmed effective-level gating, handler-level and filter checks during propagation, propagation boundaries, and the possibility of duplicate records when handlers overlap. Ancestor logger levels and filters are not reapplied to propagated records.
- Confirmed that full logging configuration can replace handlers, disable_existing_loggers defaults to true, and basicConfig(force=True) removes and closes existing root handlers. Existing loggers whose ancestors are explicitly configured are an exception to disabling; the post's qualified wording is consistent with this behavior.
- Confirmed the documented Python 1.40.0 transition from the older SDK logging opt-in to the logging instrumentation package's default handler installation. Trace-context injection and console formatting are separate from log export; the SDK LoggingHandler is deprecated, but the post does not recommend using it.
- Verified the pip command supports inspecting multiple packages. Confirmed the launcher syntax and console/none exporter selections against official documentation. The command assumes the required agent packages are installed and the reproduction application exists, consistent with the surrounding instructions.
- The WARNING probe is useful for investigating INFO suppression, but it is not an exhaustive route test: ERROR-or-higher thresholds, logger filters, or global logging disablement can also suppress it. The diagnostic is appropriately presented as part of a broader investigation.
- Testing correlation inside a sampled request is a useful verification step; sampling is not a prerequisite for a log record to carry a valid trace ID.
- The linked technical documentation resolves to the intended resources. Worker-specific checks are appropriate because startup output alone cannot establish the final logging configuration in every worker.
- Validation covered documentation and local execution of the standard-library diagnostic. No application server, OTLP collector, backend, or multi-worker deployment was supplied, so end-to-end export and worker lifecycle behavior were not runtime-tested.
- Format validation shortened the title to meet the 80-character limit and synchronized it with Blogs.json and this review heading.
