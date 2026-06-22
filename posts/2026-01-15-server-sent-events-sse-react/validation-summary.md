# Validation Summary: How to Implement Server-Sent Events (SSE) in React

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- React
- TypeScript
- Server-Sent Events
- EventSource API
- Fetch API readable streams
- Node.js
- Express
- CORS

## Sources Consulted
- MDN EventSource API: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- MDN Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- WHATWG HTML Standard, Server-sent events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- React useEffect reference: https://react.dev/reference/react/useEffect
- Express 5.x API reference: https://expressjs.com/en/api/

## Issues Found
- The connection characteristics described SSE as a single TCP connection. Updated it to "persistent HTTP connection or HTTP/2 stream" to account for HTTP/2 behavior.
- The event field list described `data` as strictly required. Updated the wording because the SSE format permits events without a `data` field, but browsers do not dispatch a message when the data buffer is empty.
- The `useSSE` hook could reconnect on every render when callers passed inline callbacks or event type arrays. Updated the hook to keep callbacks in refs and use stable connection dependencies.
- The manual reconnection hook used React state from a stale closure and could retry incorrectly. Reworked retry tracking with refs, closed existing connections before reconnecting, encoded the manual `lastEventId` query parameter, and fixed the effect dependency list.
- The Last-Event-ID explanation implied manual EventSource recreation would send the `Last-Event-ID` header. Clarified that browsers send it during EventSource-managed reconnection and manual reconnection must pass the ID explicitly.
- The SSE context provider could miss custom event subscriptions registered before the provider's EventSource was created. Added listener registration tracking so existing and later subscriptions are attached correctly and removed on cleanup.
- The robust error handling hook treated `EventSource.CLOSED` as a state that would still automatically reconnect. Updated the logic to distinguish fatal closed state from reconnecting state and to enforce the retry cap.
- The fetch-based SSE parser concatenated multiple `data:` lines without newlines and only handled `\n\n` separators. Updated it to handle CRLF and join multi-line data fields with `\n`, matching the SSE parsing rules.
- The fetch-based hook could reconnect on every render when passed inline headers or callbacks. Added stable header serialization and callback refs.
- The message ID server example only read the `Last-Event-ID` header even though the manual reconnect hook used a query parameter. Updated the server example to accept either source.
- The EventSource test mock was missing EventSource readyState constants and the optional init dictionary. Added `CONNECTING`, `OPEN`, `CLOSED`, and `withCredentials` handling.
- Browser timer refs used `NodeJS.Timeout`, which can fail in frontend TypeScript projects without Node types. Replaced them with `ReturnType<typeof setTimeout>`.
- The connection limits section did not distinguish HTTP/1.x connection limits from HTTP/2 stream limits. Updated the wording.
- The unmount pitfall referenced a React warning that is outdated for modern React. Updated the comment to focus on processing messages after cleanup begins.

## Review Notes
The remaining examples are illustrative snippets and omit some app-specific types or components, such as `Notification`, `Metrics`, `NotificationList`, and `MetricsDisplay`. Those omissions are acceptable for the article format, but a future pass could make every snippet fully copy-paste runnable.
