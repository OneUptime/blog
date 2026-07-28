# Connect, TLS Handshake, Read, Write, Idle, and Total Timeouts: Which One Actually Fired?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, Timeout, TLS, Nginx, Network Troubleshooting

Description: Identify the expired timer by reconstructing the request phase, timer owner, and implementation-specific meaning instead of treating every timeout as a slow server.

---

“The HTTP request timed out” is incomplete incident data. A single request crosses name resolution, connection establishment, TLS, request upload, server processing, response download, and possibly idle periods on reused connections. Different components place timers around different portions of that sequence.

The first task is to answer three questions:

1. **Who emitted the error?** Client library, operating system, CDN, load balancer, proxy, application, or downstream dependency?
2. **What operation was in progress?** Resolving, connecting, handshaking, writing, waiting for headers, reading a body, or sitting idle?
3. **What does that component's documented timer measure?** Wall-clock duration, inactivity between I/O operations, or time remaining until a deadline?

The option name alone is not enough. Timeout semantics are implementation-specific.

## Map the Request as a Timeline

A new HTTPS request usually looks like this:

```text
DNS -> TCP connect -> TLS (or QUIC with integrated TLS) -> request headers/body
    -> server work -> response headers/body -> reusable idle connection
```

A reused HTTP connection skips DNS, TCP, and usually TLS. A proxy creates separate client-side and upstream transports, so its error can name a different phase than the client's.

Use a phase table before changing configuration:

| Timer family | Protected operation | Typical symptom |
| --- | --- | --- |
| Connect | Establishing a usable connection | No usable connection before the limit |
| TLS handshake | Negotiating TLS on a connected transport | TCP established, no completed TLS session |
| Write/send | Making progress transmitting request bytes | Peer is not consuming headers or body |
| Read/response | Receiving response bytes or headers | Request sent, response absent or stalled |
| Idle | No traffic or no next request on an established connection | Long-lived/reused connection is closed |
| Total/deadline | Entire logical operation | Outer budget expires regardless of current phase |

DNS, redirects, retries, pool queueing, and body consumption may be included or governed separately. Read the library version's documentation.

## Connect Timeout

A connect timeout protects connection establishment, but even this term varies.

curl's `--connect-timeout` includes DNS lookup and the requested TCP, TLS, or QUIC handshakes. The curl connection phase ends only when those negotiations are complete. By contrast, Python Requests documents its connect timeout in terms of the socket `connect()` operation, and notes that it applies to each IP-address attempt. Multiple addresses can therefore make observed elapsed time longer than one configured connect value.

On a plain TCP trace:

```text
SYN -> retransmissions -> no SYN-ACK -> connect timeout
```

But if TCP completes and TLS stalls, curl can still say its connection phase timed out. Record verbose output instead of inferring the phase from the option:

```bash
curl -v \
  --connect-timeout 2 \
  --max-time 10 \
  https://api.example.com/resource
```

For NGINX proxying, `proxy_connect_timeout` is specifically the time allowed to establish the connection to the proxied server. It is an upstream-side timer, independent of how long the client took to connect to NGINX.

## TLS Handshake Timeout

TLS begins after TCP; with QUIC, the transport and TLS handshakes are integrated. A handshake can stall because of packet loss, filtering, an overloaded terminator, a protocol mismatch, or a proxy that accepts TCP without progressing the tunnel.

Go's `http.Transport` exposes `TLSHandshakeTimeout` separately from dial and response-header controls. Other stacks roll it into connect or total time. Therefore, “TLS handshake timeout after 10 seconds” in Go and “curl connect timeout after 10 seconds” can cover overlapping but non-identical intervals.

Confirm with packet or TLS diagnostics. A completed TCP handshake followed by retransmitted TCP segments carrying a ClientHello, without a ServerHello, points beyond TCP connect. A TLS alert is an explicit failure, not a timeout.

## Write or Send Timeout

A write timeout fires when the sender cannot progress. This matters for large uploads, constrained uplinks, a peer that stops reading, and exhausted protocol flow control.

NGINX's `proxy_send_timeout` is an inactivity timer **between two successive write operations** to the upstream. It is not a maximum duration for the complete request upload.

That distinction changes diagnosis. A 20 GB upload can exceed 60 seconds and still succeed if every interval between writes stays below 60 seconds. A small request can fail if the upstream stops receiving bytes for longer than the timer.

Some SDKs have no separate HTTP write timer and require an overall context or deadline. Do not copy NGINX semantics into another SDK.

