# Why Does gRPC Return `DEADLINE_EXCEEDED` After Work Has Already Started?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Timeout, Cancellation, Distributed System, Reliability

Description: Explain why a gRPC client deadline can expire after server work or a commit, how to prove the race, and how to make writes safe under an unknown outcome.

---

A gRPC deadline describes how long the client is willing to wait. It is not a promise that the server never began the operation, a database transaction rolled back, or no side effect occurred.

gRPC's status-code documentation is explicit: `DEADLINE_EXCEEDED` can be returned for a state-changing operation even when that operation completed successfully. A successful server response may simply arrive after the client's deadline.

## The Client and Server Observe Different Events

Consider a create operation with a 500-millisecond deadline:

```text
time       client                         server
0 ms       starts RPC                     receives request
100 ms                                    validates request
420 ms                                    commits database write
500 ms     deadline expires
           returns DEADLINE_EXCEEDED
530 ms                                    prepares successful response
           no client remains to use it
```

Both observations are correct:

- the server completed the durable write;
- the client did not receive a result before its deadline.

The client's status answers whether the RPC completed from the client's perspective. It does not establish the business outcome of an ambiguous write.

## A Deadline Causes Cancellation, Not Rollback

When the deadline expires, gRPC cancels the call. The server-side application must still cooperate with that cancellation.

The gRPC deadline guide says the server application is responsible for stopping activity it spawned for the RPC. The cancellation guide adds that the gRPC library generally cannot interrupt arbitrary application handler code. Long-running work must observe the call's cancellation signal and stop.

Even cooperative code has an irreversible boundary:

```text
check cancellation -> commit -> cancellation arrives
```

The cancellation can race with the commit. Checking immediately before a write narrows wasted work but does not make a distributed cancellation atomic with that write.

Use idempotency or an operation-status protocol when the client may retry.

## The Deadline Can Expire in Any Phase

The server may have started useful work while time was consumed elsewhere:

- client-side name resolution or connection setup;
- load-balancer queueing;
- gRPC transport and HTTP/2 flow control;
- server admission queues;
- authentication or interceptor work;
- database pool acquisition;
- lock waits and query execution;
- downstream RPCs;
- response serialization;
- network delivery back to the client.

A five-second server handler log does not prove a five-second client experience. Record the deadline remaining when the request enters the handler, not just total handler duration.

## By Default, There May Be No Deadline

Current gRPC guidance says clients do not set a deadline by default, which can leave them waiting effectively forever. Applications should set realistic deadlines based on measured network and service behavior.

The opposite mistake is a deadline shorter than the service can satisfy under normal tail latency. That causes clients to abandon useful work and may trigger retries that overlap the original attempt.

Select the deadline from the end-to-end latency objective, then allocate the remaining budget across service hops. Do not give every downstream hop the original full timeout.

## Propagate the Remaining Deadline

If service A receives a request and calls service B, B should receive only the time still available:

```text
client deadline:       2.0 s
time spent before B:   0.6 s
budget sent to B:      about 1.4 s, less local reserve
```

gRPC supports deadline propagation in several languages. The official guide notes that Java and Go enable propagation by default for calls made with the incoming context, while C++ requires it to be enabled. gRPC converts a propagated deadline to a timeout after deducting elapsed time, avoiding direct dependence on synchronized clocks.

Propagation fails when application code discards the incoming context:

```go
// Wrong for request-scoped work: this loses cancellation and the deadline.
response, err := downstream.Lookup(context.Background(), request)
```

Use the handler context instead:

```go
// Request-scoped work should use the handler context.
response, err := downstream.Lookup(ctx, request)
```

An intentionally durable asynchronous job is different. It should have an explicit acceptance API, return a stable operation ID, and run under a documented job lifecycle rather than silently detaching a synchronous RPC.

## Diagnose Where the Deadline Went

Correlate one logical operation across client and server with:

- client-configured deadline or timeout;
- client call start and completion;
- retry attempt number;
- server receive time;
- deadline remaining at handler entry;
- interceptor and queue duration;
- database pool wait and query duration;
- downstream RPC duration and propagated remaining budget;
- durable commit time;
- response serialization and send time;
- server observation of cancellation;
- stable idempotency or operation ID.

Use synchronized clocks for human-readable cross-host timelines, but calculate durations and expiry with monotonic clocks through the language runtime.

A server trace that ends `OK` and a client trace that ends `DEADLINE_EXCEEDED` are not necessarily contradictory. Check whether the server completion occurred after the client deadline or whether the response was delayed in transit.

## Do Not Blindly Retry the Status

For a read-only RPC, a bounded retry may be safe when enough deadline remains and the failure is transient. For a write, `DEADLINE_EXCEEDED` is an unknown result.

Use a client-generated operation ID:

```protobuf
message CreateOrderRequest {
  string operation_id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
}
```

The server enforces a uniqueness constraint on `(tenant_id, operation_id)` and stores the result with the write. A retry sends the same ID and receives the existing result instead of creating another order.

Alternatively, expose a status lookup:

```protobuf
rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
rpc GetOperation(GetOperationRequest) returns (Operation);
```

After an ambiguous deadline, the client can reconcile by operation ID.

gRPC retry configuration is per method and per status code. A retry policy does not make a method idempotent. The service contract must supply that safety.

## Separate Synchronous and Durable Work

If work must continue after the caller stops waiting, model it as an asynchronous operation:

1. Validate and durably accept the command.
2. Return an operation handle promptly.
3. Process under a job-owned deadline and retry policy.
4. Let the client poll or subscribe to completion.
5. Deduplicate repeated submissions by operation ID.

This is more honest than a synchronous handler that keeps running after every deadline while clients assume failure.

For genuinely request-scoped work, stop on cancellation:

- cancel downstream RPCs;
- use database APIs that accept the request context;
- end loops and streaming producers;
- release pool connections and locks;
- do not enqueue additional work;
- return from spawned goroutines.

## Tune with Tail Latency, Not the Average

A deadline set near mean latency creates frequent false timeouts at ordinary variance. Measure:

- p50, p95, p99, and p99.9 by method;
- cold connection and warm connection behavior;
- payload-size effects;
- overload and failover latency;
- the percentage of timed-out writes later found committed;
- cancellation-to-stop delay;
- useful success rate from retries.

Leave room for network return and response decoding. A server-side budget that consumes the entire client deadline still produces late successful responses.

## Incident Checklist

1. Confirm the actual deadline applied to the call.
2. Check whether another interceptor or parent context supplied a shorter deadline.
3. Compare commit time with client expiry.
4. Verify downstream calls inherit the incoming context.
5. Find handler work that ignores cancellation.
6. Check retry configuration at the client, proxy, and service mesh.
7. Reconcile ambiguous writes using a stable operation ID.
8. Load test the new deadline and cancellation behavior at tail latency.

`DEADLINE_EXCEEDED` means the result missed the client's waiting window. Design cancellation to conserve resources and idempotency to protect correctness, because no deadline can make a remote commit and a client observation happen atomically.

## Official Documentation

- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)
- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [gRPC retry guide](https://grpc.io/docs/guides/retry/)
- [gRPC error handling](https://grpc.io/docs/guides/error/)
