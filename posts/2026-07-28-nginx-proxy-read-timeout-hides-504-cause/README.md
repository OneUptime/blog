# Why Increasing NGINX `proxy_read_timeout` Can Hide the Real 504 Cause

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, 504 Gateway Timeout, Reverse Proxy, Performance Debugging, Timeout

Description: Diagnose the upstream phase and saturation source behind an NGINX timeout before extending the inactivity window and increasing in-flight work.

---

Increasing `proxy_read_timeout` can make a 504 disappear while making the underlying system less reliable.

NGINX documents `proxy_read_timeout` as the maximum interval **between two successive read operations** from a proxied server. It is not a total-response deadline. If the upstream sends nothing during that interval, NGINX closes the upstream connection.

The default is 60 seconds. That familiar value often becomes the target of an emergency change:

```nginx
location /api/ {
    proxy_pass http://application;
    proxy_read_timeout 180s;
}
```

This may be appropriate for a genuinely long first byte or a stream with a documented silent interval. It is not a diagnosis. The extra 120 seconds can merely allow requests to wait longer in an application queue, database pool, downstream call, deadlock, or CPU backlog.

## Understand What Timed Out

For a proxied HTTP request, NGINX has several relevant controls:

- `proxy_connect_timeout`: establishing the upstream connection;
- `proxy_send_timeout`: inactivity between writes of the request to the upstream;
- `proxy_read_timeout`: inactivity between reads from the upstream;
- `proxy_next_upstream_timeout`: cumulative time window in which NGINX may pass the request to eligible alternative upstreams; it does not abort an attempt already in progress.

Do not call all of them “the NGINX timeout.” Their failure locations differ.

`proxy_read_timeout` can apply while NGINX is waiting for the upstream's response headers or for more body data. The client-visible behavior depends on whether NGINX has already sent response headers:

- before response headers, NGINX can generally return a gateway error such as 504;
- after a response has begun, NGINX cannot replace it with a clean new HTTP 504 and may terminate or truncate the response instead.

RFC 9110 defines 504 as a gateway or proxy not receiving a timely upstream response. It does not identify why the upstream was late.

## Preserve the Evidence Before Changing the Value

Save:

- exact UTC timestamp and request ID;
- request method, route, and payload-size class;
- response headers and body, including which component branded the error;
- NGINX access and error log lines;
- upstream address selected;
- application trace and logs;
- saturation metrics for the same interval.

An NGINX error log can distinguish phases. A message containing:

```text
upstream timed out ... while reading response header from upstream
```

means the upstream connection was established and NGINX was waiting for headers. A message about connecting or sending points elsewhere. Keep the complete line, which includes request and upstream details.

Add timing fields to access logs:

```nginx
log_format upstream_timing
  '$time_iso8601 request_id=$request_id '
  'status=$status request_time=$request_time '
  'upstream_addr=$upstream_addr upstream_status=$upstream_status '
  'upstream_connect=$upstream_connect_time '
  'upstream_header=$upstream_header_time '
  'upstream_response=$upstream_response_time';

access_log /var/log/nginx/access.log upstream_timing;
```

NGINX defines:

- `$upstream_connect_time`: time to establish the upstream connection, including upstream SSL handshake when used;
- `$upstream_header_time`: time until upstream response headers;
- `$upstream_response_time`: time spent receiving the upstream response;
- `$upstream_status`: status associated with the upstream attempt; NGINX can record a generated 502 or 504 for an error or timeout even when the upstream sent no status.

Commas separate servers contacted during request processing. Colons separate upstream server groups when an internal redirect, such as `X-Accel-Redirect` or `error_page`, changes groups. Preserve the sequence.

## Read the Timing Pattern

Use the error log and timing values together:

| Evidence | Interpretation to test |
| --- | --- |
| Connect time absent; error while connecting | Upstream TCP/TLS connection did not complete |
| Connect time small; header time absent; response time near read timeout | Upstream accepted connection but sent no response headers in time |
| Header time present; body later stalls | Mid-response inactivity or streaming problem |
| Several upstream addresses/statuses | Retry, failover, or an internal redirect involved multiple upstream attempts or groups |
| Application has matching request with long queue/pool wait | Delay is inside or below application |
| No application request record, but connect succeeded | Check accept/worker queue, proxy-to-app protocol, wrong instance, and logging boundary |

The absence of an application log does not prove NGINX never reached the host. Framework access logs may be written only after a worker accepts or completes a request. A connection can sit in a kernel accept queue or application-server worker queue before handler logging begins.

Also confirm that the 504 was generated by this NGINX instance. A CDN, load balancer, ingress controller, service mesh, another NGINX, or the application can return the same status. Compare `Server` and diagnostic headers cautiously—custom error pages can rewrite them—and use per-layer access logs.

