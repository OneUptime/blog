# Debug Envoy 503s with Healthy Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, 503, Endpoint Health, Outlier Detection, Circuit Breaking, Health Checking, Troubleshooting

Description: Explain why a configured Envoy endpoint can still return 503 by inspecting health flags, passive ejection, panic behavior, and circuit-breaker limits.

---

Seeing an address in Envoy's endpoint discovery output proves that the proxy knows the backend exists. It does not prove that the endpoint is currently eligible for a request, nor that the cluster has capacity to accept another connection or stream. Envoy keeps membership, health, outlier-ejection, load-balancer, and circuit-breaker state separately. A cluster can therefore contain the correct IP and port while Envoy legitimately returns a local 503.

The fastest investigation starts at the caller-side Envoy that produced the response. Preserve one failed access-log record, identify its exact cluster, and then compare membership with runtime health and overflow counters. Do not begin by deleting Pods or raising limits: both actions erase the evidence that distinguishes an unhealthy upstream from an overloaded proxy.

## First decide whether Envoy or the application returned 503

An HTTP status alone is ambiguous. Capture Envoy's response flag, response-code detail, upstream cluster, and upstream host. A typical sidecar log query is:

```bash
NS=payments
CALLER_POD=checkout-7c9db5f9b8-k2m4x

kubectl logs -n "$NS" "$CALLER_POD" -c istio-proxy \
  --since=10m --tail=500
```

The mesh access-log format is configurable, so field positions differ. If the current format omits `%RESPONSE_FLAGS%`, `%RESPONSE_CODE_DETAILS%`, `%UPSTREAM_CLUSTER%`, or `%UPSTREAM_HOST%`, add structured fields through the mesh's normal telemetry configuration rather than changing a production proxy ad hoc.

Three flags narrow this incident substantially:

- `UH` means no healthy upstream was selectable. Membership may still be non-empty.
- `UO` means upstream overflow: a circuit-breaker threshold rejected work.
- `UF` means Envoy selected an endpoint but failed to establish the upstream connection.

A plain application-generated 503 often has no Envoy response flag and names an upstream host. Treat that as an application investigation unless retries, health policies, or another proxy hop changed the result. Response-code-detail strings are useful evidence but are not a stable API; do not build permanent automation around their exact spelling.

Also confirm which Envoy logged the failure. A gateway, waypoint, caller sidecar, and destination sidecar can each emit a 503 for a different reason. The endpoint state that matters is the state in the proxy that made the failed upstream selection.

## Resolve the exact cluster before reading endpoints

Istio cluster names encode direction, port, subset, and host. Do not inspect every endpoint named after the service and assume it is the one used by the route.

```bash
istioctl proxy-config routes "$CALLER_POD" -n "$NS" --name 9080 -o json

istioctl proxy-config clusters "$CALLER_POD" -n "$NS" \
  --fqdn ledger.payments.svc.cluster.local --port 9080
```

The selected route might target a subset such as `v2` or a different service port. Failover priorities are selected by the cluster's load balancer, not encoded as separate destination cluster names. Copy the exact cluster name from the access log or configuration output, for example:

```text
outbound|9080|v2|ledger.payments.svc.cluster.local
```

Now query that cluster only:

```bash
CLUSTER='outbound|9080|v2|ledger.payments.svc.cluster.local'

istioctl proxy-config endpoints "$CALLER_POD" -n "$NS" \
  --cluster "$CLUSTER" -o json
```

Record the endpoint address, locality, weight, and reported status. Compare it with Kubernetes discovery, but remember that Kubernetes and Envoy are different snapshots:

```bash
kubectl get service ledger -n "$NS" -o wide
kubectl get endpointslice -n "$NS" \
  -l kubernetes.io/service-name=ledger -o wide

kubectl get pods -n "$NS" -l app=ledger \
  -o custom-columns='NAME:.metadata.name,IP:.status.podIP,READY:.status.containerStatuses[*].ready'
```

