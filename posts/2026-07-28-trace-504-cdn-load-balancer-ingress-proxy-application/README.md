# How to Trace a 504 Across CDN, Load Balancer, Ingress, Reverse Proxy, and Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 504 Gateway Timeout, Distributed Tracing, CDN, Load Balancer, Kubernetes

Description: Attribute a 504 by following one request ID through edge, target, upstream, and application records while preserving each product's local status and timing semantics.

---

In a multi-proxy path, the same 504 can appear in every access log even though only one component generated it.

```text
client -> CDN -> load balancer -> ingress -> reverse proxy -> application
```

RFC 9110 defines 504 as a gateway or proxy not receiving a timely upstream response. A downstream component can also return 504 and every outer layer can pass that response unchanged. Therefore, “the CDN log says 504” does not prove the CDN's own origin timer expired.

Trace one failing request hop by hop. At each boundary, distinguish:

- status sent to the downstream client;
- status received from the upstream target, if any;
- connection, header, response, and total timings;
- the selected upstream address;
- whether a retry selected another upstream.

## Create an Incident Key

Capture from the client:

```text
UTC timestamp with millisecond precision
timezone
method and full route
safe request-body fingerprint or size
response status, headers, and body
client remote IP if relevant
trace/request/vendor IDs
client phase timings
```

Do not log secrets, authorization headers, or sensitive bodies. Use a stable request ID and a safe payload hash or size where needed.

Vendor identifiers help at their own boundary. Cloudflare adds a `cf-ray` value to requests sent toward the origin and documents Ray ID lookup in its logs. AWS Application Load Balancer adds or updates `X-Amzn-Trace-Id` and records it in access logs. These IDs are not automatically one universal trace.

For service-to-service correlation, propagate W3C `traceparent` through components that support it and include trace ID in structured logs. Preserve vendor IDs as span or log attributes.

## Build a Hop Ledger

For one request, fill this table from the outside inward:

| Hop | Downstream status | Upstream/target status | Selected target | Connect/header/response time | Local error |
| --- | --- | --- | --- | --- | --- |
| CDN | 504 | ? | origin address | product-specific | ? |
| Load balancer | ? | ? | target IP:port | product-specific | ? |
| Ingress | ? | ? | Service/Pod | connect/header/response | ? |
| Reverse proxy | ? | ? | app address | connect/header/response | ? |
| Application | ? | child status | dependency | queue/child/total | ? |

Leave unknown values unknown. A dash, zero, or missing value has product-specific meaning; consult the exact field documentation before interpreting it.

Work inward until the request disappears or a layer records a locally generated timeout. Then verify the network boundary immediately after the last positive record.

## Distinguish Edge Status from Origin Status

CDN products expose different fields and codes. For Cloudflare, compare edge response status with origin response status and cache/request source. Cloudflare's documentation warns that an origin status of zero does not alone prove a failed origin request; some cache paths do not contact the origin.

Use:

- Ray ID and timestamp;
- edge status versus origin status;
- cache status;
- origin IP and response timing;
- data center/colo;
- Worker or edge-function subrequest records.

Cloudflare Workers subrequests can have their own Ray IDs and `ParentRayID`. Follow the immediate-parent relationship for chained Workers rather than expecting every subrequest to reuse the browser's ID.

If the CDN reports an origin connection/timeout but the load balancer has no matching entry, investigate the CDN-to-load-balancer boundary: DNS answer, selected IP, TLS/SNI, firewall allowlists, routing, and whether the load balancer logs pre-HTTP failures. Do not jump to application tuning.

## Compare Load-Balancer and Target Fields

AWS Application Load Balancer access logs illustrate the fields needed:

- `elb_status_code`: what the load balancer sent;
- `target_status_code`: what the target returned, recorded only after a target connection and response;
- target address;
- request, target, and response processing times;
- trace ID;
- error-reason fields where applicable.

An ELB 504 with no target status differs from a target returning 504 that the load balancer forwards. AWS documents load-balancer 504 causes including inability to establish a target connection within the applicable timeout and a connected target not responding before idle timeout.

Access-log delivery can be delayed and is documented as best effort. Search a bounded time window across all load-balancer nodes and account for clock and delivery behavior. No line is evidence only after logging coverage is verified.

Other cloud load balancers use different timeout meanings. Google Cloud, for example, documents HTTP(S) backend service timeouts as request/response timeouts, while proxy network load balancers use an inactivity meaning. Do not transfer AWS field semantics to another provider.

## Inspect Kubernetes Ingress Upstream Data

The ingress-nginx default upstream log format includes:

```text
$status
$request_time
$proxy_upstream_name
$upstream_addr
$upstream_response_time
$upstream_status
$req_id
```

It can identify the Kubernetes upstream and endpoint address selected. Add NGINX's upstream connect and header times if your format does not already include them.

