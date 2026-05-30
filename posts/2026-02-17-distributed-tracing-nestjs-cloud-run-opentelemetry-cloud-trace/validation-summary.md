# Validation Summary: How to Use Distributed Tracing in a NestJS Application on Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud Trace
- NestJS
- Node.js
- TypeScript
- OpenTelemetry JavaScript SDK
- OpenTelemetry auto-instrumentation
- Docker
- gcloud CLI

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry HTTP instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- Google Cloud Trace instrumentation setup: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud OpenTelemetry Operations JS exporter README: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- NestJS documentation: https://docs.nestjs.com/
- npm package metadata for @opentelemetry/resources, @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, @google-cloud/opentelemetry-cloud-trace-exporter, and @nestjs/axios

## Issues Found
- The OpenTelemetry setup used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JS 2.x documentation and package metadata use `resourceFromAttributes(...)`, so the code was updated to import and call `resourceFromAttributes`.
- The install command included `@opentelemetry/exporter-trace-otlp-grpc`, but the post configures the Google Cloud Trace exporter directly and never uses the OTLP gRPC exporter. Removed the unused package to keep the dependency list accurate for the shown implementation.
- The `PaymentService` example imports `HttpService` from `@nestjs/axios`, but the setup command did not install `@nestjs/axios` or its `axios` peer dependency. Added both packages to the install command.
- The statement that auto-instrumentation captures database queries automatically was too broad. Updated it to say supported database clients are captured automatically.
- The NestJS tracing interceptor created a span with `startSpan` but did not make it active for downstream work, and it ended the span only on `next` or `error` emissions. Updated the interceptor to set the span in OpenTelemetry context during RxJS subscription and end it with `finalize`.

## Review Notes
- Google Cloud documentation currently recommends OpenTelemetry OTLP export to a collector or the Telemetry API for many new setups, but the Google Cloud Trace exporter remains available and documented for direct Cloud Trace export.
- The Cloud Run IAM command grants the role to the default Compute Engine service account. Projects using a custom Cloud Run service account must grant `roles/cloudtrace.agent` to that custom service account instead.
