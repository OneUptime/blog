# Validation Summary: How to Resume a Go gRPC Subscription After Recreating a Broken Stream

## Status
validated

## Post Type
Technical troubleshooting guide with a Go implementation fragment.

## Technologies Covered
- Go context cancellation and error wrapping
- gRPC-Go client connections and server-streaming RPCs
- Bidirectional streaming and concurrency
- Protocol Buffers generated Go clients and messages
- Application resume cursors, durable checkpoints, and duplicate handling
- Retry backoff, cancellation, and status codes

## Sources Consulted
- Go gRPC ClientStream and ClientConn documentation: https://pkg.go.dev/google.golang.org/grpc#ClientStream
- Go context cancellation: https://pkg.go.dev/context#WithCancel
- Go error matching and unwrapping: https://pkg.go.dev/errors#As
- gRPC-Go status extraction from wrapped errors: https://pkg.go.dev/google.golang.org/grpc/status#Code
- gRPC retry lifecycle and backoff: https://grpc.io/docs/guides/retry/
- gRPC status codes: https://grpc.io/docs/guides/status-codes/
- gRPC generated Go client methods and stream concurrency: https://grpc.io/docs/languages/go/generated-code/
- Protocol Buffers Go generated code (Open API): https://protobuf.dev/reference/go/go-generated/
- Author profile link verified: https://github.com/nawazdhandala

## Issues Found
- The example contract promised events strictly after N while also allowing replay of the last processed event. Qualified the first bullet to explicitly allow the stated replay exception, making the contract consistent with the duplicate-handling code.
- The contract described ordered events with unique identifiers without explicitly requiring distinct events to have strictly increasing sequence numbers. Made that requirement explicit because the code discards every event whose sequence is at or below the saved cursor; shared or decreasing sequences could otherwise cause unprocessed events to be skipped.

## Review Notes
- Reviewed the Go fragment for syntax, API use, and control flow. Subscribe and Recv match the documented server-streaming client pattern. The deferred cancel releases attempt resources even when local processing fails.
- Verified terminal receive errors, successful EOF completion, connection reuse, and the limit of one concurrent sender and one concurrent receiver per stream. EOF success applies to the receive path described here; a bidirectional Send returning EOF does not itself establish successful RPC completion.
- Verified that errors.As can identify CheckpointError through wrapping and that status.Code also examines wrapped status errors. Checking the application wrapper first correctly prevents a local callback failure from being mistaken for a retryable subscription failure.
- Built-in retries stop after response headers commit the RPC. They do not implement application cursor recovery for an established subscription. The retry budget, cancellation checks, jitter, and error-specific handling are appropriate recommendations.
- Cursor retention, expiry, partition scope, snapshot recovery, and exactly-once effects are application protocol requirements, not gRPC guarantees. Correct recovery depends on the stated atomic effect/checkpoint operation or equivalent durable idempotency. The initial cursor must precede the first desired event and be restored from durable storage on restart.
- The fragment intentionally omits the generated pb package, imports, server, durable storage implementation, and outer retry loop. Its After and Sequence fields must be compatible with uint64 and accessible as assumed; protobuf Open API scalar fields support this style. Opaque generated messages require their generated accessors/builders instead.
- No deprecated API usage, terminal commands, configuration snippets, or pinned-version claims were found. All external links were checked and point to the intended resources.
- Validation was documentation-based and by code inspection. Go is not available on PATH in this environment, and no generated service implementation is supplied, so compilation and live disconnect/crash tests were not run. The suggested fault-injection tests remain necessary for an actual application.