Interpret patterns:

```text
status=504 upstream_status=504
```

This can mean the selected upstream itself returned 504; inspect timing and error logs before deciding who generated it.

```text
status=504 upstream_status=504 or absent
connect=<small> header=-
error="upstream timed out ... while reading response header"
```

This supports an ingress-local upstream read timeout after connecting. Exact rendered values and separators vary with attempts and NGINX version.

Several upstream addresses or statuses can represent retries. Map each endpoint:

```bash
kubectl get endpointslices \
  -n <namespace> \
  -l kubernetes.io/service-name=<service> \
  -o wide
kubectl get pods -n <namespace> -o wide
```

Kubernetes' debugging guide recommends bypassing the Service and testing individual Pod endpoints. Do so from a representative Pod and preserve the original Host, protocol, TLS name, headers, and body; otherwise the bypass is not the same request.

## Follow the Request Through a Reverse Proxy

For a standalone NGINX reverse proxy, record:

```nginx
log_format trace504
  '$time_iso8601 request_id=$request_id traceparent=$http_traceparent '
  'status=$status request_time=$request_time '
  'upstream=$upstream_addr upstream_status=$upstream_status '
  'connect=$upstream_connect_time header=$upstream_header_time '
  'response=$upstream_response_time';

proxy_set_header X-Request-ID $request_id;
proxy_set_header traceparent $http_traceparent;
```

In a real deployment, preserve a validated incoming request ID or generate one according to your trust model. A client-controlled ID can collide or inject unsafe log content if accepted blindly.

NGINX timing variables have local definitions. `$upstream_connect_time` includes an upstream TLS handshake when applicable; `$upstream_header_time` covers receiving headers; `$upstream_response_time` covers upstream response handling. They are not necessarily equivalent to a CDN's similarly named fields.

Pair access data with the error log. “While connecting to upstream,” “while sending request,” “while reading response header,” and body-read failures locate different phases.

## Locate Application and Dependency Time

If the application has a server span for the trace:

```text
app queue -> handler -> database pool -> query
                     -> outbound HTTP/gRPC -> serialization
```

Compare its start time with proxy timings. A long gap before the server span can indicate accept/worker queueing or instrumentation that begins too late. Within the span, record pool acquisition independently from query or downstream execution.

If the application returned its own 504, name the local dependency and timer owner in structured logs. An origin application acting as a gateway can legitimately emit 504.

If no application record exists but the proxy connected:

- inspect the exact target instance, not an aggregate;
- check listen and worker queues;
- verify logging occurs at request acceptance, not completion;
- check pod restart and termination;
- verify proxy protocol, TLS, port, and SNI;
- use a packet capture or socket tracing at that boundary.

Sampling can omit traces. Preserve error traces or link unsampled logs with request IDs rather than treating trace absence as proof of request absence.

## Use Controlled Bypasses Without Changing the Request

Test progressively:

1. public hostname through every layer;
2. load-balancer endpoint, retaining expected Host and TLS SNI;
3. ingress endpoint;
4. ClusterIP Service from inside the cluster;
5. individual Pod IP and target port;
6. application loopback only as a final local comparison.

Each bypass changes something—network source, DNS, TLS termination, headers, protocol version, connection reuse, or load-balancing choice. State those differences in the result.

curl `--resolve` can force an address while retaining URL hostname semantics:

```bash
curl -v \
  --resolve api.example.com:443:203.0.113.20 \
  -H 'X-Debug-Request-ID: trace-504-001' \
  https://api.example.com/orders/123
```

Do not send state-changing production requests merely to reproduce a timeout unless the operation and authorization make that safe.

## End with an Evidence-Based Attribution

A useful conclusion reads:

```text
At 10:15:30.442Z, CDN Ray ... forwarded the request and recorded
origin status 504. ALB trace ... recorded target status 504 from
10.2.4.17. ingress request ... generated that 504 after connecting
to Pod 10.42.7.9 in 3 ms and receiving no response headers for 60 s.
The Pod trace shows 59.8 s waiting for the database pool.
```

That statement separates propagation, generator, and root cause. “NGINX returned 504” alone supplies only the middle fact.

## Official Documentation

- [RFC 9110: 504 Gateway Timeout](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [Cloudflare: Error 502 or 504](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-502-504/)
- [Cloudflare Ray ID](https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/)
- [Cloudflare Worker subrequest logs](https://developers.cloudflare.com/logs/faq/worker-subrequests/)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [AWS Application Load Balancer request tracing](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-request-tracing.html)
- [AWS: Troubleshoot Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html)
- [Google Cloud backend service timeouts](https://cloud.google.com/load-balancing/docs/backend-service)
- [ingress-nginx log format](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/log-format/)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
