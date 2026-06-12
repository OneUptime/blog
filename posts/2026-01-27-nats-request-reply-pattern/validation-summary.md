# Validation Summary: How to Implement Request-Reply Pattern in NATS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NATS Core request-reply
- NATS queue groups
- NATS JetStream
- Go with github.com/nats-io/nats.go
- Node.js with nats.js
- JSON request and response payloads

## Sources Consulted
- NATS Request-Reply documentation: https://docs.nats.io/nats-concepts/core-nats/reqreply
- NATS Queue Subscriptions documentation: https://docs.nats.io/using-nats/developer/receiving/queues
- NATS JetStream documentation: https://docs.nats.io/nats-concepts/jetstream
- NATS JetStream Model Deep Dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- nats.go API documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- nats.node official README: https://github.com/nats-io/nats.node
- NATS by Example Request-Reply in Go: https://natsbyexample.com/examples/messaging/request-reply/go/

## Issues Found
- Removed an unused `time` import from the first Go connection example because the snippet would not compile as written.
- Added `CalculateRequest` and `CalculateResponse` to the requester example so the standalone requester snippet has the types it uses.
- Updated the Node.js requester to use the official `ErrorCode` constants and to distinguish no-responder errors from timeouts.
- Corrected the inbox description from "private" to "directed"; inbox subjects are unique reply subjects, but privacy requires authorization rules.
- Clarified no-responder detection to note that it depends on server and client header support, rather than implying a separate enable call in the example.
- Corrected the scatter-gather explanation. Core NATS publishes to all matching subscribers by default; `Request()` returns one response, while manual inbox collection can gather multiple replies.
- Replaced the queue group "round-robin" wording with distribution across available members, matching NATS documentation.
- Clarified that disconnected queue workers stop receiving new messages, but core NATS does not redeliver a request if a worker fails after receiving it.
- Revised the JetStream section to avoid implying that the shown basic request-reply flow automatically provides exactly-once semantics. The post now says JetStream can persist requests and use explicit acknowledgments, while exactly-once-style processing requires publish de-duplication and confirmed acknowledgments.
- Changed the JetStream consumer example to use `AckSync()` instead of `Ack()` to align with the confirmed-ack guidance for exactly-once-style processing.
- Corrected the headers section to say NATS supports headers, rather than implying headers are JetStream-specific.
- Updated the summary table and conclusion so JetStream is described as persistent request processing with explicit acknowledgments, not automatic exactly-once request-reply delivery.

## Review Notes
The post is technically relevant and useful as a tutorial. Several snippets still use shortened example code with ignored errors and placeholder application functions such as `processTask`, which is acceptable for a blog tutorial but should be expanded in production-ready sample code.
