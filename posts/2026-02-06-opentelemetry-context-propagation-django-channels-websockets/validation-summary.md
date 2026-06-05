# Validation Summary: How to Add OpenTelemetry Context Propagation to Django Channels WebSockets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry ASGI instrumentation
- W3C Trace Context propagation
- Django Channels / ASGI WebSockets
- Channels Redis channel layer
- Celery background tasks
- OpenTelemetry metrics
- Channels WebSocket testing

## Sources Consulted
- OpenTelemetry Python ASGI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asgi/asgi.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python context API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace export API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- Django Channels channel layers documentation: https://channels.readthedocs.io/en/stable/topics/channel_layers.html
- Django Channels testing documentation: https://channels.readthedocs.io/en/stable/topics/testing.html
- `channels_redis` project documentation: https://github.com/django/channels_redis

## Issues Found
1. **Incoming message context was attached after the receive span was created.** The original `receive` example extracted `trace_context` inside the active `websocket.receive` span, so the receive span itself would not be parented to the propagated context. It also assigned the returned attach token to `token` and never detached it. **Fix:** Parse JSON and attach extracted context before starting `websocket.receive`, then detach the parent context and connection context in `finally`.
2. **Connection context attach tokens used ambiguous names.** The examples stored `context.attach(...)` results in variables named `ctx`, which made it easy to treat them as contexts rather than detach tokens. **Fix:** Renamed these to `connection_token` where appropriate and detached the exact token returned by `context.attach(...)`, matching the OpenTelemetry context API.
3. **Chat consumer snippet had missing imports.** `chat_message_broadcast` and `chat_typing_broadcast` used `context`, `SpanKind`, and `time` without importing them, while importing unused `json`. **Fix:** Added the required imports and removed the unused JSON import.
4. **Chat room attribute was set before a connection span existed.** The original `ChatConsumer.connect()` called `trace.get_current_span()` before `super().connect()` created `websocket.connect`, so `chat.room` would usually be set on a non-recording span. **Fix:** Added an `add_connect_span_attributes()` hook in the base consumer and used it from `ChatConsumer`.
5. **Typing broadcast leaked attached context.** The original `chat_typing_broadcast()` attached propagated context and never detached it. **Fix:** Wrapped the send in `try/finally` and detached the token.
6. **Celery task snippet had missing imports and an inconsistent `SpanKind` reference.** The task used `context.attach()` without importing `context`, and referenced `trace.SpanKind.CONSUMER` while other examples imported `SpanKind` directly. **Fix:** Imported `context` and `SpanKind`, then used `kind=SpanKind.CONSUMER`.
7. **Database tracing comment overstated automatic ORM tracing.** The post said the database save was "traced by Django ORM instrumentation," but that is only true if appropriate database instrumentation is configured separately. **Fix:** Changed the comment to "traced if database instrumentation is configured."
8. **WebSocket test used the full chat consumer without the required surrounding application state.** The original test instantiated `ChatConsumer.as_asgi()` directly even though the consumer expects URL route kwargs, channel layer behavior, a user, and a database model. **Fix:** Replaced it with a minimal `TestConsumer` subclass that exercises the traced base consumer and `send_json_with_trace()` directly.

## Review Notes
- The Redis channel layer configuration uses the documented `channels_redis.core.RedisChannelLayer` backend and `hosts` format.
- `OpenTelemetryMiddleware` is documented as ASGI middleware usable with Django Channels, and the installation command is current.
- The JavaScript `generateTraceParent()` helper is suitable as illustrative tutorial code, but production browser instrumentation should create and manage trace context through the OpenTelemetry JavaScript SDK.
- The Celery example still contains application placeholders such as `analyze_message_sentiment()` and `self.save_message(...)`; these are acceptable as tutorial placeholders rather than library API examples.
