# Why 504 Gateway Timeouts Appear Under Load: Pools, Queues, and Worker Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 504 Gateway Timeout, Capacity Planning, Connection Pooling, Queue Management, Nginx

Description: Correlate load-dependent 504s with queue time, pool acquisition, worker occupancy, and per-instance capacity to find the first saturated resource.

---

A 504 that appears only under load is usually a threshold symptom. Some finite resource reaches capacity, requests wait behind other work, and a gateway's upstream timer expires before the queue drains.

The 504 identifies the observer, not the constrained resource. RFC 9110 says a gateway or proxy returns 504 when it did not receive a timely response from an upstream it needed. The delay could be in:

- the gateway's upstream connection;
- a kernel listen queue;
- an application worker or executor queue;
- an outbound HTTP or database connection pool;
- a lock, query, or downstream service;
- CPU throttling, memory pressure, or garbage collection;
- retries multiplying the offered load.

Changing the gateway timeout alters when the symptom appears. Find the first queue whose wait time grows with concurrency.

## Confirm Which Layer Generated the 504

Save one failing request's timestamp, timezone, route, method, request ID, trace ID, and response headers/body. Correlate:

- CDN edge and origin status;
- load-balancer status and target status;
- ingress downstream and upstream status;
- reverse-proxy error and access logs;
- application and dependency traces.

For NGINX, log:

```nginx
log_format capacity
  '$request_id status=$status request_time=$request_time '
  'upstream=$upstream_addr upstream_status=$upstream_status '
  'connect=$upstream_connect_time header=$upstream_header_time '
  'response=$upstream_response_time';
```

NGINX defines upstream connect, header, and response timings separately. A small connect time followed by no header before the read limit points past connection establishment. An absent connect time and a connect-phase error point earlier.

Do not assume an upstream 504 was generated locally. A proxy can pass through a 504 returned by another proxy or the application.

## Build a Concurrency Timeline

Plot request rate, concurrency, latency percentiles, timeout rate, and resource occupancy on the same time axis. Averages conceal the transition.

Over a stable observation window, Little's Law provides a useful check using average values:

```text
concurrency ≈ throughput × time in system
```

At 400 requests per second and 100 ms average time, about 40 requests are in the system. If service time or queueing rises to two seconds, concurrency approaches 800 at the same arrival rate. That growth consumes sockets, memory, workers, and pool slots, which can create more queueing.

Record both:

- **queue time**: waiting to begin useful work or acquire a resource;
- **service time**: executing after admission.

If service time stays near 50 ms while queue time rises to 30 seconds, optimizing the handler will not address the admission bottleneck. If service time itself grows with concurrency, inspect contention, CPU, storage, downstream latency, and cache behavior.

## Check the Proxy's Own Limits

For NGINX:

- `worker_processes` determines worker processes;
- `worker_connections` limits simultaneous connections per worker;
- the open-file limit can be lower than the configured connection limit;
- proxied upstream connections count too, not just client connections.

NGINX's core documentation explicitly notes that `worker_connections` includes connections to proxied servers. A proxied request can occupy a client-side and an upstream-side connection, and keepalive connections also consume resources.

Inspect:

```bash
nginx -T
for pid in $(pgrep -x nginx); do
  echo "PID $pid"
  grep 'Max open files' "/proc/$pid/limits"
done
ss -s
```

Correlate accepted/active/waiting connection metrics, file-descriptor use, error logs, and CPU. Do not double `worker_connections` until the process and system file limits, memory, upstream capacity, and load test support it.

If NGINX connects upstream quickly, its worker connection limit is unlikely to explain a later response-header stall by itself. Follow the timing evidence.

## Check TCP Listen and Accept Queues

A server can have a listening socket while its application is too slow to accept connections.

Linux has separate limits involved in connection establishment and the completed connection queue. Kernel documentation describes `net.core.somaxconn` as the upper limit on a socket's `listen()` backlog, with `tcp_max_syn_backlog` relevant to incomplete TCP requests. The application's requested backlog can be lower.

Observe:

```bash
ss -lnt
nstat -az | grep -E 'ListenOverflows|ListenDrops'
```

Validate counter names and availability for the deployed kernel. Rising listen drops or overflows during the failure window is stronger evidence than the configured backlog alone.

Increasing backlog stores more waiting work; it does not create application throughput. A large queue can turn an overload signal into long tail latency. Prefer enough backlog for ordinary bursts plus bounded admission and adequate accept capacity.

