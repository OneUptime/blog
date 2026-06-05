# Validation Summary: How to Use Honeycomb Markers with OpenTelemetry to Annotate Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Honeycomb Markers
- Honeycomb API
- OpenTelemetry Python tracing
- Python
- GitHub Actions
- curl

## Sources Consulted
- Honeycomb Docs: Create a Marker - https://docs.honeycomb.io/api/markers/create-a-marker
- Honeycomb Docs: Manage Dataset Markers - https://docs.honeycomb.io/configure/datasets/manage-markers
- Honeycomb Docs: Manage Markers with CLI - https://docs.honeycomb.io/investigate/query/customize-results/marker-cli-reference
- Honeycomb Docs: API Introduction - https://docs.honeycomb.io/api/introduction
- OpenTelemetry Python API: opentelemetry.trace - https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Docs: Python Instrumentation - https://opentelemetry.io/docs/languages/python/instrumentation/
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Evaluate expressions in workflows and actions - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Python Docs: datetime - https://docs.python.org/3/library/datetime.html

## Issues Found
- The post described markers as annotations on trace visualizations. Honeycomb's documentation describes markers as vertical lines on graphs/query results, so the description and introduction were changed to refer to Honeycomb graphs.
- The examples used `HONEYCOMB_API_KEY`, which can be confused with a Honeycomb ingest key. Honeycomb's marker API requires a Configuration Key with Manage Markers permission, so the examples now use `HONEYCOMB_CONFIG_KEY`.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. It now uses `datetime.now(timezone.utc)`.
- The Python example imported `json` but did not use it. The unused import was removed.
- The Python helper checked `start_time` and `end_time` using truthiness. These fields are Unix timestamp integers, so the checks now use `is not None` to avoid dropping valid zero-valued timestamps.

## Review Notes
- The marker API endpoint, request fields, and curl examples match Honeycomb's current V1 marker API for dataset markers. Honeycomb also supports environment-wide markers by using `__all__` as the dataset slug with an API key associated with the target environment.
- The OpenTelemetry Python `trace.get_tracer`, `start_as_current_span`, `set_attribute`, and `record_exception` usage is current.
- GitHub Actions `job.status`, `always()`, and default environment variable usage are consistent with current GitHub documentation.
