# Validation Summary: How to Use Contract Testing for OpenTelemetry Spans to Prevent Instrumentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing and semantic conventions
- OpenTelemetry Python SDK
- Python pytest
- GitHub Actions
- JSON configuration

## Sources Consulted
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python span export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- GitHub Actions Python build and test documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python

## Issues Found
- The post title was incomplete and omitted "Regressions". Updated the heading to match the post description and directory slug.
- The contract example used older OpenTelemetry semantic convention attributes: `http.method`, `http.status_code`, `db.system`, and `db.operation`. Updated them to current stable convention names: `http.request.method`, `http.response.status_code`, `db.system.name`, and `db.operation.name`.
- The post described the contract document as a JSON Schema, but the snippet is a custom JSON contract file rather than a formal JSON Schema. Updated the wording.
- The validator assumed exported spans expose `resource_attrs` and `children`. In the OpenTelemetry Python SDK, exported `ReadableSpan` objects expose resource attributes through `span.resource.attributes`, and child relationships must be derived from each span's `parent` span context. Updated the validator accordingly.
- The contract included `span_kind`, but the validator did not validate it. Added span kind validation for parent and child span contracts.
- The type checker treated `bool` as a valid `int` because Python's `bool` is a subclass of `int`. Added explicit type matching to keep OpenTelemetry primitive attribute types distinct.
- The test runner omitted required imports for `trace`, `Resource`, and `SimpleSpanProcessor`. Added the imports.
- The test fixture called `trace.set_tracer_provider()` before every test, but OpenTelemetry Python only allows setting the global tracer provider once. Moved provider setup to module scope and kept the fixture focused on clearing the in-memory exporter.
- The validator call did not pass the full span list, so child span checks could not work after removing the invalid `span.children` assumption. Updated the call to pass `spans`.

## Review Notes
The GitHub Actions workflow shape and pytest command are valid. The CI example intentionally remains generic because the exact dependency file and test path depend on the target repository.