## Check Application Workers and Executors

Worker models differ:

- a process/thread worker may handle one request at a time;
- an async worker can hold many I/O-bound requests but still block on synchronous code;
- a runtime may queue requests before framework middleware and access logging;
- a server may have several internal executor pools.

Measure:

```text
active workers / maximum
request queue depth
request queue duration
event-loop lag
CPU run queue and throttling
GC pause duration
per-worker request count and latency
```

A flat active-worker count at its maximum, growing queue duration, and stable per-request service time is classic worker saturation. A worker count far above available CPU can make every request slower through contention.

Health checks can remain green because they use a cheap path, dedicated listener, or reserved worker. Test the real route under bounded load.

## Measure Pool Acquisition Separately

Connection pools are frequent hidden queues. Instrument:

```text
pool size
checked-out/active connections
idle connections
waiter count
acquisition duration
acquisition timeout
connection lifetime
leak count or long-held connection age
```

For a database operation, separate:

```text
pool wait -> network connect/auth if new -> query queue/locks -> execution -> fetch
```

If the pool is full:

- confirm connections are returned on every success, error, and cancellation path;
- find long transactions and lock waits;
- compare pool capacity with database connection and workload limits;
- bound acquisition time so overload fails specifically and early;
- avoid making every application instance open the database maximum.

Increasing a 50-connection pool to 200 can move the queue into the database, increase lock/contention costs, and reduce total throughput. Size pools for downstream capacity and number of instances, not merely current waiter count.

Apply the same analysis to outbound HTTP pools. Go's `http.Transport`, for example, can limit total connections per host; when that limit is reached, dialing waits. Reuse clients and transports, and read response bodies to EOF and close them according to library guidance so connections can be reused.

## Find Imbalance and Hot Targets

Aggregate capacity can look healthy while one backend is saturated. Break proxy logs and metrics down by upstream address, pod, zone, shard, and deployment version.

Check:

```bash
NAMESPACE=your-namespace
SERVICE=your-service

kubectl get pods -n "$NAMESPACE" -o wide
kubectl get endpointslices \
  -n "$NAMESPACE" \
  -l "kubernetes.io/service-name=$SERVICE"
kubectl top pods -n "$NAMESPACE"
```

Look for:

- a hot shard or tenant;
- uneven connection-based load balancing;
- one slow or old-version pod;
- terminating endpoints still receiving traffic;
- readiness changing too slowly or too aggressively;
- new pods becoming ready before caches and pools are warm;
- autoscaling reacting after queues already exceed the timeout.

Kubernetes' Service debugging guide recommends checking EndpointSlices and then contacting individual Pod endpoints. Per-endpoint tests can expose a bad target hidden by the Service average.

## Account for Retry Amplification

If clients time out and retry while original requests still execute, offered load rises exactly when capacity is exhausted. Multiple retrying layers can multiply attempts.

Track:

```text
logical requests
physical attempts
attempt number
reason for retry
original request deadline
work completed after caller cancellation
```

Keep all attempts within one end-to-end deadline. Retry only safe operations and transient failure classes, with bounded attempts, exponential backoff and jitter, and a retry-rate budget.

## Prefer Bounded Queues and Early Shedding

Google's SRE guidance describes how long queues consume memory and increase latency, recommending small queues and early rejection when a server cannot sustain load. A deliberate 503, or a 429 when enforcing a client rate limit, is often more useful when returned quickly than accepting work that becomes a 504 thirty seconds later.

Fixes follow the constrained resource:

- cap concurrency before an overloaded downstream;
- shorten and bound pool acquisition;
- correct connection leaks or blocking event-loop work;
- add capacity where load testing shows near-linear benefit;
- improve per-target balancing or shard distribution;
- reduce work, cache, batch, or move long operations asynchronous;
- make autoscaling use a leading signal such as concurrency or queue depth when appropriate;
- propagate cancellation so expired work releases resources.

Do not apply all changes at once. A controlled load ramp should reveal:

1. throughput while latency remains stable;
2. the first resource to reach a limit;
3. queue-time growth;
4. the point where errors begin;
5. recovery after offered load falls.

The goal is a graceful overload knee: bounded latency and intentional rejection, not a growing queue followed by gateway timeouts. Once the first saturated pool, queue, or worker limit is visible, the 504 becomes a consequence rather than the mystery.

## Official Documentation

- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [NGINX core functionality](https://nginx.org/en/docs/ngx_core_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
