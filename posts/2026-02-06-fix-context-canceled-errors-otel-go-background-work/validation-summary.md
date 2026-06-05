# Validation Summary: How to Fix 'Context Canceled' Errors in OpenTelemetry Go When Request Context

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Go context package
- Go net/http request contexts
- OpenTelemetry Go tracing API
- OpenTelemetry span links

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go `net/http` `Request.Context` documentation: https://pkg.go.dev/net/http#Request.Context
- OpenTelemetry Go `trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry specification overview, traces and span links: https://opentelemetry.io/docs/specs/otel/overview/

## Issues Found
- The original post stated that using a canceled request context causes OpenTelemetry spans to fail to export and be lost. This was too absolute. I changed the wording to explain that context-aware background work, including HTTP calls, database calls, or explicit telemetry flushes, can fail with `context canceled`, which can cause incomplete work and tracing gaps.
- The original fix manually copied only the OpenTelemetry `SpanContext` onto `context.Background()`. I updated the primary recommendation to use `context.WithoutCancel`, which is the current Go API for deriving a context that keeps parent values while removing the parent cancellation and deadline.
- The original post said `trace.ContextWithSpanContext` attaches a remote span context. That is incorrect: OpenTelemetry Go documents `ContextWithSpanContext` as setting the provided span context as the current span, while `ContextWithRemoteSpanContext` explicitly marks it remote. I corrected the explanation.
- The original post said to use `trace.ContextWithRemoteSpanContext` if the background span should appear as a direct child rather than a remote child. This was reversed. I corrected the wording to use `trace.ContextWithSpanContext` for a local parent and `trace.ContextWithRemoteSpanContext` only for an explicitly remote parent.
- The span-link example was adjusted so it starts from `context.Background()` with a link rather than also using the linked span as the parent, and the unused returned context was removed.

## Review Notes
The updated examples require Go 1.21 or later for `context.WithoutCancel`. For projects pinned to older Go versions, the post now notes that manually rebuilding the tracing context with `trace.ContextWithSpanContext` is the older fallback.
