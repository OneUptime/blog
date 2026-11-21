# Validation summary

## Checks

- Compiled exact published helper functions in a Go 1.25.0 harness using nats.go 1.42.0.
- Executed against a disposable NATS Server 2.11.4 on loopback with temporary file storage: acknowledged sequence 1, closed client, reconnected to worker durable and received sequence 2.
- Verified published inspection output: delivered_stream=2 ack_floor_stream=2 pending=1 unacked=0.
- Separate review consumer delivered sequence 1; original worker delivered/acknowledgment sequence state remained unchanged.
- Attempt to update original durable from DeliverAll to a starting-sequence policy was rejected with the source-verified error.
- Owned server stopped and temporary storage cleaned after test.
- Six-edge Mermaid structure checked without graphical rendering; exact README helpers matched tested code.
- Generated 1280x720 social image visually reviewed; readable title without clipping.

## Sources reviewed

- https://docs.nats.io/learn/jetstream/reading-back
- https://github.com/nats-io/nats.go/blob/v1.42.0/jetstream/consumer_config.go
- https://github.com/nats-io/nats-server/blob/v2.11.4/server/consumer.go
- https://docs.nats.io/learn/jetstream/retention-policies

## Limitations

- The test closed and reopened a client connection; it did not restart the server or crash an operating-system worker process.
- No production durable was deleted or recreated; destructive replacement is described as a coordinated reviewed procedure.
- WorkQueue/Interest retention behavior and inactivity cleanup were documentation/source reviewed, not executed in this lab.
- No external side effects, cluster failover or backup restoration was tested.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
