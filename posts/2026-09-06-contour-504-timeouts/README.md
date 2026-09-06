# Fix Contour 504s by Aligning Route Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, 504 Gateway Timeout, Gateway Timeout, Timeout, Retry Policy, Envoy, Troubleshooting

Description: Diagnose Contour 504 responses and align response, stream idle, connection idle, and per-try retry limits.

---

An Envoy-generated 504 commonly means Envoy had a route and an upstream, but the upstream response did not finish within the route or per-try deadline. An idle timeout has different results: before upstream response headers it can produce 408, while after headers it resets the stream. Raising one number may simply expose the next shorter timeout in the chain.

For a long request, map every relevant limit:

```text
client -> CDN or load balancer -> Envoy -> application -> dependency
```

The smallest applicable deadline wins. Contour's HTTPProxy exposes route response and stream-idle timeouts. It also exposes an upstream idle-connection setting, but that controls reuse between requests and does not extend an active request. A retry policy adds a per-try deadline and can multiply backend work.

## Prove Which Hop Returned the 504

Capture response headers and timing from a controlled request:

```bash
curl -sv --connect-timeout 5 --max-time 180 \
  -o /dev/null \
  -w 'code=%{http_code} starttransfer=%{time_starttransfer} total=%{time_total}\n' \
  https://reports.example.com/api/reports/monthly
```

Find the same request in Envoy's access log. Include `%RESPONSE_FLAGS%`, `%RESPONSE_CODE_DETAILS%`, `%DURATION%`, `%UPSTREAM_HOST%`, and upstream service time in a structured production format. Envoy's `UT` flag indicates an upstream request timeout.

Compare the failure duration with configured values. A response arriving at almost exactly 15 seconds is a strong clue because Contour documents a 15-second default route response timeout. A failure at a CDN's documented limit may never reach Envoy as a completed response.

Also check the application log. If the backend completed after Envoy returned 504, increasing the correct route deadline may help. If the backend never received the request, investigate routing or connection failure instead.

## Understand the Three HTTPProxy Timeouts

Contour 1.33 provides these route fields:

- `response`: time from completion of the client request until the complete upstream response has been processed. The documented default is 15 seconds.
- `idle`: maximum period without request or response activity within one HTTP/1.1 request or HTTP/2 stream. With no per-route value, Envoy's connection-manager stream idle default still applies.
- `idleConnection`: how long an upstream keepalive connection may sit with no active request. The documented default is one hour. This is connection reuse, not a request deadline.

`0s` means use default behavior; it does not disable a timeout. `infinity` disables the particular timeout, but bounded values are safer for most production routes.

## Configure the Long Route, Not the Whole Host

Give a report endpoint a measured budget while leaving ordinary requests on tighter defaults:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: reports
  namespace: reports
spec:
  virtualhost:
    fqdn: reports.example.com
    tls:
      secretName: reports-example-com-tls
  routes:
  - conditions:
    - prefix: /api/reports/
    timeoutPolicy:
      response: 2m
      idle: 45s
      idleConnection: 10m
    services:
    - name: reports-api
      port: 8080
  - conditions:
    - prefix: /
    services:
    - name: reports-ui
      port: 80
```

Choose `response` from a documented service-level objective plus margin, not from the longest failure seen. Choose `idle` from the application's maximum legitimate silent interval. Streaming services should produce request or response stream activity and still have a bounded overall lifecycle. TCP keepalives and HTTP/2 connection-level PING frames do not substitute for activity on the request stream.

Ensure the client's timeout is longer than Envoy's budget if you want Envoy to produce the authoritative error, and ensure an external load balancer will allow at least that much time. A proxy cannot extend a hard limit imposed before traffic reaches it.

## Budget Retries Inside the Response Deadline

Retries are useful only when the request is safe to repeat and another attempt can finish within the total response budget. For a read-only status endpoint, a narrow policy might be:

```yaml
  - conditions:
    - prefix: /api/report-status/
    timeoutPolicy:
      response: 10s
      idle: 5s
    retryPolicy:
      count: 2
      perTryTimeout: 3s
      retryOn:
      - connect-failure
      - reset-before-request
      - gateway-error
    services:
    - name: reports-api
      port: 8080
```

This allows the initial attempt and at most two retries, but the overall response timeout still bounds the operation. Envoy applies `perTryTimeout` to the initial attempt and retries, and stops applying that timeout once a response starts being sent downstream, normally after upstream response headers arrive. Leave time for connection setup and the final response.

Do not attach that policy to a long-running report creation POST unless the operation is idempotent through a tested idempotency key. A timed-out attempt may keep running after Envoy retries, creating duplicate jobs and extra load. For long work, prefer an asynchronous API that returns a job ID and exposes a separate status resource.

Retrying every 5xx can amplify an outage. Limit the conditions, count, and retry budget, then monitor retry volume.

## Distinguish Timeout Types from 503 Failures

A route problem can look similar from the client. Use access-log evidence:

| Flag or symptom | Interpretation |
| --- | --- |
| `UT`, often 504 | Upstream request exceeded its deadline |
| `UF`, usually 503 | Envoy failed to establish the upstream connection |
| `UH`, usually 503 | No healthy upstream endpoint was available |
| `NR`, usually 404 | No configured route matched |
| App returns its own 504 | Dependency deadline inside the application, not necessarily Envoy's route timer |

Check Service and EndpointSlice state for `UH`, and network, port, protocol, and TLS for `UF`. Raising `response` cannot repair either condition.

## Verify Under Realistic Load

After applying the route, verify its `Valid` condition and repeat a representative request:

```bash
kubectl -n reports apply --server-side --dry-run=server -f reports.yaml
kubectl -n reports apply -f reports.yaml
kubectl -n reports wait httpproxy/reports \
  --for=condition=Valid --timeout=60s
```

Load-test in a non-production environment with realistic concurrency. Longer timeouts keep sockets, HTTP/2 streams, memory, and backend work alive longer. Watch active requests, pending requests, upstream timeouts, connection pool saturation, application queues, and dependency latency.

Use a deadline propagated through the application so cancellation can stop work when the client or Envoy has gone away. A successful response at 119 seconds is still a poor design if the service objective is 10 seconds.

## Conclusion

Treat a Contour 504 as a deadline investigation. Identify the hop and Envoy response flag, distinguish response time from idle time and connection reuse, then set a narrow route budget based on expected behavior. Fit only safe retries inside that budget, and prefer asynchronous jobs when the work cannot reliably complete during one HTTP request.

## Official Documentation

- [Contour 1.33 response timeouts and retry policy](https://projectcontour.io/docs/1.33/config/request-routing/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 access logging](https://projectcontour.io/docs/1.33/config/access-logging/)
- [Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/)
- [Envoy response flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter#response-flags)
- [Envoy router timeout configuration](https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts)
