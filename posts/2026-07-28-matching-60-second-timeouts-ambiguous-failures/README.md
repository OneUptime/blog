# Why Matching 60-Second Timeouts at Every Layer Causes Ambiguous Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, Timeout, Reverse Proxy, Load Balancer, Distributed System

Description: Replace identical per-layer timeout values with a propagated end-to-end deadline, smaller child budgets, and deliberate response reserves that expose the failing boundary.

---

Setting every timeout to 60 seconds looks consistent. It actually creates a race.

A request might cross:

```text
client -> CDN -> cloud load balancer -> ingress -> reverse proxy
       -> application -> downstream service -> database
```

Each component starts its timer at a different instant and may measure a different condition. At around one minute, the client can abandon the response, the load balancer can close an idle connection, NGINX can stop waiting between upstream reads, the application can cancel its handler, and a database driver can terminate a command. Scheduling jitter decides which event is logged first.

The result is a different error from run to run and no time left for an inner layer to report the real cause.

## “60 Seconds” Does Not Mean the Same Thing

Consider four documented controls:

- curl `--max-time 60` limits the entire transfer;
- an AWS Application Load Balancer idle timeout closes an existing connection after no data is sent or received for that period;
- NGINX `proxy_read_timeout 60s` limits the gap between successive reads from its upstream, not the complete response duration;
- a gRPC deadline expresses the point after which the caller is no longer willing to wait.

Matching their numeric values does not align their semantics.

Even two total timers race because they start at different points. The user-side client begins before DNS and connection setup. An ingress timer begins only when the request reaches that layer, which may be before or after the full request body has arrived. A database command begins after application queueing and validation. All can be configured for 60 seconds while their absolute expiry times differ by hundreds of milliseconds or more.

## How the Race Hides the Cause

Imagine an application waiting on an exhausted database connection pool:

```text
00.000  client starts a 60 s total timeout
00.120  load balancer receives the last request byte; client-side 60 s idle interval begins
00.145  ingress sends request upstream; 60 s read-inactivity timer begins
00.180  application starts handler; 60 s handler timeout begins
00.210  application enters database-pool queue
60.000  client cancels and records "request timed out"
60.120  load balancer can close its client-facing connection
60.145  ingress can report upstream timed out
60.180  application handler can cancel
```

The database-pool timeout might have been configured to 60 seconds from 00.210, so it never gets to emit its specific pool-exhaustion error. The visible symptom is whichever outer timer wins. Small latency changes can make another layer win next time.

This ambiguity causes:

- generic client timeouts and gateway 504s;
- application cancellation instead of the pool error;
- late responses hitting broken pipes;
- retries while original work continues;
- conflicting attribution across dashboards.

RFC 9110 defines 504 only as a gateway or proxy not receiving a timely upstream response. It does not say which internal dependency was slow. Equal timers prevent that dependency from answering first.

## Use One End-to-End Deadline

Start with the caller's useful completion time. Represent it as an absolute deadline or continuously decreasing remaining duration, then propagate it.

gRPC's deadline guidance describes this model. When a deadline is propagated, implementations can convert it to a remaining timeout with already elapsed time deducted. That avoids granting a fresh full budget at every hop.

For HTTP systems without native deadline propagation, carry a controlled deadline or remaining-budget header between trusted services and enforce it in application context. Cap public or untrusted values against the route maximum.

At each hop:

```text
effective deadline =
  min(incoming deadline, current time + local operation maximum)
```

Before starting a child call:

```text
child budget =
  parent remaining - local completion and response reserve
```

If no useful budget remains, fail before doing more work.

## Make Inner Failures Happen Early Enough to Escape

An inner operation needs time to produce a useful error and for that error to travel outward. For a route with a two-second client objective, an illustrative hierarchy could be:

```text
client total deadline                 2,000 ms
application request deadline          1,700 ms
critical downstream child cap         1,350 ms
database pool acquisition cap           150 ms
database statement cap                remaining child time
ingress upstream-response envelope    1,850 ms
load-balancer inactivity limit        > expected route duration
```

These are not recommended universal values. The ordering illustrates intent:

- pool saturation should surface as a specific local error quickly;
- downstream work must fit inside application time remaining;
- the application retains time to map and serialize an error;
- the ingress retains time to forward it;
- infrastructure should not unexpectedly cut off a valid, active operation.

The client owns the outer deadline. Infrastructure values are guardrails, not extra work budgets.

Do not stagger values mechanically as 57, 58, 59, and 60 seconds. Reserves must cover measured serialization, network, scheduling, and response time. A one-second gap may be wasteful for a 100 ms service and inadequate for a large response.

## Separate Stall Detection from Useful Duration