## Find Where the Upstream Spent the Minute

If NGINX connected quickly but received no headers, correlate the request ID with:

### Application admission and workers

Inspect:

- active versus maximum workers or event-loop lag;
- request queue depth and queue duration;
- accepted connections and listen-queue overflow;
- file-descriptor and connection limits;
- CPU throttling, garbage collection, and memory pressure;
- per-instance imbalance.

An application can pass health checks while all request workers are occupied. Health endpoints often bypass the slow dependency or use a separate worker.

### Connection pools

Measure acquisition separately from execution for:

- database pools;
- outbound HTTP pools;
- thread and executor pools;
- rate-limit or concurrency semaphores.

If a handler waits 55 seconds for a database connection and the query takes 100 ms, increasing NGINX to 180 seconds treats the wrong component. Bound pool acquisition, keep the queue small, and fix capacity or leaked resources.

### Downstream dependencies

Propagate a trace and deadline to every outbound call. Look for:

- a child timeout equal to or longer than NGINX's timer;
- retries resetting a full timeout;
- DNS or connection delays;
- a downstream gateway returning late;
- work continuing after the original request has expired.

The application should normally expire its own useful deadline early enough to return a specific response before NGINX's upstream envelope closes.

### Workload shape

Break failures down by:

- route and method;
- payload size;
- tenant or shard without using unbounded metric labels;
- cache hit/miss;
- pod, host, zone, and upstream address;
- deployment version;
- concurrency at failure time.

One expensive route or hot shard can create a tail hidden by aggregate averages.

## Why a Larger Timeout Can Worsen Load

Little's Law gives the intuition:

```text
in-flight work ≈ arrival rate × time in system
```

At 200 requests per second, if affected requests each remain for an extra 120 seconds, the in-flight count can grow by roughly 24,000 requests before considering retries or per-request downstream resources. This estimate assumes a sustained arrival rate over that interval; use measured throughput and duration for the real incident.

Longer waiting can consume:

- NGINX client and upstream connections;
- application sockets and workers;
- memory for request and response buffers;
- database-pool slots;
- client-side pool capacity;
- load-balancer connections.

As pools fill, formerly healthy requests queue behind doomed ones. Tail latency rises, clients retry, and the service can enter a cascading failure. Google SRE guidance recommends small queues and early load shedding rather than allowing overload queues to grow without bound.

## When Increasing `proxy_read_timeout` Is Correct

Raise it when the operation has a valid, measured silent interval longer than the current setting and the whole path is designed for it. Examples include:

- a synchronous report with a documented response objective;
- server-sent events whose maximum heartbeat gap exceeds the current value;
- a controlled large operation that cannot yet be made asynchronous;
- a false-timeout rate demonstrated by healthy latency measurements.

Before rollout, verify:

1. the client, CDN, load balancer, and application deadlines allow the operation;
2. capacity supports the additional in-flight duration;
3. cancellation reaches downstream work;
4. retries do not amplify it;
5. streaming heartbeat behavior actually resets each intermediary's relevant idle timer;
6. route-specific configuration avoids weakening fast APIs.

Keep an end-to-end deadline even when an inactivity timer is long.

## Fix Patterns That Expose the Cause

Depending on evidence:

- set a short, explicit application worker-queue or pool-acquisition limit;
- propagate a decreasing deadline to dependencies;
- return 503 or 429 early when concurrency is exhausted;
- add workers or instances only after identifying the saturated resource;
- remove leaked connections and unbounded retries;
- optimize the slow query or hot partition;
- move long work to a job and return `202 Accepted` with status polling;
- paginate or stream results with a documented heartbeat;
- ensure application cancellation stops database and downstream work.

For eligible idempotent requests, NGINX can try another upstream according to `proxy_next_upstream`, but retry behavior requires care. Current NGINX documentation does not retry non-idempotent requests after they have been sent upstream unless explicitly enabled. Retrying a timeout can duplicate work and increase load; set a bounded `proxy_next_upstream_timeout` and tries count.

## Validate the Change

Reproduce the actual failure class under peak concurrency. Verify:

- specific inner errors reach NGINX before its read timer;
- NGINX timing fields identify the expected phase;
- timeout and cancellation counts match across layers;
- in-flight requests and queue durations remain bounded;
- partial responses fail in a detectable way;
- no child span continues unexpectedly after parent expiry.

A timeout increase is successful only if it supports an intentional latency contract with sufficient capacity. If it merely moves a 504 from 60 to 180 seconds, it has hidden the diagnostic signal and tripled the waiting window.

## Official Documentation

- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [NGINX logging module](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
