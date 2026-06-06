# Validation Summary: How to Apply Code Attribute Semantic Conventions for Source Location

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry tracing spans and exception events
- Python OpenTelemetry API and Python introspection
- Go OpenTelemetry API and Go runtime stack inspection
- JavaScript/TypeScript OpenTelemetry API and Node.js/V8 stack traces
- Source code linking from telemetry attributes

## Sources Consulted
- OpenTelemetry Code attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/code/
- OpenTelemetry code attributes semantic convention stability migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/code-attrs-migration/
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry exception semantic conventions for logs/events: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- Python inspect module docs: https://docs.python.org/3/library/inspect.html
- Go runtime.Caller docs: https://pkg.go.dev/runtime#Caller
- OpenTelemetry Go trace API docs: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- V8 stack trace API docs: https://v8.dev/docs/stack-trace-api
- Node.js Error stack trace docs: https://nodejs.org/api/errors.html

## Issues Found
- The post used deprecated experimental code attributes: `code.filepath`, `code.lineno`, `code.column`, and `code.namespace`. Updated examples and prose to use stable attributes: `code.file.path`, `code.line.number`, `code.column.number`, and fully qualified `code.function.name`.
- The post described `code.namespace` as a key attribute, but OpenTelemetry removed it during code attribute stabilization and folded namespace information into `code.function.name`. Removed `code.namespace` from examples and comments.
- Python examples used `stack_level=2` for direct calls inside a context manager, which points one frame too far up. Updated direct calls to use the default caller frame.
- The Go helper used `runtime.Caller(skip + 1)`, which captured the helper function instead of the instrumented caller when `skip=0`. Updated it to `runtime.Caller(skip + 2)`.
- The Go handler assigned `ctx` but did not use it, which would not compile. Changed it to `_`.
- The exception example referenced `functools` and `inspect` without importing them. Added the missing imports.
- The exception example used `code.stacktrace` for exception data. Updated the example to attach the stack trace as `exception.stacktrace` on the recorded exception event and kept `code.*` attributes for source location.

## Review Notes
The JavaScript stack parsing example is technically plausible for V8/Node.js, but stack string formats are implementation-dependent. The post already notes this fragility and recommends source maps for transpiled code.