Phase and inactivity timers can be much shorter than the end-to-end deadline:

- connect timeout detects an unreachable endpoint;
- TLS handshake timeout detects negotiation stalls;
- request-write timeout detects a peer not consuming data;
- response-header timeout bounds waiting for the first response;
- body inactivity timeout detects a stalled stream;
- pool acquisition timeout sheds load before a local queue grows.

These limits answer different questions. A ten-minute export might have a ten-minute business deadline, a 500 ms same-zone connect limit, and a 15-second body-inactivity limit. Periodic body data can keep the inactivity timer healthy without resetting the absolute export deadline.

This is why simply increasing all 60-second values to 120 seconds preserves the ambiguity while doubling how long resources can remain occupied.

## Treat Streaming and Long Polling Deliberately

Long-lived responses expose the difference between total and idle timeouts. NGINX documents `proxy_read_timeout` as the interval between upstream reads. A stream can run for hours if bytes arrive frequently enough. AWS describes its load-balancer idle timeout in terms of no data sent or received.

For streaming routes:

- define whether there is an absolute session lifetime;
- define a maximum silent interval;
- make heartbeat traffic meaningful and supported end to end;
- account for protocols whose control frames do not reset a vendor timer;
- separate connection lifetime from per-message processing deadlines.

AWS specifically notes that Application Load Balancers do not use HTTP/2 PING frames to reset the connection idle timeout. A heartbeat assumption must be verified against the actual intermediary.

Use route-specific policy rather than making normal APIs inherit a streaming-friendly hour-long timeout.

## Make Timer Ownership Observable

Every timeout event should identify:

```text
timer_owner=inventory-client
timer_kind=total_deadline
configured_limit_ms=2000
elapsed_ms=2001
remaining_parent_ms=0
phase=response_headers
peer=inventory.prod:443
attempt=1
request_id=...
trace_id=...
```

In NGINX's `http` context, define an upstream timing format:

```nginx
log_format upstream_timing
  '$request_id status=$status request_time=$request_time '
  'upstream=$upstream_addr upstream_status=$upstream_status '
  'upstream_connect=$upstream_connect_time '
  'upstream_header=$upstream_header_time '
  'upstream_response=$upstream_response_time';
```

Select `upstream_timing` in the appropriate `access_log` directive.

At cloud layers, retain gateway and target/origin status. AWS load-balancer logs distinguish them and expose separate processing times; no target status differs from a target returning 504.

Distributed traces should show the propagated absolute deadline and child budget. A child span continuing useful request work after the parent deadline can indicate a cancellation defect. Bounded cleanup can legitimately outlive the deadline; intentionally detached work should be labeled as such.

## Coordinate Retries with the Same Deadline

An equal timeout per retry is another form of budget reset:

```text
attempt 1: 60 s
attempt 2: 60 s
attempt 3: 60 s
```

A nominal “60-second operation” can now occupy the system for three minutes plus backoff. Instead, all attempts share the original deadline. Before retrying, check that enough time remains for backoff and a useful attempt.

Retry at one controlled layer where possible. If client, ingress, application, and SDK each retry, three retries per layer can multiply into many downstream attempts. The Builders' Library warns that retries are selfish load and can amplify overload. Use bounded attempts, exponential backoff with jitter, and a retry budget.

## Roll Out a Timeout Hierarchy Safely

Inventory current timers first:

| Layer | Setting | Starts when | Measures | Error/status |
| --- | --- | --- | --- | --- |
| Client | SDK total | Before request | Wall-clock operation | Client exception |
| CDN | Origin timer | Edge forwards | Vendor-specific | Edge 5xx |
| Load balancer | Idle | Connection inactive | No qualifying bytes | LB status |
| Ingress | Upstream read | Proxy waits | Gap between reads | 504/error log |
| Application | Context deadline | Handler starts | Remaining request | Typed app error |
| Database | Pool/command | Local operation starts | Queue or execution | Driver error |

Consult exact product and version documentation; names are not portable.

Then:

1. establish the end-to-end objective;
2. propagate remaining time;
3. give child operations measured caps and response reserves;
4. make local saturation fail before gateway timers;
5. keep infrastructure inactivity limits appropriate for valid traffic;
6. test delay, blackhole, pool exhaustion, and mid-body stalls;
7. roll out gradually while watching cancellation and retry amplification.

The validation criterion is not that every layer reports the same timeout. It is that the most specific responsible layer normally fails first, its response reaches the caller, and no doomed work keeps consuming capacity after the end-to-end deadline.

## Official Documentation

- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [AWS Application Load Balancer attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [curl command-line manual](https://curl.se/docs/manpage.html)
