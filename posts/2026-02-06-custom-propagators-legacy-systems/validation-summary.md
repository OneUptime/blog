# Validation Summary: How to Build Custom Propagators for Legacy Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry TextMapPropagator
- OpenTelemetry context propagation
- W3C Trace Context and W3C Baggage
- B3, Jaeger, AWS X-Ray, and OT Trace propagators
- Python packaging entry points
- Python Base64, JSON, and pytest examples
- Kafka-style message header carriers

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python `opentelemetry.propagators.textmap` API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry Python `opentelemetry.propagate` API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python `CompositePropagator` API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry SDK general configuration, including `OTEL_PROPAGATORS`: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Python GitHub repository package overview: https://github.com/open-telemetry/opentelemetry-python
- OpenTelemetry Python Contrib AWS X-Ray propagator documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/propagator/aws/aws.html

## Issues Found
- The post imported `TextMapPropagator` from `opentelemetry.context.propagation`, which does not exist in current OpenTelemetry Python. Updated all examples to import it from `opentelemetry.propagators.textmap`.
- The composite propagator example imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but the documented current import path is `opentelemetry.trace.propagation.tracecontext`. Updated the import.
- The post described a "zero span ID" while the code used `span_id=0x1`. A zero span ID would be invalid in OpenTelemetry, so the comment now says it uses a non-zero placeholder span ID.
- The post said the sampled flag was set because the legacy system sent the header. Since `X-Request-Id` has no sampling semantics, this is now described as an example policy that should be replaced if the legacy system has its own sampling signal.
- The Base64 JSON propagator did not catch `binascii.Error`, which can be raised by malformed Base64 input. Added `import binascii` and included `binascii.Error` in the exception handler.
- The post referred broadly to "official propagators" including third-party formats. Updated the wording to distinguish built-in and installable propagator packages.
- The list of example legacy formats mentioned binary formats even though `TextMapPropagator` is for text-based propagation. Narrowed the wording to encoded formats.
- The composite propagator explanation did not mention override behavior when multiple trace context formats are present. Added a note that later propagators can override context set by earlier propagators.

## Review Notes
The corrected examples were smoke-tested against OpenTelemetry Python `opentelemetry-api==1.42.1` and `opentelemetry-sdk==1.42.1` using a temporary package target directory. The custom propagator entry point snippets match the documented `opentelemetry_propagator` group and `OTEL_PROPAGATORS` behavior.