## Read Timeout

Read timeouts are especially easy to mislabel as “server execution time.”

Python Requests documents its read timeout as the time the client waits **between bytes sent by the server**, not a wall-clock limit on the complete response. NGINX similarly defines `proxy_read_timeout` as time between successive reads from the proxied server, not time for the full response transmission.

This means a streaming response can remain open much longer than the read timeout if data continues to arrive. It also means a backend can keep a connection alive with periodic bytes while exceeding the user's useful end-to-end latency.

Some clients distinguish:

- response-header timeout: request was written, but headers did not arrive;
- response-body inactivity: headers arrived, then body progress stopped;
- total read duration: full body must complete by a deadline.

Go's `ResponseHeaderTimeout`, for example, waits for response headers after the request, including its body, has been fully written. It explicitly does not include reading the response body. Go's `http.Client.Timeout` is broader: it includes connection time, redirects, and reading the response body, and remains active after `Do` returns.

Always record whether any response headers or body bytes arrived. A first-byte stall and a mid-body stall have different likely causes.

## Idle Timeout

An idle timeout applies to an established connection with no qualifying traffic. Load balancers, firewalls, keepalive pools, HTTP servers, and streaming infrastructure use it.

AWS documents an Application Load Balancer connection idle timeout as the time an existing client or target connection can have no data sent or received before closure. NGINX and client libraries also use “idle” for how long a reusable keepalive connection can remain in a pool. Those are related but not interchangeable.

Go's `IdleConnTimeout` governs an idle keepalive connection in its client pool, not an active request. Node.js server `keepAliveTimeout` applies after a response while waiting for more data.

Mismatched idle/keepalive lifetimes often produce resets or 502s on reused connections rather than a clean timeout. The component that intends to retire a connection should normally do so cleanly before another layer attempts reuse.

## Total Timeout or Deadline

A total timeout bounds the logical operation regardless of phase. It protects the caller's latency and resource budget from a succession of individually acceptable delays.

curl's `--max-time` limits the whole transfer. Go's `Client.Timeout` includes connection setup, redirects, and body reading. gRPC uses a deadline: a point after which the client is no longer willing to wait. gRPC implementations translate propagated deadlines to remaining time, deducting elapsed work.

Do not derive a total timeout by adding several full-size phase timeouts and then give every phase that maximum. A total deadline should be the outer bound; phase timers should detect local stalls early while remaining within it.

For example:

```text
total request deadline:       1500 ms
connection establishment cap: 150 ms
TLS handshake cap:             200 ms
response-header cap:          remaining deadline, at most 900 ms
body progress cap:             250 ms of inactivity
```

These are illustrative, not universal production values. Derive them from measured latency, network reach, payload size, and the caller's service objective.

## Determine Which Timer Won

Collect a synchronized record:

- exact client exception and monotonic elapsed duration;
- selected remote IP and whether the connection was reused;
- DNS, connect, TLS, first-byte, and total timings;
- bytes sent and received;
- proxy upstream address, status, and phase timings;
- outer cancellation or deadline state.

curl can expose phase timing:

```bash
curl -sS -o /dev/null \
  --connect-timeout 2 \
  --max-time 10 \
  -w 'ip=%{remote_ip} dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} first_byte=%{time_starttransfer} total=%{time_total}\n' \
  https://api.example.com/resource
```

For NGINX, log variables such as:

```nginx
log_format timed '$request_id status=$status request=$request_time '
                 'upstream=$upstream_addr upstream_status=$upstream_status '
                 'connect=$upstream_connect_time header=$upstream_header_time '
                 'response=$upstream_response_time';
```

Multiple comma- or colon-separated upstream values can indicate retries or multiple attempts. Preserve them rather than parsing only the last value.

## Test One Phase at a Time

Use controlled fault tests:

- blackhole an address;
- accept TCP but do not complete TLS;
- delay request reads or response headers;
- send headers, then pause the body;
- stream heartbeats to distinguish inactivity from total duration;
- reuse a connection after an idle period;
- expire an outer deadline during downstream work.

Run these tests against the exact client and proxy versions used in production. Confirm both elapsed time and emitted error type.

The winning timer is the first applicable limit to expire. If five layers all use 60 seconds, scheduling and network jitter decide which message survives. Name, instrument, and stagger timers so the error identifies a boundary rather than merely reporting that one minute passed.

## Official Documentation

- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Python Requests advanced timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [AWS Application Load Balancer attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html)
