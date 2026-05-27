# Validation Summary: How to Build a Server-Sent Events Endpoint with Express.js on Cloud Run for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Server-Sent Events
- EventSource browser API
- Express.js
- Node.js
- Google Cloud Run
- Google Cloud CLI

## Sources Consulted
- Google Cloud Run documentation: Invoke with an HTTPS request, response streaming: https://docs.cloud.google.com/run/docs/triggering/https-request
- Google Cloud Run documentation: Configure request timeout for services: https://docs.cloud.google.com/run/docs/configuring/request-timeout
- Google Cloud Run documentation: WebSockets and other streaming services guidance: https://docs.cloud.google.com/run/docs/triggering/websockets
- Google Cloud SDK reference: gcloud run deploy: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- MDN Web Docs: Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN Web Docs: EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- WHATWG HTML Living Standard: Server-sent events: https://html.spec.whatwg.org/multipage/server-sent-events.html

## Issues Found
- The original deployment command used `--max-instances 10` while the sample code stores connected clients and replay history in process memory. On Cloud Run, requests can be routed to different instances, and clients connected to one instance are not visible to another instance. I changed the example deployment to `--max-instances 1` and added a note explaining that production multi-instance deployments need shared state and fanout.
- The reconnection example used an in-memory event history without noting that it is per-instance and ephemeral. I added a short caveat recommending shared storage or Pub/Sub-backed fanout for multi-instance or durable replay.

## Review Notes
The SSE format, EventSource reconnection behavior, `Last-Event-ID` usage, Express response streaming approach, Cloud Run timeout value, and `gcloud run deploy` flags are consistent with the consulted documentation. Cloud Run request timeouts still apply to long-lived streams, so clients should continue to handle reconnects.
