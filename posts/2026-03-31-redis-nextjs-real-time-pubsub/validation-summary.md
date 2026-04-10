# Validation Summary: How to Build a Next.js Real-Time App with Redis Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub)
- node-redis v4+ (`redis` npm package)
- Next.js (Pages Router API routes)
- Server-Sent Events (SSE)
- React (client component with EventSource API)

## Sources Consulted
- node-redis v4 documentation — https://github.com/redis/node-redis
- node-redis subscribe API — https://github.com/redis/node-redis/blob/master/docs/pub-sub.md
- MDN Server-Sent Events specification — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- MDN EventSource API — https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Next.js API Routes documentation — https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- HTML Living Standard: Server-Sent Events — https://html.spec.whatwg.org/multipage/server-sent-events.html

## Issues Found
No technical issues found.

## Review Notes
- The `publisher.connect()` call at module scope without `await` is a valid pattern in node-redis v4, as commands are queued until the connection is established. In production, adding error handling on the publisher (e.g., `publisher.on('error', ...)`) would be advisable to avoid unhandled exceptions.
- The `"use client"` directive in `LiveFeed.jsx` is unnecessary when using only the Pages Router (where all components are client components by default), but it is harmless and forward-compatible if the project also uses the App Router.
- The `bodyParser: false` config on the SSE endpoint is unnecessary for a GET-based SSE stream but does not cause any issues.
- Creating a new Redis subscriber per SSE connection is the correct design since a Redis client in subscribe mode cannot run other commands. In high-connection-count scenarios, Redis connection limits should be considered.
