# Validation Summary: How to Implement Queue Groups in NATS

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- NATS core messaging (pub/sub, queue groups, request-reply)
- NATS JetStream (streams, durable pull consumers, ack/nak)
- NATS.js v2 Node.js client (`nats` npm package, `StringCodec`, async-iterator subscriptions)
- nats.go Go client (`nats.Connect`, `nats.QueueSubscribe`)
- NATS monitoring HTTP endpoints (`/subsz`)
- Mermaid diagrams for architecture visualization

## Sources Consulted
- NATS official docs — Queue Groups: https://docs.nats.io/using-nats/developer/receiving/queues
- NATS official docs — Monitoring: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- nats.js core README and migration guide: https://github.com/nats-io/nats.js/blob/main/core/README.md and .../migration.md
- nats.js JetStream README: https://github.com/nats-io/nats.js/blob/main/jetstream/README.md
- nats.js ConnectionOptions source: https://github.com/nats-io/nats.js/blob/main/core/src/core.ts
- nats.go API reference: https://pkg.go.dev/github.com/nats-io/nats.go
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found

1. **Slow consumer event listener used the wrong API.** The post called `nc.on('status', (status) => { ... })`, but NATS.js v2+ does not expose an EventEmitter-style `.on('status', ...)` on the connection. Status notifications are surfaced via the `nc.status()` async iterator. Replaced with the async-iterator pattern so the slow-consumer warning will actually fire.

2. **`num_cache` mislabeled as "Total queue groups".** The `/subsz` endpoint's `num_cache` field is the size of the server's sublist lookup cache, not a count of queue groups. There is no field on `/subsz` that directly counts queue groups; the code's own subscription-walking logic is the right approach. Removed the misleading `console.log` line.

3. **JetStream consumer was retrieved but never created.** The code called `js.consumers.get('TASKS', 'task-processors')`, which only retrieves an existing consumer and throws if it does not exist. To "create a durable pull consumer", you must first call `jsm.consumers.add(...)` with a `durable_name` and `ack_policy`. Added a guarded create-if-missing step before the `get()` call.

4. **Mermaid subgraph names with unquoted colons.** `subgraph Queue Group: order-processors` and `subgraph Queue Group: notification-senders` use special characters (`:`) without quotes, which Mermaid does not parse reliably. Wrapped both subgraph titles in double quotes.

## Review Notes
- The post targets NATS.js v2 (uses `StringCodec` and the `nats` v2 connection API). `StringCodec` and `JSONCodec` were removed in NATS.js v3 in favor of `string`/`Uint8Array` payloads and `msg.string()` / `msg.json()` helpers. The post should be re-checked when the author chooses to migrate to v3, but the v2 code as written is internally consistent and functional.
- `nc.publish('subject', Buffer.from(...))` works in v2 because `Buffer` extends `Uint8Array`. Fine for v2; in v3 you can pass strings directly.
- The Go code, queue-group subscription syntax (`nc.subscribe(subject, { queue })`), and NATS.js connection options (`maxPingOut`, `pingInterval`, `reconnectTimeWait`, etc.) are accurate.
- The `error.message.includes('already exists')` heuristics used for stream/consumer creation are pragmatic but fragile — production code should match on the JetStream API error code (e.g. `err.code === 10058`) instead. Left as-is since this is illustrative.
