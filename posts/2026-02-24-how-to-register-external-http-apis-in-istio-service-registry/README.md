# How to Register External HTTP APIs in Istio Service Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, HTTP APIs, Service Mesh, Kubernetes

Description: Step-by-step guide to registering external HTTP APIs in Istio's service registry using ServiceEntry for full traffic management and observability.

---

Most real-world applications depend on external HTTP APIs. Whether it is a payment gateway, email service, analytics platform, or some internal company API running outside your Kubernetes cluster, your mesh workloads need to reach these endpoints. Istio gives you a clean way to register these external HTTP APIs so they become first-class citizens in your service mesh.

The tool for this is the ServiceEntry resource. Once you register an external HTTP API, Istio can track metrics for it, apply retries, set timeouts, and even do traffic shifting. Without registration, external API calls either get blocked (in REGISTRY_ONLY mode) or fly under the radar with no visibility.

## Why Register External HTTP APIs?

Think about the last time an external API went down and you had no idea which of your services was affected. Maybe your checkout flow broke because the tax calculation API was returning 500 errors, but your monitoring only showed "upstream connect error" with no details.

When you register external HTTP APIs in Istio, you get:

- Proper metrics (request count, latency, error rates) per external API
- The ability to set timeouts and retries at the mesh level
- Circuit breaking to prevent cascade failures
- Access logging with full HTTP details
- Security policies controlling which workloads can call which APIs

## Basic HTTP API Registration

Here is how to register an external HTTP API. Say your application calls `http://api.weatherservice.com` on port 80:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: weather-api
  namespace: default
spec:
  hosts:
    - api.weatherservice.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
```

Apply it and test:

```bash
kubectl apply -f weather-api-se.yaml

# Test from a pod in the mesh
kubectl exec deploy/my-app -c my-app -- curl -s http://api.weatherservice.com/current
```

## Registering Multiple HTTP Endpoints

If your application talks to several HTTP APIs that all use port 80, you can batch them into a single ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-http-apis
spec:
  hosts:
    - api.weatherservice.com
    - api.geocoding.com
    - hooks.slack.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
```

This works well when the APIs share the same port and protocol. If they use different ports, you need separate ServiceEntries or a multi-port definition.

## HTTP APIs on Non-Standard Ports

Some APIs run on non-standard ports like 8080 or 3000. Handle this by specifying the correct port number:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: internal-company-api
spec:
  hosts:
    - api.internal.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS
```

If the API runs on both port 80 and 8080:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: multi-port-api
spec:
  hosts:
    - api.internal.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 8080
      name: http-alt
      protocol: HTTP
  resolution: DNS
```

## Adding Traffic Management to Registered APIs

Once the API is registered, you can pair it with a VirtualService for advanced traffic management. Here is an example that adds a 5-second timeout and automatic retries:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: weather-api-vs
spec:
  hosts:
    - api.weatherservice.com
  http:
    - timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure
      route:
        - destination:
            host: api.weatherservice.com
            port:
              number: 80
```

This means if the weather API returns a 500 error, Istio automatically retries up to 3 times with a 2-second timeout per attempt. Your application code does not need to implement retry logic at all.

## Adding Circuit Breaking

You can also attach a DestinationRule to add circuit breaking:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: weather-api-dr
spec:
  host: api.weatherservice.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
```

This configuration limits concurrent connections to 100 and ejects endpoints that return 5 consecutive 5xx errors. The ejected endpoint stays out for 60 seconds before being reconsidered.

## Observability for Registered APIs

After registering the API, you should see proper metrics in your monitoring stack. Check Prometheus for these metrics:

```bash
# Request count to the external API
istio_requests_total{destination_service="api.weatherservice.com"}

# Request duration
istio_request_duration_milliseconds_bucket{destination_service="api.weatherservice.com"}

# Response size
istio_response_bytes_bucket{destination_service="api.weatherservice.com"}
```

In Kiali, registered external APIs show up as nodes in the service graph. You can see the traffic flow from your internal services to these external APIs, complete with success rates and latency.

## Verifying Registration

Use istioctl to confirm the API is properly registered in Envoy's configuration:

```bash
# Check clusters
istioctl proxy-config cluster deploy/my-app | grep weatherservice

# Check routes
istioctl proxy-config routes deploy/my-app | grep weatherservice

# Check endpoints
istioctl proxy-config endpoints deploy/my-app | grep weatherservice
```

You should see entries for each registered host. If nothing shows up, check the namespace and exportTo settings on your ServiceEntry.

## Controlling Access with AuthorizationPolicy

You can restrict which workloads are allowed to call specific external APIs using AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-weather-api
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
    - to:
        - operation:
            hosts:
              - api.weatherservice.com
            ports:
              - "80"
```

This ensures only the `my-app` workload can reach the weather API. Other workloads in the namespace are denied.

## Handling API Versioning

If the external API uses path-based versioning (like `/v1/` and `/v2/`), you can use VirtualService to route different versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-versioning
spec:
  hosts:
    - api.weatherservice.com
  http:
    - match:
        - uri:
            prefix: /v1/
      timeout: 3s
      route:
        - destination:
            host: api.weatherservice.com
            port:
              number: 80
    - match:
        - uri:
            prefix: /v2/
      timeout: 10s
      route:
        - destination:
            host: api.weatherservice.com
            port:
              number: 80
```

This gives you different timeout settings for different API versions, which is useful during migration periods when the new version might be slower.

## Practical Tips

**Name your ServiceEntries consistently.** Use a pattern like `ext-{service-name}` or `{team}-{service}` so they are easy to find and manage.

**Document why each ServiceEntry exists.** Add annotations with the team that owns it and why the external API is needed:

```yaml
metadata:
  name: weather-api
  annotations:
    team: backend
    purpose: "Real-time weather data for shipping estimates"
```

**Monitor for unregistered external calls.** If you are in ALLOW_ANY mode, watch for PassthroughCluster traffic in your metrics. Those are external calls that are not registered and should be:

```bash
istioctl proxy-config cluster deploy/my-app | grep PassthroughCluster
```

**Keep ServiceEntries close to the workloads that use them.** Create them in the same namespace as the calling service. This makes it clear which team owns which external dependencies and keeps things organized as your cluster grows.

Registering external HTTP APIs in Istio takes a few minutes but pays off significantly in observability and resilience. Start with the services that matter most to your application and expand from there.
