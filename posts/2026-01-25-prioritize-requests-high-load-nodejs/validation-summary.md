# Validation Summary: How to Prioritize Requests in High-Load Node.js Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Node.js
- TypeScript
- Express.js middleware
- Priority queues
- Load shedding
- Weighted fair queuing
- Adaptive concurrency limits

## Sources Consulted
- Express.js middleware guide: https://expressjs.com/en/guide/writing-middleware/
- Express.js 5.x API reference: https://expressjs.com/en/api/
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Node.js Timers API documentation: https://nodejs.org/api/timers.html
- TypeScript Handbook: Enums: https://www.typescriptlang.org/docs/handbook/enums.html

## Issues Found
- The priority range text said priority 10 was lowest, but the article's request priority enum uses priorities 1 through 5. Changed the text to say priority 5 is lowest.
- The load shedding example referenced `RequestPriority`, `PriorityRequestHandler`, Express request/response types, and `getPriorityForRequest` without defining or importing them. Exported a shared `getPriorityForRequest` helper from the request handler snippet and imported the required symbols in the load shedder snippet.
- The load shedding threshold arrays were indexed by priority but did not include an entry for priority 5, causing bulk requests to use the fallback threshold of 0 and be shed immediately. Added explicit indexed thresholds for priorities 1 through 5.
- The request handler only listened for the response `finish` event. Added guarded `finish` and `close` listeners so active request counts are released when the connection closes before a normal finish.
- The weighted fair queue implementation always preferred priority 1 traffic and could starve lower-priority queues, contradicting the section's claim. Replaced it with a weighted round-robin schedule and made the constructor defaults usable.
- The final setup claimed to combine all patterns even though the adaptive concurrency limiter was only exposed in metrics. Adjusted the wording to accurately describe the example.
- The final setup parsed only the priority header for load shedding, which was inconsistent with the path-based priority rules used by the handler. Updated it to call the shared priority helper.

## Review Notes
The TypeScript snippets were checked with TypeScript 5.9.3 in an isolated temporary project using minimal Express type stubs. No full Express runtime test was run because the post provides illustrative snippets rather than a complete installable project.
