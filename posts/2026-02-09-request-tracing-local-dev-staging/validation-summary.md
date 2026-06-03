# Validation Summary: Use Request Tracing Headers in Local Development Against Kubernetes Staging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl port-forward
- JavaScript / Node.js
- Express
- OpenTelemetry JavaScript
- Jaeger
- Prometheus
- Winston
- AsyncLocalStorage

## Sources Consulted
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Jaeger exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-jaeger.html
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Chalk package documentation: https://www.npmjs.com/package/chalk

## Issues Found
- The manual tracing header example set `X-Parent-Span-Id` to the newly generated span ID when continuing an existing trace. Updated the helper to use the incoming span ID as the parent and omit the parent header for root spans.
- The Express tracing middleware reused the incoming span ID for the local service span. Updated it to create a new span ID for each handled request while preserving the incoming span as the parent.
- The route example reused one propagated span ID for multiple outgoing staging calls. Updated it to create separate outgoing child span IDs for the user-service and orders-service requests.
- The OpenTelemetry example used `@opentelemetry/exporter-jaeger`, which is deprecated. Updated it to use the current OTLP trace exporter with `NodeSDK`, `resourceFromAttributes`, and auto-instrumentations.
- The OpenTelemetry resource example used older semantic convention APIs. Updated service naming to use `ATTR_SERVICE_NAME` and `deployment.environment.name`.
- The trace viewer imported `chalk` using CommonJS. Current Chalk 5 is ESM-only, so the example could fail after `npm install chalk`. Replaced the dependency with local formatting helpers to keep the CommonJS example runnable.
- The trace viewer calculated indentation by counting only direct `CHILD_OF` references, which cannot represent deeper span nesting. Updated it to calculate recursive span depth from the Jaeger span reference graph.
- The logging example used `AsyncLocalStorage.enterWith()`. Updated it to use `AsyncLocalStorage.run()` so request context is scoped to the middleware callback.

## Review Notes
- The Jaeger `/api/traces` HTTP JSON endpoint used by the CLI and dashboard is served by jaeger-query and works for UI-style local tooling, but Jaeger documents this HTTP JSON API as internal and subject to change. For durable integrations, Jaeger recommends the gRPC QueryService API.
- The `kubectl port-forward` commands are valid for forwarding service ports, assuming the Kubernetes Service names and namespaces match the target cluster.
