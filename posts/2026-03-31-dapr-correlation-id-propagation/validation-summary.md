# Validation Summary: How to Implement Correlation ID Propagation in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- W3C Trace Context specification (traceparent / tracestate headers)
- Node.js (AsyncLocalStorage, Express-style middleware)
- Python (FastAPI, contextvars)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr`)
- Kubernetes (Dapr Configuration resource)
- Zipkin (tracing backend)
- CloudEvents (pub/sub envelope format)

## Sources Consulted
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- W3C Trace Context GitHub source: https://github.com/w3c/trace-context
- Dapr Configuration overview documentation (apiVersion, kind, tracing config fields)
- Dapr distributed tracing setup documentation (samplingRate, zipkin endpointAddress)
- Dapr W3C tracing overview documentation (traceparent/tracestate header usage)
- Dapr CloudEvents pub/sub documentation (traceparent as CloudEvents extension attribute)
- Dapr JavaScript SDK GitHub repository and source code (`@dapr/dapr` package, `DaprClient`, `IClientInvoker` interface, `InvokerOptions` type, `HttpMethod` enum)

## Issues Found
1. **Incorrect HTTP method string in Dapr JS SDK service invocation**: The code used `'POST'` (uppercase string literal) as the third argument to `daprClient.invoker.invoke()`. The Dapr JS SDK defines `HttpMethod` as an enum with lowercase values (`HttpMethod.POST` = `"post"`). Passing `'POST'` does not match the enum type and could cause issues in the gRPC transport. Fixed by importing `HttpMethod` from `@dapr/dapr` and replacing `'POST'` with `HttpMethod.POST`.

## Review Notes
- The W3C traceparent `trace-flags` field is described as `01` = sampled, `00` = not sampled. This is correct but simplified; the spec defines it as a bit field (not an enum), so `03` also means sampled (bit 0 set + bit 1 "random-trace-id" set). The simplification is acceptable for a blog post.
- The blog post uses the colloquial name "parentSpanId" for the third traceparent field. The official W3C spec name is "parent-id", though the spec itself notes it is "known as the span-id" in some systems. Acceptable in blog context.
- The CloudEvents example in the pub/sub section omits the required `source` attribute. Since this is an illustrative YAML comment (not runnable code) focused on showing traceparent propagation, this is acceptable.
- The Python code imports `DaprClient` but does not use it in the shown snippet. This is a minor unused-import issue but is likely intentional to show what's available for building on the pattern.
- Dapr auto-propagates traceparent for direct service-to-service calls, but for chained calls (A -> B -> C), the developer must extract and forward trace headers within application code. The blog post correctly addresses this by showing middleware that extracts and stores the trace context for re-propagation.
