# Validation Summary: Reconnect a Cleanly Closed WebSocket with Backoff

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Browser WebSocket API
- JavaScript and TypeScript
- WebSocket close events and status codes
- Reconnection state machines
- Capped exponential backoff with full jitter
- Browser connectivity and page lifecycle APIs

## Sources Consulted

- WHATWG WebSockets Living Standard: https://websockets.spec.whatwg.org/
- RFC 6455, clean closure definition: https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.4
- RFC 6455, connection close code and reason: https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.5 and https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.6
- RFC 6455, recovering from abnormal closure: https://www.rfc-editor.org/rfc/rfc6455.html#section-7.2.3
- RFC 6455, status codes and reserved ranges: https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4
- IANA WebSocket Close Code Number Registry: https://www.iana.org/assignments/websocket/websocket.xhtml#close-code-number
- WHATWG HTML Standard, timers: https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
- MDN `WebSocket` API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN WebSocket `close` event: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
- MDN `CloseEvent.wasClean`: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/wasClean
- MDN `Navigator.onLine`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
- MDN Window `online` event: https://developer.mozilla.org/en-US/docs/Web/API/Window/online_event
- TypeScript `exactOptionalPropertyTypes` reference: https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html

## Issues Found

- The state machine allowed repeated `start()` calls to create parallel WebSocket connections. A rapid `stop()` followed by `start()` could also let the old socket's queued `close` event schedule another reconnect. Initialized the instance in the stopped state, made `start()` idempotent, detached the active socket during `stop()`, ignored stale socket events, and returned terminal closures to the stopped state so they can be started manually later.
- The reconnect policy retried status code `1002` even though RFC 6455 defines it as a protocol error and the conclusion says terminal protocol errors should not be retried. Added `1002` to the non-retry cases.
- `wasClean` was described only in terms of how the closing handshake completed. RFC 6455 defines a clean close as the connection closing after the WebSocket closing handshake completed. Updated the introduction and conclusion to use that definition.
- The close reason was described generically as application-provided, and the `3000` through `4999` status-code range was treated as one category. Clarified that the browser exposes the server-provided, UTF-8-decoded reason; `3000` through `3999` are for registered library, framework, and application codes, while `4000` through `4999` are private-use codes based on prior agreement.
- The optional class fields were explicitly assigned `undefined`, which is rejected when TypeScript's `exactOptionalPropertyTypes` option is enabled. Changed them to explicit `WebSocket | undefined` and `number | undefined` fields.

## Review Notes

- The corrected TypeScript example passes `tsc --noEmit --strict --exactOptionalPropertyTypes` with the DOM library. The repository's unrelated Node declaration files required `skipLibCheck` during this isolated check.
- The full-jitter delay grows from a 500 ms ceiling and caps at 30 seconds, matching RFC 6455's guidance to use a randomized initial delay and increasingly longer, truncated backoff after failures.
- Resetting the failure count on `open` is correct when a completed WebSocket opening handshake is the application's meaningful health point. The existing comment correctly says to reset after an authentication or readiness acknowledgement when the application protocol has one.
- `navigator.onLine` and the `online` event are correctly presented as hints rather than proof that the server is reachable. The claim that the browser WebSocket API has no built-in reconnect or message replay is also correct.
- IANA registers `1012` as the more specific Service Restart code, but RFC 6455 explicitly lists a server going down as an example for `1001`, so the post's restart example remains valid.
- All external links in the post resolved successfully and pointed to the intended resources on the validation date.
