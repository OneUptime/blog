# Send and Read gRPC Trailers for Partial Results, Rate Limits, and Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, Metadata, Streaming, Error Handling

Description: Send and consume gRPC trailers at the correct lifecycle boundary, preserving partial-result semantics and useful rate-limit diagnostics.

---

A streaming export can deliver hundreds of records and still fail before completion. The records explain what arrived; the final gRPC status explains whether the call succeeded. Trailers can carry a compact summary, a diagnostic identifier, or quota information alongside that final status.

The most common implementation mistake is reading trailers too early or returning immediately on an RPC error before inspecting them. Design the response contract first, then collect trailers when the call ends.

## Decide What Belongs in Trailers

Initial metadata precedes response messages. Server trailers arrive at the end of the RPC. Custom keys should use lowercase names, avoid the reserved `grpc-` prefix, and use the `-bin` suffix for binary values. These are transport metadata conventions, not extra protobuf fields. [gRPC metadata guide](https://grpc.io/docs/guides/metadata/).

For an export API, an application contract might define:

| Trailer | Meaning |
| --- | --- |
| `x-export-records` | Number of records the handler submitted successfully to gRPC |
| `x-export-complete` | Whether the server reached the end of its dataset |
| `x-request-id` | Identifier for finding the matching server log |
| `x-quota-remaining` | Advisory quota snapshot when the call ended |

Document units, missing values, and whether keys may repeat. The server's submitted-record count does not prove the client received or committed those records. Keep durable progress and resume cursors in the application protocol when correctness depends on them.

## Set Trailers Before Returning

This helper is called by a Go streaming handler whose response message is `google.protobuf.StringValue`. The generated handler can pass its stream directly:

```go
package export

import (
    "strconv"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
    "google.golang.org/protobuf/types/known/wrapperspb"
)

func sendRecords(
    records []string,
    complete bool,
    stream grpc.ServerStreamingServer[wrapperspb.StringValue],
) error {
    sent := 0
    defer func() {
        stream.SetTrailer(metadata.Pairs(
            "x-export-records", strconv.Itoa(sent),
            "x-export-complete", strconv.FormatBool(complete),
        ))
    }()

    for _, record := range records {
        if err := stream.Send(wrapperspb.String(record)); err != nil {
            complete = false
            return err
        }
        sent++
    }
    if !complete {
        return status.Error(codes.ResourceExhausted, "export quota reached")
    }
    return nil
}
```

The deferred function computes the final values when the handler exits. It still runs after a send failure, but a broken connection can prevent delivery of the trailers. Treat missing metadata as an expected failure case.

For unary handlers, call `grpc.SetTrailer(ctx, md)` and handle its returned error. Streaming `SetTrailer` has no error return. Multiple calls merge metadata, so construct single-valued summaries once instead of appending conflicting values. [gRPC-Go server metadata API](https://pkg.go.dev/google.golang.org/grpc#ServerStream).

## Read the Terminal Status and Metadata Together

A reusable receiver can preserve both:

```go
func readRecords(
    stream grpc.ServerStreamingClient[wrapperspb.StringValue],
) ([]string, metadata.MD, error) {
    var records []string
    for {
        record, err := stream.Recv()
        if err != nil {
            trailers := stream.Trailer()
            if err == io.EOF {
                return records, trailers, nil
            }
            return records, trailers, err
        }
        records = append(records, record.GetValue())
    }
}
```

Add `io` to the imports. For a large export, replace the slice with a bounded sink and preserve the same terminal handling. If that sink fails, cancel the RPC context and return the sink error; it is a local consumption failure, and you cannot assume final server trailers are available.

Call `Trailer()` after `Recv()` returns an error, including `io.EOF`. For a client-streaming call, read trailers after `CloseAndRecv()`. A successful `CloseSend()` alone does not mean the response has finished. [gRPC-Go client stream API](https://pkg.go.dev/google.golang.org/grpc#ClientStream).

For unary calls, capture `grpc.Trailer(&trailers)` through the generated client method's call options and inspect the result even when `err != nil`.

## Keep Partial Results Explicit

A non-OK terminal status means the RPC failed even if earlier messages arrived. Decide whether callers may retain those messages, display them as incomplete, or discard them. For all-or-nothing exports, write to temporary storage and publish only after successful completion.

For resumable exports, assign stable record IDs and send checkpoints in messages. A client that loses the final trailers must still be able to resume without guessing. A custom `x-export-complete=true` value should never override a non-OK gRPC status.

## Treat Rate Information as a Contract

Custom quota trailers do not automatically configure client retries. If the application consumes a retry delay, validate its numeric form, cap it, respect the original deadline, and use an idempotency policy before retrying.

For structured failures, supported gRPC implementations can attach protobuf error details to the status. Keep details small and include a stable diagnostic code rather than a stack trace. Rich error support varies across languages and intermediaries. [gRPC error handling](https://grpc.io/docs/guides/error/).

A stream that has already returned response headers is committed for gRPC's built-in retry mechanism; a terminal error does not automatically replay its delivered records. [gRPC retry lifecycle](https://grpc.io/docs/guides/retry/).

## Verify Success and Failure Paths

Exercise four cases through the actual proxy route: success, quota rejection before any records, failure after several records, and client cancellation. Assert the status, received-record count, and metadata independently. Also test missing and malformed optional trailers.

Measure trailer loss separately from application failures. A request ID that is present on successful calls but consistently absent on failures often points to an intermediary-generated response or an early transport failure. The useful diagnostic is the complete call outcome, including what arrived before termination.
