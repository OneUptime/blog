# Configure Contour Active Health Checks Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Health Check, Health Checking, HTTP Health Checks, Kubernetes, Envoy, HTTPProxy, Service Endpoints, Probe

Description: Add Envoy active health checks to Contour routes without confusing them with Kubernetes readiness, overloading services, or causing endpoint flapping.

---

Contour can configure Envoy to probe Service endpoints for each HTTPProxy route. These active checks are independent of Kubernetes startup, readiness, and liveness probes. They solve different problems:

- Kubernetes readiness decides whether an endpoint is published as ready for the Service.
- Envoy active health checking decides whether one Envoy cluster should send traffic to a published endpoint.
- Kubernetes liveness may restart a container; an Envoy health check never does.

Start with a correct readiness probe. Add Envoy active checks only when faster, data-plane-local detection or an independent upstream signal justifies their cost.

## Define a Purpose-Built Endpoint

A health endpoint should be cheap, bounded, and honest about whether the process can serve the proxied traffic. Avoid an expensive recursive check of every dependency on every request. If every Envoy replica probes every application endpoint, even a modest interval can create substantial aggregate traffic.

This route checks `/readyz` every ten seconds and treats any status from 200 through 299 as healthy:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: api
  namespace: apps
spec:
  virtualhost:
    fqdn: api.example.com
  routes:
  - conditions:
    - prefix: /
    healthCheckPolicy:
      path: /readyz
      host: api.internal.example
      intervalSeconds: 10
      timeoutSeconds: 2
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
      expectedStatuses:
      - start: 200
        end: 300
    services:
    - name: api
      port: 8080
      healthPort: 8081
```

`healthPort` is optional. It names another numeric port exposed by the same Kubernetes Service, not an arbitrary container port. For the example above, define both Service ports and map each to the intended Pod port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: apps
spec:
  selector:
    app: api
  ports:
  - name: http
    port: 8080
    targetPort: http
  - name: health
    port: 8081
    targetPort: health
```

Envoy sends health requests through the endpoint port resolved from Service port 8081 while normal traffic uses the endpoint port resolved from Service port 8080. Ensure NetworkPolicy permits both. When `healthPort` is omitted, Envoy checks the routing port.

The `host` field matters for virtual-host-aware applications. If omitted, Contour uses `contour-envoy-healthcheck`. A server that accepts only `api.internal.example` could otherwise return 404 even while healthy.

## Understand the Defaults and Ranges

Project Contour 1.33 documents these HTTP defaults:

- `intervalSeconds`: 5 seconds
- `timeoutSeconds`: 2 seconds
- `unhealthyThresholdCount`: 3 failures
- `expectedStatuses`: only status 200
- `host`: `contour-envoy-healthcheck`

On startup, one successful check is enough to mark a host healthy even when `healthyThresholdCount` is greater than one. An HTTP 503 response immediately marks the host unhealthy without waiting for the normal unhealthy threshold.

`expectedStatuses` uses half-open ranges. `start: 200` and `end: 300` includes 200 through 299, but not 300. If the field is present and status 200 should count, include it explicitly. Broad ranges such as 200 through 499 can hide authentication or routing mistakes, so accept only statuses the health endpoint intentionally returns.

## Align Kubernetes and Envoy Without Making Them Identical

Use the same underlying health signal when it represents serving readiness, but tune consumers independently:

```yaml
readinessProbe:
  httpGet:
    path: /readyz
    port: health
    httpHeaders:
    - name: Host
      value: api.internal.example
  periodSeconds: 10
  timeoutSeconds: 2
  failureThreshold: 3
```

Kubernetes removes an unready Pod from the Service's ready endpoints. Envoy can react within its own check cadence and may have a different view briefly. That is expected. Do not assume that changing an HTTPProxy health policy updates Pod readiness or EndpointSlice conditions.

Use startup probes for slow initialization. A liveness probe should detect an unrecoverable process, not a transient dependency outage. Otherwise a database incident can trigger restart storms while Envoy is already removing affected endpoints from traffic.

## Tune for Failure Detection and Recovery

With a ten-second interval and three ordinary failures, detection takes roughly twenty to thirty seconds depending on when failure begins and how quickly each probe times out. The exact time is not a hard guarantee. Network scheduling and timeouts matter.

Make `timeoutSeconds` comfortably longer than the healthy endpoint's high-percentile latency but much shorter than the interval. Require enough failures to tolerate brief packet loss. Require multiple successes for recovery when the application needs warmup, while remembering that startup has special one-success behavior.

Roll out to one low-risk route first. Watch:

- health endpoint request volume and latency;
- Envoy healthy and unhealthy host counts;
- `UH` response flags, which mean no healthy upstream host;
- Kubernetes readiness transitions; and
- application error and saturation metrics.

If all endpoints flap together, first check the health host header, path, separate health port, network policy, and accepted status range. An overly strict policy can turn a minor health endpoint issue into a complete outage.

## Configure Connect-Only Checks for TCPProxy

TCPProxy has a separate connect-only health policy with no HTTP path or expected status:

```yaml
spec:
  virtualhost:
    fqdn: db.example.com
    tls:
      passthrough: true
  tcpproxy:
    healthCheckPolicy:
      intervalSeconds: 10
      timeoutSeconds: 3
      unhealthyThresholdCount: 3
      healthyThresholdCount: 2
    services:
    - name: database
      port: 5432
      healthPort: 15432
```

A TCP check proves only that a connection can be opened. It does not authenticate, issue a query, or prove the application protocol is usable. If port 15432 is a separate sidecar or health listener, ensure it cannot stay healthy after the real database has become unusable.

As with the HTTP example, port 15432 must be declared as a port on the `database` Service so Contour can resolve it.

## Verify the Generated Behavior

Start with Kubernetes objects and Contour status:

```bash
kubectl -n apps get httpproxy api \
  -o jsonpath='{.status.currentStatus}{"\n"}{.status.description}{"\n"}'

kubectl -n apps get service api -o yaml
kubectl -n apps get endpointslice -l kubernetes.io/service-name=api -o yaml
```

Confirm that `port`, `healthPort`, and the Pod's named or numeric target ports resolve to the intended containers. Then inspect health request logs and Envoy cluster health metrics. Avoid changing Envoy's admin interface from its default restricted exposure merely for debugging; use the installation's documented local access method.

Test three controlled states in a non-production environment:

1. Make one endpoint return an unhealthy response and confirm traffic shifts away.
2. Restore it and confirm it returns after the recovery threshold.
3. Make the health path unavailable on every endpoint and verify alerts detect the resulting no-healthy-upstream state.

The third test is important because active health checking adds a new shared failure mode: a bad health endpoint deployment can remove otherwise usable application endpoints.

## Conclusion

Keep Kubernetes readiness as the workload's primary serving signal, then add Contour active checks only for a measured data-plane need. Resolve every routing and health port through the Service, use honest lightweight checks, and tune thresholds with failure and recovery tests.

## Official Documentation

- [Project Contour 1.33 upstream health checks](https://projectcontour.io/docs/1.33/config/health-checks/)
- [Project Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Project Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/)
- [Envoy upstream health checking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking)
- [Kubernetes Pod lifecycle and probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
