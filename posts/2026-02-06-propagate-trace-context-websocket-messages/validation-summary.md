# Validation Summary: How to Propagate Trace Context Through WebSocket Messages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry trace context propagation
- W3C Trace Context
- WebSocket protocol
- Browser WebSocket API
- Node.js and the `ws` WebSocket library
- OpenTelemetry JavaScript API
- OpenTelemetry Python API
- Python `time` and `asyncio`

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- MDN WebSocket `send()` documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
- MDN WebSocket `message` event documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
- `ws` WebSocket library API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Node.js `crypto.randomUUID()` documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Python `time` documentation: https://docs.python.org/3/library/time.html#time.time
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.loop.time

## Issues Found
- The browser usage example sent a message immediately after constructing the WebSocket. MDN documents that `WebSocket.send()` throws while the socket is still in the `CONNECTING` state, so I added an `onOpen()` helper to the wrapper and updated the usage example to send after the `open` event.
- The JavaScript examples used the numeric status code `2` for errors. OpenTelemetry JavaScript documentation uses `SpanStatusCode.ERROR`, so I imported `SpanStatusCode` and updated the client and server error handling snippets.
- The Python server-to-server example used `asyncio.get_event_loop().time()` for the envelope `timestamp`. Python documents `loop.time()` as a monotonic event-loop clock rather than epoch time, so I changed it to `int(time.time() * 1000)` to match the JavaScript `Date.now()` envelope timestamps.
- The request-response section said span links could connect request and response spans, but the code only extracted the server context and did not create a linked response span. I added a response span with links to the stored request span context and the extracted server span context.
- The request-response Node.js example used `crypto.randomUUID()` without importing `crypto`. I changed it to import `randomUUID` from `node:crypto`, matching the Node.js API documentation.

## Review Notes
The remaining examples are intentionally illustrative and omit application-specific functions such as `processOrder`, `handleSubscription`, `transform_data`, and `forward_to_subscribers`. The propagation pattern, WebSocket protocol explanation, and OpenTelemetry API usage are technically sound after the fixes above.
