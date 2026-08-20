# Validation Summary: Restore WebSocket Subscriptions and Resume Missed Events

## Status

validated

## Post Type

Technical guide / implementation pattern

## Technologies Covered

- WebSocket and RFC 6455
- Application-level subscription restoration
- Event replay and at-least-once delivery
- Durable per-stream cursors and idempotent event application
- TypeScript and the browser `WebSocket` API
- Reconnection backoff, connection generations, and recovery throttling
- Server-Sent Events and `Last-Event-ID`

## Sources Consulted

- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html) - opening and closing handshakes, message framing, application subprotocols, message ordering, and reconnect backoff after abnormal closure.
- [WHATWG WebSockets Standard](https://websockets.spec.whatwg.org/) - `open` and `message` event dispatch, connection state, `send()`, and `bufferedAmount` behavior.
- [WHATWG DOM Standard: Event listeners and event dispatch](https://dom.spec.whatwg.org/#concept-event-listener-invoke) - synchronous listener invocation and the absence of Promise-awaiting semantics during event dispatch.
- [WHATWG HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) - the EventSource last-event-ID string and the `Last-Event-ID` reconnect header.
- [TypeScript Handbook: Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html) - class fields, methods, visibility, and current TypeScript syntax used by the registry example.
- [MDN: WebSocket `open` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/open_event) - browser API event semantics and link-target verification.
- [MDN: WebSocket `message` event](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event) - browser API event semantics and link-target verification.
- [MDN: WebSocket `send()`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send) - send-state and buffering behavior relevant to subscription restoration.
- [GitHub author profile](https://github.com/nawazdhandala) - author link-target verification.

## Issues Found

1. **An older duplicate could move the cursor backward.** The original equality check rejected only a duplicate matching the current cursor. An older duplicate could pass that check, be ignored by `applyEventIdempotently`, and still overwrite both the durable and in-memory cursors. Changed the transaction contract so `applyEventIdempotently` reports whether it newly applied the event, and advance the cursor only when it returns `true`.
2. **Concurrent async handlers could commit events out of order.** DOM event dispatch does not await the Promise returned by an async listener, so successive WebSocket messages could start overlapping transactions. Added an explicit per-subscription serial queue around event application and documented its receive-order requirement.
3. **The global-cursor statement excluded valid aggregate cursors.** A single opaque token can encode the positions of multiple partitions without imposing one total event order. Narrowed the claim to a single scalar event position and documented the aggregate-cursor alternative.
4. **The crash-safety explanation blurred atomic writes with operation ordering.** Reworded the failure cases to describe separately persisted cursor/application state and made the durable deduplication record part of the atomic transaction contract.

## Review Notes

- All JSON blocks parsed successfully, and the combined TypeScript examples passed a strict type-check with TypeScript 5.9.3 using explicit interfaces for the application-specific dependencies.
- The corrected event handler passed a runtime check covering concurrent arrival, per-subscription serialization, and rejection of an older duplicate without cursor regression.
- `StreamEvent`, `registry`, `localStore`, and `subscriptionQueues` are intentionally application-specific. The queue must provide FIFO serialization per subscription, and the idempotent apply operation must persist its event-ID deduplication record in the same transaction as the projection and cursor.
- For recovery after a full application restart, the saved cursor must be loaded from durable storage when rebuilding the subscription registry; the post focuses on reconnect behavior and does not show that initialization step.
- The synchronous `restore()` loop is suitable as a compact protocol example. Large registries should follow the post's later batching guidance and account for `bufferedAmount` and server rate limits.
- No deprecated browser or TypeScript APIs, incorrect commands, configuration errors, or version-specific incompatibilities were found. Every external link in the post resolved to the intended resource at review time; the author's `www.github.com` URL redirects to the canonical profile.
