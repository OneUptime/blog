# Validation Summary: How to Implement Customer Communication

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- TypeScript
- React
- WebSocket API
- CSS
- YAML
- Mermaid diagrams
- Status page and incident communication workflows

## Sources Consulted
- TypeScript TSConfig `strictNullChecks`: https://www.typescriptlang.org/tsconfig/strictNullChecks.html
- React `useEffect` reference: https://react.dev/reference/react/useEffect
- MDN WebSocket constructor reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- Atlassian Statuspage component status documentation: https://support.atlassian.com/statuspage/docs/show-service-status-with-components/
- Atlassian incident communication template guidance: https://www.atlassian.com/incident-management/tutorials/incident-communication
- Mermaid sequence diagram syntax: https://mermaid.ai/open-source/syntax/sequenceDiagram.html

## Issues Found
- The `EmailNotificationService` example used `Map.get()` without handling an undefined result. Under strict TypeScript null checking, the returned template may be undefined. I initialized the `templates` map and added an explicit missing-template guard before rendering.
- The React banner example opened a WebSocket from `process.env.INCIDENT_WS_URL`, which is not a browser Web API and can be undefined depending on the bundler. I changed the component to accept a `webSocketUrl` prop with a browser-compatible default URL and pass a concrete string to `new WebSocket()`.
- The React banner example referenced `handleIncidentUpdate()` but did not define it. I added a handler that upserts active incident banners and removes banners for resolved incidents.
- The `SupportTicket` interface omitted `createdAt`, even though the relevance scoring code reads `ticket.createdAt`. I added the missing field.
- The ticket relevance scoring code passed optional `affectedService` directly to `includes()` and divided by `incident.keywords.length` without guarding against an empty keyword list. I added the optional-field guard and skipped keyword scoring when there are no keywords.

## Review Notes
The status page API example remains intentionally provider-neutral through `statusPageClient`; the component status values align with common Statuspage-style statuses such as operational, degraded performance, partial outage, and major outage. Several domain types such as `Incident`, `Customer`, `EmailTemplate`, and service classes are assumed to be application-defined by the surrounding system, which is appropriate for illustrative blog code.
