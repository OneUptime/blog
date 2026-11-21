# Stop NGINX Idle gRPC Timeouts Without Hiding Dead Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, gRPC, Troubleshooting

Description: Give quiet gRPC streams a deliberate timeout budget, separate transport keepalive from progress, and test that stalled backends still fail promptly.

A watch stream can be healthy while nothing happens. An inventory feed might wait several minutes for a change. A stuck handler can look exactly the same from the network: an open connection with no new application messages.

Increasing every timeout to a day removes the immediate disconnect, but also makes some failures take a day to discover. A better fix starts by defining how long the application may be silent and what evidence distinguishes silence from failure.

The examples below target NGINX 1.30.7. Local runtime checks used Python 3.11 and gRPC 1.76.0 with a small server-streaming fixture.

## Identify the timer that fired

Record the elapsed time, final client RPC status, and NGINX error log for the same call. An error about an upstream read timeout points toward the proxy’s wait for backend data. `DEADLINE_EXCEEDED` can instead come from the caller’s deadline. A load balancer in front of NGINX introduces another independent timer.

Do not assume that every disconnect around 60 seconds has the same cause. Compare direct access to the backend with access through the full staging path, keeping the request and client deadline unchanged.

| Control | What it measures | What it cannot establish |
| --- | --- | --- |
| `grpc_connect_timeout` | Time to establish the upstream connection | Whether a running handler makes progress |
| `grpc_read_timeout` | Gap between successive upstream reads | Whether the business operation is healthy |
| `grpc_send_timeout` | Gap between successive upstream writes | Total lifetime of the RPC |
| Client RPC deadline | Total allowed call duration | Whether an interrupted write already completed |

The [NGINX gRPC module reference](https://nginx.org/en/docs/http/ngx_http_grpc_module.html#grpc_read_timeout) defines the read and write timers as intervals between operations, not whole-response budgets. The [gRPC deadline guide](https://grpc.io/docs/guides/deadlines/) describes the separate caller-controlled limit.

## Map the actual connection boundaries

```mermaid
flowchart LR
    C[Client] -->|HTTP/2 connection A| N[NGINX]
    N -->|HTTP/2 connection B| S[gRPC service]
    S -->|Application events or heartbeats| N
    N -->|Forwarded response messages| C
    S --> P[Progress and health measurements]
```

NGINX terminates one HTTP/2 connection and uses another toward the service. A client PING to NGINX is not an application message from the backend. Do not use successful client-to-proxy keepalive as evidence that a handler beyond the proxy is working.

gRPC keepalive uses HTTP/2 PING frames to check a connection. The [official keepalive guidance](https://grpc.io/docs/guides/keepalive/) explicitly separates that from service health and recommends coordinating settings with the service owner. Overly aggressive pings can trigger connection closure. Turning on very frequent pings is not a general repair for stalled work.

Likewise, `grpc_socket_keepalive on` enables operating-system TCP keepalive on upstream sockets; it does not create application heartbeat messages. Its timing depends on the host’s TCP settings. Treat it as transport failure detection, not a substitute for a stream contract.

## Set a budget for one streaming method

Suppose your application contract sends a heartbeat at least every 20 seconds, including quiet periods. A 75-second upstream read budget gives room for scheduling delays and more than one missed heartbeat. These are example policy values, not universal defaults.

Place this fragment inside the `http` block of an isolated NGINX configuration. It assumes a local fixture backend on port 50051 and reserves port 50052 for the proxy:

```nginx
server {
    listen 127.0.0.1:50052;
    http2 on;

    location = /lab.Watch/Events {
        grpc_pass grpc://127.0.0.1:50051;
        grpc_connect_timeout 3s;
        grpc_read_timeout 75s;
        grpc_send_timeout 15s;
        grpc_next_upstream off;
    }
}
```

The exact location limits the change to this method. A different method should keep its own budget. The example uses plaintext only on loopback; retain your production TLS and authentication when adapting it.

Validate the enclosing configuration with the matching binary before any rollout:

```bash
nginx -p "$PWD/" -c "$PWD/nginx.conf" -t
```

A successful check confirms syntax and referenced configuration resources. It does not establish that the backend responds or that another proxy permits the same idle period.

Choose a client deadline separately. A five-minute watch may legitimately last longer than the 75-second read interval because messages keep arriving. A renewable watch might use a bounded lifetime and reconnect from a saved cursor. A short unary request should not inherit that long lifetime merely because it shares a channel.

## Make heartbeat meaning explicit

A heartbeat is a normal message in your application protocol, with a documented type that clients can recognize. Do not insert arbitrary bytes into a protobuf stream. Both client and server must understand its schema.

Consider including the last processed event sequence and the time of last successful source read. A timer thread can keep sending heartbeats while the worker that reads the database is stuck. That demonstrates transport activity but hides the very failure you want to detect.

Track two ages: time since any message and time since meaningful progress. A quiet source needs a distinct “checked successfully, no changes” signal so that no events is not mistaken for no work. Set an alert on stale progress even when heartbeats continue.

For a separate readiness signal, gRPC defines a health service with `Check` and `Watch`. Applications must update its status; registering the endpoint does not automatically diagnose dependencies. See the [health-checking guide](https://grpc.io/docs/guides/health-checking/). A healthy readiness endpoint still cannot certify every individual stream’s progress.

## Test quiet, active, and stalled behavior

In a disposable fixture, use three cases before changing production values. Shortened timings make the experiment quick without pretending they are deployment recommendations.

I configured a one-second NGINX read timeout and a handler that immediately sent `start`. The results were:

| Fixture behavior | Observed outcome |
| --- | --- |
| No more messages for 1.6 seconds | Stream failed after about 1.01 seconds; NGINX logged an upstream timeout |
| Eight heartbeats 0.2 seconds apart, then completion | Ten messages including start and completion; RPC finished OK after about 1.66 seconds |
| Same heartbeat stream, client deadline 0.6 seconds | Caller received DEADLINE_EXCEEDED after about 0.61 seconds |

The silent case produced client status `INTERNAL` in this fixture, not an application-generated deadline status. Do not make an alert depend on that exact mapping across all libraries and failure phases. Retain the proxy log as the evidence for which timer expired.

These tests used loopback plaintext and application messages, not HTTP/2 PING experiments. They did not exercise packet loss, a cloud load balancer, production TLS, or a real database worker. Repeat the matrix through your staging topology and add a deliberate worker stall while the process remains alive.

## Reconnect without losing correctness

A closed stream needs application recovery. Persist a last acknowledged cursor, define whether reconnection can repeat events, and make consumers handle duplicates. Retry cannot restore an arbitrary partially consumed stream by itself.

Also verify that abandoned server work ends. The [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/) explains that handlers may need to check cancellation explicitly; cancelling a call does not forcibly interrupt arbitrary application computation.

Roll out the narrow timeout change with measurements of disconnect reason, message age, progress age, and reconnect rate. Accept the change only when healthy quiet streams survive and deliberately stalled streams still produce a bounded, explainable failure. That gives a longer-lived stream without turning silence into an unbounded wait.
