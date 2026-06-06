# Validation Summary: How to Write Assertion Rules on Span Attributes and Timing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Tracetest test definitions
- Tracetest selectors and assertions
- Tracetest CLI
- Tracetest Test Suites and outputs
- OpenTelemetry span attributes and semantic conventions

## Sources Consulted
- Tracetest Selectors documentation: https://docs.tracetest.io/concepts/selectors
- Tracetest test specification documentation: https://docs.tracetest.io/cli/creating-test-specifications
- Tracetest test definition documentation: https://docs.tracetest.io/cli/creating-tests
- Tracetest test outputs documentation: https://docs.tracetest.io/cli/creating-test-outputs
- Tracetest Test Suite definition documentation: https://docs.tracetest.io/cli/creating-test-suites
- Tracetest Test Suite CLI documentation: https://docs.tracetest.io/cli/running-test-suites
- Tracetest CLI reference for `tracetest run`: https://docs.tracetest.io/cli/reference/tracetest_run
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/

## Issues Found
- The examples used the legacy OpenTelemetry HTTP attribute `http.status_code`. I changed these assertions to `http.response.status_code`, which is the current stable OpenTelemetry HTTP semantic convention.
- The database examples used older `db.operation` and `db.system` attribute names. I changed them to `db.operation.name` and `db.system.name` to match the current OpenTelemetry database semantic conventions.
- One selector used `attr:cache.hit` inside the selector predicate. Tracetest selectors filter by attribute name directly, while `attr:` is used in assertions and expressions, so I changed it to `cache.hit`.
- The span relationship section described parent-child validation, but the example selected spans independently. I changed the database and payment selectors to use Tracetest descendant selector syntax.
- The payment example claimed it verified that the payment call happened after the database insert, but the assertions did not compare timing or ordering. I changed the wording to verify that the payment call happened during order creation.
- The error scenario comment said an order insert would not persist, but the assertion only checked for a rollback span. I changed the comment to match the assertion.
- The outputs section said values are extracted from one test step and used in another. Tracetest outputs are primarily used to make values available to later tests in a Test Suite, so I corrected that wording.
- The Test Suite example used `spec.tests`, but the documented YAML field is `spec.steps`. I changed the field to `steps`.
- The CLI example used `--wait-for-result`, but the current `tracetest run` reference waits by default and provides `--skip-result-wait` for the opposite behavior. I removed `--wait-for-result`.

## Review Notes
The Tracetest CLI is not installed in the local environment, so the command was verified against the official CLI reference rather than local `tracetest --help` output.
