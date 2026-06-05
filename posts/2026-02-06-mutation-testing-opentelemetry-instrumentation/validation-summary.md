# Validation Summary: Use Mutation Testing for OpenTelemetry Instrumentation to Verify Span Coverage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `ast` module
- OpenTelemetry Python tracing API
- pytest
- GitHub Actions
- Mutation testing

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- Python `ast` module documentation: https://docs.python.org/3/library/ast.html
- GitHub Actions Python build and test documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python
- pytest command-line reference: https://docs.pytest.org/en/stable/reference/reference.html

## Issues Found
- The mutator did not implement the status-code mutation described in the post. I added detection for `set_status()` calls that set `StatusCode.ERROR` and changed the mutation to produce `StatusCode.OK`, matching the article's claimed mutation point.
- The mutation-point list said the mutator would remove both `set_status(ERROR)` and `set_status(OK)`, but the earlier explanation described changing ERROR to OK. I updated the list to match the implemented and documented mutation.
- Removing a `with tracer.start_as_current_span(...) as span:` block by returning only its body could leave `span` undefined, causing tests to fail because of a `NameError` instead of because instrumentation was missing. I changed the example to bind `span = trace.get_current_span()` before the original body so the mutant remains executable for the shown OpenTelemetry pattern.
- The status mutation originally would have produced an OK status with an error description if implemented as a direct enum swap. I made the example drop the description when changing `ERROR` to `OK`, consistent with OpenTelemetry status guidance.
- The Python snippets included unused imports (`sys`, `tempfile`, and `os`). I removed them while fixing the examples.

## Review Notes
The OpenTelemetry APIs used in the service example (`trace.get_tracer`, `start_as_current_span`, `Span.set_attribute`, `Span.add_event`, and `Span.set_status`) are current. The GitHub Actions and pytest snippets use valid commands and configuration. The mutator is still intentionally simple and line-based; a production mutator should use more precise node identity, handle imports more generally, and avoid `shell=True` when possible.
