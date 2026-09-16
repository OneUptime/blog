# gRPC Hits the HTTP/2 Concurrent-Stream Limit: Tune Connections, Queues, and `MAX_CONCURRENT_STREAMS`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, HTTP/2, Performance, Troubleshooting

Description: Identify gRPC client queuing at HTTP/2 stream limits, tune the receiving hop, and bound admission before adding measured connection capacity.

---

Your gRPC server uses little CPU, its handler latency looks healthy, and clients still time out under load. One possible cause is an HTTP/2 connection that has no free stream slots. Requests can wait on the client before the server ever sees them.

Long-lived subscriptions make this easier to trigger: a stream can consume a slot while exchanging almost no data. Increasing message-size limits or flow-control windows will not create additional concurrent RPC slots.

## Locate the exhausted connection

An RPC uses an HTTP/2 stream. The receiving peer advertises how many concurrent streams it allows the sender to open on that connection. The wire setting is `SETTINGS_MAX_CONCURRENT_STREAMS`; configurations often shorten its name.

A channel is not necessarily one connection. A resolver and load-balancer policy can create multiple transports, while some runtimes can share transports across apparently separate channel objects. Count actual connections rather than assuming one stub or channel equals one socket.

The [gRPC performance guide](https://grpc.io/docs/guides/performance/) explicitly describes client-side queuing when active RPCs reach the connection's stream limit. This can happen without a corresponding slow server handler.

A proxy introduces another capacity boundary. There is a client-to-proxy connection and a proxy-to-backend connection pool, each with its own settings. Raising the backend limit will not necessarily resolve a queue on the client-facing proxy connection.

## Estimate how much room remains

Consider a connection with an advertised limit of 100 streams. If 90 subscriptions stay open, only about 10 slots remain for other simultaneous RPCs on that connection. Those numbers are illustrative, not gRPC defaults.

For unary traffic, a rough concurrency estimate is arrival rate multiplied by mean RPC duration. At 400 requests per second and 50 milliseconds of active duration, average concurrency is about 20. Bursts and tail latency require additional headroom.

Measure active streaming RPCs separately from unary throughput. A requests-per-second dashboard alone can hide thousands of quiet subscriptions. Record client call duration, server execution duration, active streams, pending requests where exposed, and connection count at each hop.

If the client reports a deadline exceeded but no matching server invocation exists, pre-handler waiting is a useful hypothesis. Also rule out name resolution, connection establishment, application admission queues, and tracing gaps before assigning the delay to stream slots.

## Tune the peer that advertises the limit

For the native Go gRPC server, the relevant option is [`grpc.MaxConcurrentStreams`](https://pkg.go.dev/google.golang.org/grpc#MaxConcurrentStreams):

```go
package serverconfig

import "google.golang.org/grpc"

func New() *grpc.Server {
    // Illustrative per-transport capacity; benchmark before deployment.
    return grpc.NewServer(grpc.MaxConcurrentStreams(256))
}
```

This is a limit for each server transport, not a global limit on application work. A hundred connections can collectively admit far more than 256 RPCs. Protect database connections, downstream dependencies, and memory separately.

Deploying a higher value can move the bottleneck into the server. Compare memory, CPU, downstream saturation, and tail latency while gradually increasing load. If a proxy is the exhausted receiving peer, use its documented HTTP/2 configuration instead of changing an unrelated gRPC client argument.

The [HTTP/2 settings specification](https://www.rfc-editor.org/rfc/rfc9113.html#name-defined-settings) defines this as a peer-advertised concurrency constraint. Sending a larger value from the client does not override the server's advertised limit for client-initiated requests.

## Bound application admission

Use a process-wide admission limit before issuing calls. This example immediately rejects excess work instead of adding another waiting queue:

```go
package admission

import (
    "context"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type Gate struct {
    slots chan struct{}
}

func New(limit int) *Gate {
    if limit < 1 {
        panic("admission limit must be positive")
    }
    return &Gate{slots: make(chan struct{}, limit)}
}

func (g *Gate) Run(ctx context.Context, rpc func(context.Context) error) error {
    if err := ctx.Err(); err != nil {
        return status.FromContextError(err).Err()
    }
    select {
    case g.slots <- struct{}{}:
        defer func() { <-g.slots }()
        return rpc(ctx)
    default:
        return status.Error(codes.ResourceExhausted, "client admission limit reached")
    }
}
```

Create one shared `Gate`, not a new one per request. The callback should execute a unary RPC to completion. For a streaming RPC, returning immediately after creating the stream releases the slot too early; hold admission for the stream's entire lifecycle.

The callback also needs a deadline. Admission limits bound concurrency, while deadlines bound duration. If rejected work must eventually execute, place it in a durable queue with an explicit retry schedule instead of spawning another goroutine immediately.

## Add connections only after measurement

Separating bulk subscriptions from latency-sensitive unary traffic can prevent one workload from occupying all shared slots. A small channel pool can also help when a measured connection limit is the bottleneck.

Verify that a pool creates additional transports in your runtime. Some C-core configurations reuse subchannels, and the official performance guidance discusses distinct channel arguments when using that workaround. Do not assume a generic pool implementation behaves identically across Go, Java, and Python.

More connections consume sockets, TLS handshakes, proxy state, and server resources. Load-balance work across the new capacity and close the pool during shutdown. Avoid creating a fresh connection for every request.

Validate the change with a realistic mix of quiet subscriptions, bursts of unary traffic, slow backends, and cancellations. The goal is bounded waiting and predictable latency while keeping total admitted work within the service's actual capacity.
