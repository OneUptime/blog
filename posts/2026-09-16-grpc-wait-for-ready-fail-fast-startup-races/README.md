# `wait_for_ready` vs. Fail Fast in gRPC: Prevent Startup Races Without Hiding Outages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Python, Reliability, API, Troubleshooting

Description: Use per-call wait_for_ready and deadlines to absorb gRPC startup races while bounding queues and preserving useful outage signals.

---

A client starts before its dependency, sends its first RPC, and receives `UNAVAILABLE`. Retrying the whole job works, but adds noise and can repeat earlier job steps. For calls that can tolerate a brief connection delay, gRPC's `wait_for_ready` can keep the call pending until a transport becomes usable.

The important limit is the RPC deadline. Waiting without a deadline can turn a short startup race into a worker that stays occupied throughout an outage.

## Understand what fail fast actually means

The default behavior is often called fail fast. It does not mean every call made before connection establishment immediately fails. Calls made while the channel is idle or connecting can already wait for connection establishment.

The distinction matters when the channel reaches `TRANSIENT_FAILURE`. A default call can fail there; a wait-for-ready call stays queued while the channel attempts to recover. A deadline, cancellation, or another terminal condition can still end the call. See the [official wait-for-ready guide](https://grpc.io/docs/guides/wait-for-ready/).

Neither setting validates business readiness. A server might accept an HTTP/2 connection while its database is unavailable, or respond with an application error after the request arrives. Wait-for-ready only influences waiting for an available connection before the call is sent.

## Set the policy per operation

The following synchronous Python example uses the standard gRPC health service as a small, real RPC. Install `grpcio` and `grpcio-health-checking` in your application's environment first. The loopback server at port 50051 must implement that service.

```python
import grpc
from grpc_health.v1 import health_pb2, health_pb2_grpc


def check_dependency(stub, *, allow_startup_wait):
    response = stub.Check(
        health_pb2.HealthCheckRequest(service=""),
        timeout=4.0,
        wait_for_ready=allow_startup_wait,
    )
    if response.status != health_pb2.HealthCheckResponse.SERVING:
        raise RuntimeError("Dependency is reachable but not serving")
    return response


def main():
    # Plaintext is for this loopback example.
    with grpc.insecure_channel("127.0.0.1:50051") as channel:
        stub = health_pb2_grpc.HealthStub(channel)
        try:
            check_dependency(stub, allow_startup_wait=True)
        except grpc.RpcError as error:
            print(f"Health RPC failed: {error.code().name}")
            raise


if __name__ == "__main__":
    main()
```

The four-second timeout covers connection waiting and execution of this call. It does not start over when the connection becomes ready. Use the same principle with your generated business stub and a timeout derived from the operation's actual budget. The [Python call API](https://grpc.github.io/grpc/python/grpc.html#grpc.UnaryUnaryMultiCallable.__call__) documents `timeout` and `wait_for_ready`.

For network traffic, use a secure channel with the correct CA roots and server identity. The waiting policy is independent of whether the connection uses TLS.

## Allocate waiting from the caller's budget

Suppose an interactive request has 700 milliseconds remaining. Giving an internal call a four-second startup wait cannot improve that request: its caller will already have gone away. Pass cancellation and remaining deadline through the request chain and reserve time for any work after the RPC.

A scheduled worker might reasonably allocate several seconds to dependency startup because no person is waiting on an immediate response. Even there, waiting needs a bound and a recovery path when the bound expires.

Use operation-specific choices:

| Operation | Useful starting policy |
|---|---|
| Batch initialization with a short expected dependency delay | Wait-for-ready with a bounded deadline |
| Interactive request with a tight remaining budget | Short deadline; usually default failure behavior |
| Background work whose input is durable | Bounded wait followed by durable rescheduling |
| Existing bidirectional stream after a network break | Explicit stream restart and application resumption |

These are design choices, not universal timeouts. Measure how much latency your workload can absorb.

## Keep retries separate

Wait-for-ready is not a retry policy for an operation that has already been sent. If the connection fails during execution, the client may be unable to tell whether a mutation committed. Waiting for another connection does not make that operation idempotent.

The [gRPC retry guide](https://grpc.io/docs/guides/retry/) explains the separate retry mechanism and the point at which an RPC becomes committed to its attempt. If you enable retries as well, reason about the combined deadline and duplicate side effects. Avoid multiplying a framework retry policy by an unbounded outer retry loop.

For streaming calls, readiness waiting applies when starting the RPC. It does not replay messages from a broken, established stream or restore the server's session state.

## Bound queued work and observe expired waits

During an outage, each waiting call retains application resources. A service accepting 200 new requests per second with a ten-second waiting budget could accumulate roughly 2,000 waiting calls before steady expiration, assuming arrival continues. That estimate excludes payload size, retries, and worker overhead.

Cap admitted concurrency before issuing RPCs. When the cap is full, reject, shed, or persist work according to the product contract. A deadline bounds each call's lifetime; it does not cap the number of callers allowed to wait simultaneously.

Record end-to-end client latency, status code, deadline expirations, admitted concurrency, and channel failures. Server handler latency alone misses time spent waiting before a request reaches the server.

Test startup with the server initially absent and then available, and test an outage that exceeds the deadline. The first scenario should recover within budget; the second should release the caller predictably and remain visible in monitoring.
