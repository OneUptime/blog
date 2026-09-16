# How to Shut Down a gRPC Server Gracefully Without Terminating Long-Lived Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, Reliability, API, DevOps

Description: Drain a Go gRPC server with cooperative stream completion, a bounded shutdown deadline, and a force-stop fallback that makes interrupted streams explicit.

---

A server can finish existing streams during shutdown, but it cannot both preserve an endless stream forever and exit within a fixed deadline. For long-lived subscriptions, graceful shutdown needs an application agreement: finish a batch, communicate a resume position, and let the client open a replacement stream.

The transport shutdown API supplies part of that behavior. Your handlers and clients supply the rest. Treat a rolling restart as a normal protocol event rather than hoping that a longer termination timeout will eventually make an infinite subscription finish.

## Separate draining from process termination

The [gRPC graceful shutdown guide](https://grpc.io/docs/guides/server-graceful-stop/) describes a drain followed by a forceful stop if work does not finish in time. In Go, `GracefulStop()` waits for pending RPCs and prevents acceptance of new RPCs. `Stop()` closes connections and cancels active RPCs.

A useful sequence is:

1. Mark the instance unavailable for new application work through readiness or service discovery.
2. Signal application stream handlers to reach a safe stopping point.
3. Start transport draining while keeping the process and its dependencies alive.
4. Exit after handlers finish, or force-stop when the shutdown budget expires.

Readiness changes need time to reach clients and proxies. Do not assume a readiness update instantly stops every request. Likewise, do not close the database, event log, or worker pool while stream handlers still need those resources to finish.

## Bound the transport drain

This reusable helper takes an already-running Go gRPC server. Invoke it once from your process shutdown coordinator after initiating application draining:

```go
package drain

import (
    "time"

    "google.golang.org/grpc"
)

// StopWithin reports whether all RPCs finished before the budget expired.
func StopWithin(server *grpc.Server, budget time.Duration) bool {
    finished := make(chan struct{})
    go func() {
        server.GracefulStop()
        close(finished)
    }()

    timer := time.NewTimer(budget)
    defer timer.Stop()

    select {
    case <-finished:
        return true
    case <-timer.C:
        go server.Stop()
        return false
    }
}
```

A return value of `false` means force-stop was initiated, not that all shutdown work finished. Record it separately from a successful drain. The timer bounds this helper by starting `Stop` asynchronously: concurrent shutdown coordination or `grpc.WaitForHandlers(true)` can otherwise leave a stop call waiting for handlers. The signal owner must terminate the process after its bounded cleanup; process exit closes remaining transports and provides the final bound for user goroutines that ignore cancellation.

The API semantics are documented on [`Server.GracefulStop` and `Server.Stop`](https://pkg.go.dev/google.golang.org/grpc#Server.GracefulStop). This example targets the native `grpc.Server.Serve` transport. If gRPC is hosted through `net/http`, coordinate the HTTP server's lifecycle as well.

## Give stream handlers a completion boundary

Keep process shutdown separate from the RPC context. Canceling a parent context immediately may abort useful work before a handler has sent its final message.

For a server-streaming subscription, pass a shared, receive-only draining channel into the handler. Close that channel once when shutdown starts. A handler can stop reading new events, finish the current event, and return normally.

The following protocol sketch illustrates the choices; the field names are application-defined:

```proto
syntax = "proto3";
package events.v1;

message Event {
  string id = 1;
  bytes payload = 2;
  string resume_token = 3;
}

message DrainNotice {
  string reason = 1;
}

message WatchResponse {
  oneof item {
    Event event = 1;
    DrainNotice drain = 2;
  }
}
```

Only the goroutine that owns `Send` should transmit the drain notice. Sending concurrently from a signal handler introduces ordering problems and violates the stream's send concurrency requirements. If that goroutine is already blocked sending to a slow client, the force-stop budget still applies.

A notice helps clients reconnect promptly, but it is not a durable acknowledgment. The client should persist its resume position only after it has processed the corresponding event. The replacement server must be able to replay from that position using shared storage. A cursor that only refers to the old process's memory cannot survive replacement.

## Make client completion explicit

For a finite query, normal end-of-stream means the query completed. For a subscription intended to continue indefinitely, normal end-of-stream can mean open another subscription. Document this distinction in the API contract.

When reconnecting, use bounded exponential backoff with jitter and retain the last committed cursor. Replayed events need stable identifiers so the consumer can suppress duplicate effects. Avoid restarting every subscriber at exactly the same delay after a deployment.

Do not describe reconnection as moving an existing gRPC stream to another server. A replacement RPC is a new stream with application state supplied by the client. Native gRPC does not transfer your handler's in-memory state.

## Fit the deployment budget around the drain

For a container deployment, choose an overall termination allowance that exceeds discovery propagation, application completion, transport shutdown, and final cleanup. Measure these phases independently. A fixed sleep before draining consumes that allowance without proving anything about active subscriptions.

Test three cases before relying on the shutdown path: a finite stream finishes normally, an idle subscription receives the drain signal and reconnects, and a client that stops reading triggers the force-stop fallback. Also interrupt a client after processing an event but before persisting its cursor to verify duplicate handling.

Success means the restart preserves the subscription's application-level progress and reports any forced interruption. It does not mean the original HTTP/2 stream remains open after its server process exits.
