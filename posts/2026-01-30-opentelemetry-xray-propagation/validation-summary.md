# Validation Summary: How to Build OpenTelemetry X-Ray Propagation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (Node.js SDK, Python SDK, Collector)
- AWS X-Ray (trace header format, propagation, ID generator)
- W3C Trace Context (`traceparent` / `tracestate`)
- AWS Lambda, API Gateway, DynamoDB
- TypeScript / Node.js
- Python (Flask, requests)
- OpenTelemetry Collector (otlp, awsxray, otlphttp, batch processor, resource processor)
- AWS Distro for OpenTelemetry (ADOT) Lambda layers

## Sources Consulted
- AWS X-Ray concepts and trace header format: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
- AWS Lambda environment variables (`_X_AMZN_TRACE_ID`): https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry JS CompositePropagator source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-core/src/propagation/composite.ts
- OpenTelemetry Python CompositePropagator source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/propagators/composite.py
- OpenTelemetry Collector `logging` → `debug` exporter migration (GH issue #11337): https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- `@opentelemetry/propagator-aws-xray` on npm: https://www.npmjs.com/package/@opentelemetry/propagator-aws-xray
- `@opentelemetry/instrumentation-aws-sdk` on npm: https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk
- OTel Python AWS X-Ray Propagator: https://opentelemetry-python-contrib.readthedocs.io/en/latest/propagator/aws/aws.html
- OTel Python AWS SDK Extension: https://opentelemetry-python-contrib.readthedocs.io/en/latest/sdk-extension/aws/aws.html
- ADOT Lambda JS layer ARNs: https://aws-otel.github.io/docs/getting-started/lambda/lambda-js/
- OTel Collector awsxray receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/awsxrayreceiver

## Issues Found

### Issue 1: Deprecated/removed `logging` exporter in Collector config (Section 6)
- **What was wrong:** The collector configuration used the `logging` exporter with `loglevel: debug`. The `logging` exporter was deprecated in v0.86.0 (Sept 2023) and removed entirely in v0.111.0 in favor of the `debug` exporter.
- **Fix:** Replaced `logging: loglevel: debug` with `debug: verbosity: detailed`, which is the current equivalent.

### Issue 2: Inverted CompositePropagator priority claim (Section 7)
- **What was wrong:** The post stated that "the first propagator in the composite list wins during extraction" and labeled the example with `[AWSXRayPropagator, W3CTraceContextPropagator]` as "X-Ray first: prefer X-Ray header when both are present." This is backwards. In both the JS (`@opentelemetry/core`) and Python (`opentelemetry-api`) implementations, CompositePropagator.extract chains the propagators sequentially — each propagator writes to the same span-context key, so the **last** propagator's write wins. With `[AWSXRayPropagator, W3CTraceContextPropagator]`, W3C wins, not X-Ray.
- **Fix:** Rewrote the explanatory paragraph to state that the last propagator wins, swapped the example labels/orderings so the "prefer X-Ray" example puts X-Ray last and the "prefer W3C" example puts W3C last, and updated the closing recommendation to "put X-Ray propagator last" for AWS-heavy environments.

### Issue 3: Same inverted priority claim in Pitfall 4 (Section 10)
- **What was wrong:** Same factual error: "the first propagator in the composite list wins" and the comment "this configuration will use the X-Ray trace ID" was wrong for the given `[AWSXRayPropagator, W3CTraceContextPropagator]` order.
- **Fix:** Updated the text to state that the last propagator wins, and corrected the inline comment to say the W3C trace ID would be used (since W3C runs last in the example).

## Review Notes
- The X-Ray header format description, including the `Root=1-{8-hex-epoch}-{24-hex-random};Parent={16-hex};Sampled={0|1|?}` structure and the `?` "defer" sampling value, is accurate per AWS docs.
- All npm package names and import paths (Node.js + Python) match what is published.
- `_X_AMZN_TRACE_ID` is the correct Lambda env var; one caveat not mentioned (but not incorrect) is that it is not set on `provided` (OS-only) runtimes and Java 17+ uses a system property instead. Could be added in a future revision.
- ADOT Lambda layer account ID `901920570463`, `AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler`, and `OTEL_PROPAGATORS=xray,tracecontext` are all valid. The specific layer version (`aws-otel-nodejs-amd64-ver-1-18-1:1`) is from late-2023/early-2024 and will likely be out of date by the post's 2026 publish date — readers should consult the ADOT layer ARN reference for the current version, but the example syntax remains correct.
- `span.setStatus({ code: 2, ... })` uses the numeric ERROR value rather than `SpanStatusCode.ERROR`. Technically correct but using the named constant would be more idiomatic; left as-is per "fix technical errors only" guideline.
- The OTel Collector `awsxray` receiver is correctly listed with `endpoint: 0.0.0.0:2000` and `transport: udp` (matching the X-Ray Daemon default).
- The OpenTelemetry spec does not explicitly mandate "last propagator wins" — this is an implementation convention shared by JS and Python SDKs, so the corrected post matches actual library behavior for these languages.
