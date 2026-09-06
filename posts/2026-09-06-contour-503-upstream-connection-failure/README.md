# Troubleshoot Contour 503 Upstream Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, 503 Error, Envoy, HTTPProxy, Service Endpoints, Troubleshooting, Kubernetes

Description: Trace Contour 503 and Envoy connection failure errors through route, Service port, endpoint, protocol, TLS, and policy.

---

An Envoy response such as this is already a useful clue:

```text
503 upstream connect error or disconnect/reset before headers.
reset reason: connection failure
```

It usually means the request matched a route, Envoy selected an upstream cluster, but it could not establish a usable connection before receiving response headers. The fastest investigation follows the exact request from access log to Service port to selected endpoint.

## Capture the Envoy Response Flag

Send one request with an identifiable request ID:

```bash
request_id=$(uuidgen)
curl -sv -H "X-Request-ID: $request_id" \
  https://api.example.com/orders/healthz -o /dev/null
```

Then find it in the Envoy access log:

```bash
kubectl -n projectcontour logs daemonset/envoy -c envoy \
  --since=5m | grep "$request_id"
```

With Contour's default format, inspect response code, response flags, duration, upstream service time, authority, and upstream host. The most useful first split is:

- `UF`: upstream connection failure;
- `UH`: no healthy upstream endpoint;
- `NR`: no route matched.

A `UF` example often lasts close to Envoy's default two-second upstream connection timeout and has no upstream service time. A `UH` points toward endpoint readiness or active health checking instead. Do not change timeouts until the flag supports a timeout diagnosis.

## Confirm the HTTPProxy Is Valid

```bash
kubectl -n orders describe httpproxy orders
```

`Valid=True` proves Contour accepted the configuration. It does not prove a backend is listening. Still, an invalid object should be fixed before data-plane debugging because the request may be hitting an older route or a different virtual host.

Confirm the requested host and path match the intended HTTPProxy. When multiple Contour instances run, verify `spec.ingressClassName` and the load balancer address reached by DNS.

## Join Service Port to Endpoint Port

Inspect the route and Service together:

```bash
kubectl -n orders get httpproxy orders -o yaml
kubectl -n orders get service orders-api -o yaml
kubectl -n orders get endpointslice \
  -l kubernetes.io/service-name=orders-api -o yaml
```

The HTTPProxy uses the numeric Service `port`. Kubernetes resolves `targetPort` to an endpoint port. For example, route port 80 may correctly connect to Pod port 8080. Compare the access log's `%UPSTREAM_HOST%` with the EndpointSlice address and resolved port.

Check:

- Service selector matches the live Pods;
- endpoint addresses are current;
- `conditions.ready` is true for usable endpoints;
- a named target port exists on every selected Pod; and
- the selected container listens on the Pod IP and endpoint port, not only on `127.0.0.1`.

A Pod can be Ready because its probe checks a different port while the application route port is closed.

## Test from the Data-Plane Network

Use a short-lived approved diagnostic container in the Envoy Pod's network namespace, or an existing debug image managed by the platform team. Do not assume the Envoy image contains curl or a shell.

Test the exact endpoint from the access log, then the Service:

```bash
curl -sv --connect-timeout 2 http://10.244.3.27:8080/healthz
curl -sv --connect-timeout 2 http://orders-api.orders.svc.cluster.local:80/healthz
```

Interpret the difference:

- endpoint fails and Service fails: listener, network policy, node routing, or Pod lifecycle;
- endpoint works but Service fails: Service port or service-routing path;
- both work but Envoy fails: upstream protocol, TLS, active health state, or Envoy-specific policy;
- only some endpoint IPs fail: mixed rollout, node, or replica-specific problem.

Remove the diagnostic container or Pod after use and avoid sending production credentials.

## Match the Upstream Protocol

An HTTPProxy service can explicitly set:

- no protocol for ordinary HTTP/1.1 selection;
- `h2c` for cleartext HTTP/2, commonly plaintext gRPC;
- `h2` for HTTP/2 over TLS; or
- `tls` for HTTP over TLS without forcing HTTP/2.

A TLS client connecting to a plaintext port, or cleartext HTTP sent to a TLS port, commonly produces a reset and `UF`. Inspect the application listener and HTTPProxy field instead of toggling values blindly.

For validated TLS, confirm the CA Secret, certificate SAN, and subject name:

```yaml
services:
- name: orders-api
  port: 8443
  protocol: tls
  validation:
    caSecret: orders-upstream-ca
    subjectName: orders-api.orders.svc.cluster.local
    subjectNames:
    - orders-api.orders.svc.cluster.local
  requestHeadersPolicy:
    set:
    - name: Host
      value: orders-api.orders.svc.cluster.local
```

Temporarily removing validation is not a safe fix. For a ClusterIP Service, the Host rewrite above supplies upstream SNI as well as HTTP authority; SAN validation alone does not set SNI. Use `openssl s_client` with SNI and the CA bundle to identify chain or SAN failures.

## Check Network and Process State

If a direct endpoint connection times out, inspect NetworkPolicy in both the Envoy and application namespaces, plus any CNI-specific cluster policy:

```bash
kubectl get networkpolicy -A
kubectl -n orders get pod -l app=orders-api -o wide
kubectl -n orders logs deployment/orders-api --since=10m
```

Policies must allow traffic from the actual Envoy Pods or nodes to the backend port. An allow rule for the Contour control-plane Deployment does not authorize the Envoy data plane.

If the connection is refused immediately, check the process listener, container restart history, startup race, and endpoint port. If it times out, check policy, routing, security groups, and node health. If it connects and resets, check protocol negotiation, TLS, and application logs.

## Use Metrics for Intermittent Failures

Contour's troubleshooting guide recommends Envoy upstream metrics such as:

- `upstream_cx_connect_fail`;
- `upstream_cx_connect_timeout`;
- `upstream_rq_timeout`; and
- `upstream_rq_total`.

Break them down by the affected cluster and Envoy replica. One failing node or backend replica can produce an intermittent 503 hidden by aggregate success rates.

After the repair, send enough controlled requests to cover every ready endpoint. Verify zero new `UF` events, application receipt of each request, and normal latency. A single successful curl is not evidence that a multi-replica pool is healthy.

## Conclusion

For a Contour 503, let Envoy's response flag choose the branch. With `UF`, use the logged upstream host to verify the Service-to-endpoint port, test from the data-plane network, and then inspect listener, policy, protocol, and TLS. With `UH`, focus on ready and actively healthy endpoints instead. This keeps route changes from masking a concrete connection failure.

## Official Documentation

- [Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/)
- [Contour 1.33 access logging](https://projectcontour.io/docs/1.33/config/access-logging/)
- [Contour 1.33 upstream TLS](https://projectcontour.io/docs/1.33/config/upstream-tls/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Envoy response flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
