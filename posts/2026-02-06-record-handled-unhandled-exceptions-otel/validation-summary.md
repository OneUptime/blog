# Validation Summary: How to Configure OpenTelemetry to Record Both Handled and Unhandled Exceptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- Flask error handling
- Express.js error handling middleware
- Node.js process exception events
- OpenTelemetry Collector span metrics connector
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript Span API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- Flask error handling documentation: https://flask.palletsprojects.com/en/stable/errorhandling/
- Express error handling documentation: https://expressjs.com/en/guide/error-handling/
- Node.js process event documentation: https://nodejs.org/api/process.html
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md

## Issues Found
- The Python examples manually set `exception.escaped` as an event attribute. The current OpenTelemetry Python API exposes `record_exception(..., escaped=...)`, so the examples now use that argument for handled and unhandled exceptions.
- The Flask catch-all `@app.errorhandler(Exception)` example would also catch Werkzeug `HTTPException` subclasses such as 404 and 405 and turn them into 500 responses. The example now passes `HTTPException` instances through unchanged.
- The Express error middleware did not handle the `res.headersSent` case. Express documentation recommends delegating to the default error handler when headers have already been sent, so the example now calls `next(err)` in that case.
- The PromQL examples used `traces_spanmetrics_calls_total`, which does not match the current spanmetrics connector default namespace when normalized for Prometheus. The examples now use `traces_span_metrics_calls_total` and note that `error.handled` must be configured as a spanmetrics dimension before it appears as the `error_handled` label.

## Review Notes
The OpenTelemetry trace exception semantic convention focuses on exceptions that remain unhandled when the span ends. Recording handled exceptions can still be useful as application-level telemetry, but teams should decide carefully whether expected handled failures should set span status to `ERROR`, since that affects spanmetrics error rates and alerting.