An EndpointSlice can be correct while a particular proxy has older EDS state. Conversely, Envoy can retain a known address but mark it unhealthy or ejected. If configuration is stale, compare `istioctl proxy-status` and the control-plane revision before changing health policy.

## Read host health, not just membership

Envoy's cluster admin output exposes per-host health flags and outlier information. Through an Istio proxy, use `pilot-agent` so you do not need to expose the admin port:

```bash
kubectl exec -n "$NS" "$CALLER_POD" -c istio-proxy -- \
  pilot-agent request GET clusters > /tmp/caller-envoy-clusters.txt

grep -F "$CLUSTER" /tmp/caller-envoy-clusters.txt
```

The redirection above creates a file on the operator's workstation, not in the Pod. Keep the file only as long as the incident record requires. Look at the lines for the exact endpoint rather than grepping merely for `healthy`. Depending on the generated Envoy version and output format, health flags can indicate failed EDS health, failed active health checking, failed outlier checking, draining, or degraded state.

Those states come from different authorities:

1. **Discovery health.** Istiod normally derives sidecar endpoint eligibility from Kubernetes workload and endpoint information. A terminating or not-ready Pod can remain visible during transitions without being eligible for ordinary traffic.
2. **Active health checking.** Some Envoy clusters and gateway designs actively probe upstreams. A failed HTTP, TCP, or gRPC check can mark a known host unhealthy. Standard Istio service clusters do not automatically gain an arbitrary application health check merely because Kubernetes has a readiness probe.
3. **Passive health checking.** Envoy outlier detection watches real request failures. It can eject an endpoint locally even while Kubernetes calls the Pod ready.

This explains a common clue: one caller fails while another succeeds. Passive observations and ejection state live in each caller proxy. The two proxies can have identical EDS membership but different histories.

## Audit outlier detection as a local state machine

Find every `DestinationRule` that can apply to the cluster, including rules in the service namespace and exported rules visible to the client:

```bash
kubectl get destinationrule -A -o yaml

istioctl proxy-config clusters "$CALLER_POD" -n "$NS" \
  --fqdn ledger.payments.svc.cluster.local -o json
```

Inspect the DestinationRule's `outlierDetection` values such as `consecutive5xxErrors`, `consecutiveGatewayErrors`, `consecutiveLocalOriginFailures`, `interval`, `baseEjectionTime`, and `maxEjectionPercent`. The generated Envoy JSON uses different names for some fields: `consecutive5xx`, `consecutiveGatewayFailure`, and `consecutiveLocalOriginFailure`. If `splitExternalLocalOriginErrors` is enabled, connection failures are evaluated separately from upstream HTTP responses. That distinction matters when a healthy application intentionally returns some 5xx responses but the real incident is connection failure.

Outlier detection is passive health checking, not a global verdict on the Pod. When a threshold is reached, Envoy ejects the host for a bounded interval. Repeated ejections can lengthen the effective duration. The maximum ejection percentage can prevent another unhealthy host from being ejected, so a detector counter increment does not always imply that ejection was enforced.

Avoid two misleading tests:

- Restarting the caller clears its local history and may make the symptom disappear without fixing the backend.
- Sending a single successful request does not necessarily clear a passive ejection immediately. If active health checking is also configured, its interaction with unejection depends on the cluster settings.

Check cluster counters before and during a controlled reproduction:

```bash
kubectl exec -n "$NS" "$CALLER_POD" -c istio-proxy -- \
  pilot-agent request GET stats | \
  grep -E 'outlier_detection|membership_(healthy|total)|upstream_cx_connect_fail'
```

Cluster statistics include the cluster stat name; `membership_healthy` and `membership_total` are gauges, not counters. Istio's `proxyStatsMatcher` can omit statistics, so missing output does not mean zero failures. Compare deltas over the same short test window; a large lifetime counter does not prove the current request caused it.

## Understand panic mode before calling the result contradictory

