# How to Debug Intermittent Socket Timeouts When Application Logs Show No Request

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Socket, Network Troubleshooting, TCP, Application Logging, Kubernetes

Description: Locate intermittent pre-handler failures by combining client phase telemetry, per-hop access records, endpoint identity, packet evidence, and verified logging coverage.

---

No application log does not prove that no packet reached the host.

A request can fail before HTTP exists, wait in a kernel or worker queue before framework logging starts, reach a different instance than the one inspected, or disappear from a sampled or buffered log pipeline. “Socket timeout” is similarly broad: it might describe connection establishment, an inactive read, a write stall, pool waiting wrapped by an outer deadline, or a reused connection.

Debug the last boundary that has positive evidence rather than treating the application log as the first network sensor.

## Preserve the Exact Client Failure

For every failing attempt, capture:

```text
UTC timestamp with milliseconds
monotonic elapsed duration
exception type, code, and complete cause chain
hostname, port, and selected remote IP
source host/container/pod and network namespace
whether a proxy was used
whether the connection was new or reused
bytes sent and received
request/trace ID
attempt number
```

Do not collapse `ECONNREFUSED`, `ETIMEDOUT`, TLS timeout, and read timeout into one metric label. On Linux, `connect(2)` distinguishes `ECONNREFUSED`, where no listener was found or the connection was rejected, from `ETIMEDOUT`, where the connection attempt expired. A library can wrap either in a generic timeout.

Record the timeout owner and documented semantics. Python Requests' read timeout is time between server bytes, while curl's connection timeout includes DNS plus TCP and TLS or QUIC. “Timed out after five seconds” is not enough to compare two clients.

## Instrument the Client Phases

For an HTTPS probe from the same execution environment:

```bash
curl -sS -o /dev/null -v \
  --connect-timeout 3 \
  --max-time 15 \
  -w 'remote=%{remote_ip} dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} first_byte=%{time_starttransfer} total=%{time_total}\n' \
  https://api.example.com/health
```

Run it inside the failing pod, VM, or process namespace. A successful probe from an engineer's laptop validates a different DNS resolver, route, firewall policy, proxy, source IP, and often a different edge location.

Add equivalent phase hooks to the real code. Go's `net/http/httptrace`, for example, provides callbacks around DNS, connect, TLS, connection acquisition, request write, and first response byte. Use the native instrumentation for the deployed client rather than assuming curl phase boundaries match it.

If the failure is intermittent, record every selected IP. One bad AAAA address, zone, load-balancer node, or backend can disappear in aggregate success.

## Verify Name Resolution and Address Family

Capture answers from the failing environment:

```bash
getent ahosts api.example.com
curl -4 -v --connect-timeout 3 https://api.example.com/health
curl -6 -v --connect-timeout 3 https://api.example.com/health
```

Compare:

- A and AAAA answers;
- answer order and TTL;
- the application's resolver and cache behavior;
- IPv4 and IPv6 routes;
- split-horizon DNS;
- search-domain expansion for short names;
- whether a proxy resolves the target remotely.

curl uses a Happy Eyeballs strategy when several IPv4/IPv6 addresses are available, starting additional attempts after a delay. Another runtime may sequence or race addresses differently. An intermittent timeout can therefore be an address-selection problem even when manual curl usually succeeds.

Do not permanently force IPv4 merely because it masks a broken IPv6 path. Use the difference to locate and repair the path or deliberately remove the unusable address.

## Follow the Request Through Infrastructure Logs

Search by request ID and a tight timestamp window:

1. client or egress proxy;
2. CDN or API gateway;
3. load balancer;
4. ingress or service mesh;
5. reverse proxy;
6. selected application instance.

Keep both local and upstream status fields. AWS Application Load Balancer documentation notes that its access logs include requests that never reached a target, such as requests with no healthy target or malformed input. A load-balancer record without a target status is very different from no load-balancer record.

Logging guarantees vary. AWS also documents ALB access logging as best effort, and delivery is eventually consistent. A missing record is meaningful only after confirming:

- the layer logs this type of pre-HTTP or failed request;
- the relevant node/account/region and time window were searched;
- sampling, rate limits, buffering, and delivery are healthy;
- clocks and request-ID propagation are correct.

Use firewall flow logs and network policy logs for boundaries that have no HTTP record.

## Confirm Which Backend Should Have Logged It

Load balancing makes “the application logs” plural. Record the upstream IP/port from ingress or load-balancer logs and map it to an instance.

In Kubernetes:

```bash
kubectl get endpointslices \
  -n <namespace> \
  -l kubernetes.io/service-name=<service> \
  -o wide
kubectl get pods -n <namespace> -o wide
```

Check current and recently terminated pods. The request might have reached:

