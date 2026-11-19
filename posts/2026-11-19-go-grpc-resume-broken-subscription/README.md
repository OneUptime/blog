# How to Resume a Go gRPC Subscription After Recreating a Broken Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, Streaming, Troubleshooting

Description: Recreate a failed Go gRPC subscription with a durable application cursor, bounded retries, and explicit duplicate handling.

A gRPC connection can recover after a network interruption while an existing subscription remains dead. The channel manages connectivity; a stream is one RPC with its own terminal result. Once that RPC fails, create a new subscription instead of repeatedly reading the old stream.

The [Go ClientStream contract](https://pkg.go.dev/google.golang.org/grpc#ClientStream) defines terminal receive behavior. It does not supply a durable subscription cursor. Resuming application data requires a protocol that says where the next stream should begin.

## Decide what acknowledged progress means

Use an opaque server-issued resume token or a documented ordered sequence. Save progress only after the event's effect has been durably applied. If you advance the cursor first and crash before processing the event, the resumed subscription can silently skip work.

For a sequence-based protocol, an example contract is:

- `after = N` requests events strictly after sequence N;
- events are ordered and have stable unique identifiers;
- replay may repeat the last processed event;
- an expired cursor produces a specific error requiring a new snapshot.

That contract is application design, not a built-in gRPC guarantee. Partitioned streams may need a cursor per partition rather than one global number.

## Reopen the RPC from the saved cursor

The following Go fragment shows one subscription attempt. It assumes generated `EventServiceClient`, `SubscribeRequest`, and `Event` types with an `After` request field and `Sequence` event field. `applyAndCheckpoint` is your transactional application operation.

```go
type CheckpointError struct { Cause error }

func (e *CheckpointError) Error() string {
    return "apply/checkpoint failed: " + e.Cause.Error()
}
func (e *CheckpointError) Unwrap() error { return e.Cause }

func consumeAttempt(
    ctx context.Context,
    client pb.EventServiceClient,
    cursor uint64,
    applyAndCheckpoint func(*pb.Event) error,
) (uint64, error) {
    attemptCtx, cancel := context.WithCancel(ctx)
    defer cancel()

    stream, err := client.Subscribe(attemptCtx,
        &pb.SubscribeRequest{After: cursor})
    if err != nil {
        return cursor, err
    }
    for {
        event, err := stream.Recv()
        if err != nil {
            return cursor, err
        }
        if event.Sequence <= cursor {
            continue // Allowed replay under this example contract.
        }
        if err := applyAndCheckpoint(event); err != nil {
            return cursor, &CheckpointError{Cause: err}
        }
        cursor = event.Sequence
    }
}
```

The caller retains the returned cursor and invokes this function again only for failures the subscription contract classifies as recoverable. Use `context`, your generated `pb` package, and a client built from a long-lived `grpc.ClientConn`. Recreating the channel for every failed subscription is usually unnecessary.

The callback must persist the event effect and checkpoint together, or provide equivalent idempotent recovery. The in-memory cursor alone is insufficient after a process restart. The typed `CheckpointError` separates local processing failures from subscription failures, even when the callback itself uses gRPC and returns a transport-shaped error. In the outer loop, use `errors.As(err, &checkpointFailure)` with `var checkpointFailure *CheckpointError` **before** inspecting `status.Code(err)`. Route that result to application recovery rather than automatically reopening the network stream. The wrapper preserves the underlying cause for diagnosis.

## Give retries a budget and cancellation

Use exponential backoff with jitter, an upper delay bound, and an operational retry budget. Make the wait interruptible with the parent context. Recheck `ctx.Err()` before reopening, and refresh authentication using the normal credential mechanism.

`UNAVAILABLE` is a common reconnect candidate. `UNAUTHENTICATED`, `PERMISSION_DENIED`, invalid filters, and expired cursors need their own handling. `io.EOF` represents successful stream completion; whether to subscribe again depends on your protocol, not a blanket error rule.

For a bidirectional subscription, the new stream also needs its subscription/filter handshake. Run only one sender and one receiver for that stream and cancel both when it terminates. Do not let an old sender keep writing after a replacement stream is established.

## Test the ambiguous boundary

Disconnect after the server sends an event but before the client checkpoints it. Resume and assert that the event is applied exactly once under your deduplication or transactional scheme. Also crash after checkpointing, expire the cursor, and cancel during the retry delay.

Track last durable progress, reconnect count, and time without progress. A healthy channel is not proof that the application is receiving events.

## Conclusion

Replace a failed stream with a new RPC and restore it from durable application state. Correct resumption depends on checkpoint ordering and duplicate handling as much as it depends on reconnecting the transport.

## Official Documentation

- [Go gRPC ClientStream lifecycle](https://pkg.go.dev/google.golang.org/grpc#ClientStream)
- [Go context cancellation](https://pkg.go.dev/context)
- [gRPC retry lifecycle](https://grpc.io/docs/guides/retry/)