Envoy normally chooses healthy or degraded hosts. When availability drops below a configured panic threshold, the load balancer can disregard health state and send traffic across all hosts to reduce cascading overload. The default Envoy panic threshold is 50 percent, although Istio-generated configuration and runtime overrides determine the behavior you actually have.

This produces two apparently opposite symptoms:

- A host is marked unhealthy or ejected, yet packet captures show it still receives requests because the cluster entered panic mode.
- A cluster has endpoints, but Envoy returns `UH` because panic routing is configured to fail closed or the applicable priority has no selectable host.

Read the generated cluster and runtime state rather than assuming a default. Disabling panic mode or setting aggressive ejection merely to make a dashboard look consistent can convert partial success into a total outage.

## Treat `UO` as capacity evidence

If the access log says `UO`, endpoint health is usually a distraction. Envoy enforces circuit breakers for connections, pending requests, active requests, retries, and connection pools. In Istio, the relevant `DestinationRule` commonly contains settings like:

```yaml
trafficPolicy:
  connectionPool:
    tcp:
      maxConnections: 100
    http:
      http1MaxPendingRequests: 50
      http2MaxRequests: 500
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 10s
    baseEjectionTime: 30s
```

This is an illustration, not a universal recommendation. A low pending-request limit can shed load exactly as designed. Increasing it may move the queue into Envoy or the application, raising latency and memory use while leaving capacity unchanged.

Inspect overflow counters and active gauges on the caller; `remaining_*` gauges require Envoy's circuit-breaker `track_remaining` setting:

```bash
kubectl exec -n "$NS" "$CALLER_POD" -c istio-proxy -- \
  pilot-agent request GET stats | \
  grep -E 'upstream_(cx|rq).*(active|overflow|pending)|remaining_(cx|rq)'
```

Correlate the delta with request concurrency, protocol, retry policy, and backend latency. Connection, pending-request, and active-request limits are different budgets. Despite their names, Istio's `http1MaxPendingRequests` and `http2MaxRequests` apply to both HTTP/1.1 and HTTP/2. Retries consume additional budget and can amplify an already saturated service. Check the generated cluster because a subset-level policy can override the top-level policy you were reading.

## Make the smallest evidence-backed correction

Choose the fix that matches the state you observed:

- If discovery marked the endpoint unhealthy, fix readiness, termination handling, port mapping, or stale control-plane state.
- If active checks fail, validate the check's protocol, path, expected status, timeout, and whether it tests the same path as real traffic.
- If passive ejection is correct, fix the endpoint's failures. If policy is overly sensitive, tune it gradually and preserve enough healthy capacity.
- If `UO` rises, reduce offered concurrency, add verified backend capacity, correct retry amplification, or tune a proven-too-small breaker.
- If `UF` rises, investigate connection refusal, TLS mismatch, resets, routing, and NetworkPolicy rather than health percentages.

Roll out policy changes narrowly. Re-run one bounded request from the original caller and confirm all three layers: the access-log flag clears, the endpoint is eligible, and the relevant counter no longer rises. Then test at realistic concurrency; a single curl cannot validate a circuit-breaker repair.

## Conclusion

An endpoint entry answers only “does Envoy know this address?” A successful request also requires that the host be selectable, the load balancer choose it, and circuit breakers admit the work. Starting with the response flag keeps those cases separate: `UH` directs you to eligibility, `UO` to capacity limits, and `UF` to connection establishment. Preserve runtime state, inspect the exact caller and cluster, and tune policy only after the counters explain the 503.

## Official Documentation

- [Istio: DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Circuit breaking task](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Envoy: Response flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html#config-access-log-format-response-flags)
- [Envoy: Outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)
- [Envoy: Health checking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking)
- [Envoy: Panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold)
- [Envoy: Circuit breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking)
- [Envoy: Administration interface](https://www.envoyproxy.io/docs/envoy/latest/operations/admin)