- a pod that restarted before logs shipped;
- a terminating pod;
- an old rollout version;
- an endpoint in another zone;
- a sidecar that rejected it before the application container;
- a Service `targetPort` different from the expected port.

Kubernetes' Service debugging guide recommends testing individual EndpointSlice addresses from inside the cluster. Preserve Host/SNI, protocol, method, headers, and body when bypassing layers.

## Define Where Application Logging Begins

Many “request logs” are completion logs. They are written only after the framework dispatches a handler or sends a response. A connection can time out before that point.

Document the actual logging boundary:

```text
TCP accepted
TLS completed
HTTP headers parsed
framework middleware entered
route selected
handler entered
response completed
log shipped
```

Add low-cost counters or structured events at the earliest safe HTTP boundary and at completion. Include instance ID, local/remote socket, request ID, trace ID, method, normalized route, and outcome. Avoid sensitive headers and bodies.

If the reverse proxy connected but no early application event exists, inspect:

- TCP listen and accept queues;
- application worker/executor queue;
- file-descriptor exhaustion;
- TLS termination if performed by the app;
- protocol mismatch or malformed/oversized headers;
- process pauses, restarts, and log-pipeline loss.

Linux's `accept(2)` documentation describes how accepted connections are taken from the pending connection queue. A full or slowly drained queue can precede application-level logging.

## Use Packet Evidence at the Suspected Boundary

Capture both sides where policy permits:

```bash
sudo tcpdump -ni any \
  'host 10.42.7.19 and tcp port 8443'
```

Correlate the five-tuple and timestamp. NAT can change source addresses and ports.

| Evidence | Next focus |
| --- | --- |
| Repeated SYN, none at destination | Routing, egress/ingress drop, network policy |
| SYN reaches destination, no SYN-ACK returns | Host firewall, listen state, kernel pressure |
| SYN reaches destination and SYN-ACK leaves, client sees no reply | Return path, asymmetric/stateful filtering |
| TCP establishes, TLS ClientHello gets no response | TLS terminator, post-connect filtering, overload |
| TLS and request bytes reach host, no app event | Accept/worker/parser/logging boundary |
| App sends response, client never receives it | Reverse path, intermediary, midstream close |

Packet absence on `any` at a container host can still be affected by offload, overlay, capture point, and encryption. State exactly where capture occurred.

For encrypted HTTP, packet timing and byte counts still identify transport progress even when payload is not visible. Use TLS key logging only in controlled environments with appropriate secret handling.

## Correlate Intermittence with Capacity and State

Break failures down by:

- selected destination IP and backend;
- source node, NAT gateway, and zone;
- new versus reused connection;
- request body size;
- HTTP version;
- concurrency;
- deployment version;
- time since connection became idle.

Patterns suggest different tests:

- **only reused connections:** stale keepalive lifetime mismatch or intermediary idle closure;
- **only one backend:** listener, worker, pod, or route on that target;
- **only large requests:** upload/write timeout, body limit, flow control, or path-MTU problem;
- **only at load:** accept queue, workers, pool, CPU, conntrack, or port pressure;
- **only one address family:** IPv4/IPv6 routing or policy;
- **regular interval:** DNS refresh, connection lifetime, deployment, or infrastructure rotation.

Do not diagnose ephemeral-port or conntrack exhaustion from reputation alone. Look for socket state, allocation errors, relevant kernel/flow counters, and source-NAT metrics.

## Reproduce with Controlled Variation

Hold everything constant and change one dimension:

```text
same client + forced IP
same IP + IPv4 versus IPv6
same path + new connection versus reused connection
same route + small versus representative body
same request + one backend at a time
same backend + low versus peak concurrency
```

Use a unique safe request ID and repeat enough times to expose the intermittent class. Do not replay non-idempotent writes without a test environment or idempotency protection.

Then test the proposed fix under failure:

- correct DNS or route;
- align connection keepalive lifetimes;
- fix listener/worker capacity and bounded queues;
- repair logging coverage;
- tune a timeout only when measured healthy latency requires it;
- propagate cancellation so expired work stops.

The strongest conclusion names the last observed event and first missing event: “Ingress connected to Pod X and wrote 812 request bytes, but the app had no header-parsed event; Pod X's accept queue overflow counter rose during the interval.” That is actionable evidence. “There was no application log, so the network dropped it” is not.

## Official Documentation

- [Linux `connect(2)` manual page](https://man7.org/linux/man-pages/man2/connect.2.html)
- [Linux `accept(2)` manual page](https://man7.org/linux/man-pages/man2/accept.2.html)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [libcurl Happy Eyeballs timeout](https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html)
- [Python Requests timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [Go `net/http/httptrace` package documentation](https://pkg.go.dev/net/http/httptrace)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
