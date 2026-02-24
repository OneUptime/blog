# How to Set Up Health Check Endpoints at Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Gateway, Load Balancer, Kubernetes

Description: How to configure health check endpoints at the Istio ingress gateway for external load balancers, uptime monitoring, and automated failover systems.

---

External load balancers, CDNs, and uptime monitoring services need health check endpoints to determine if your application is available. When you use Istio as your ingress, you need a reliable health check endpoint at the gateway level that accurately reflects the health of your system.

There are two kinds of health checks to think about: load balancer health checks (which determine if the gateway itself is healthy) and application-level health checks (which determine if backend services are healthy). This guide covers both.

## Load Balancer Health Checks

Cloud load balancers (AWS ALB/NLB, GCP LB, Azure LB) periodically send health check requests to your backend targets. If the target fails health checks, the load balancer stops sending traffic to it.

The Istio ingress gateway already has a health check endpoint built in on port 15021:

```bash
# From inside the cluster
kubectl exec <any-pod> -- curl -s http://istio-ingressgateway.istio-system:15021/healthz/ready
```

This returns a 200 when the Envoy proxy in the gateway is ready to accept traffic. Configure your cloud load balancer to use this endpoint.

For AWS NLB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "HTTP"
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
    - name: status-port
      port: 15021
      targetPort: 15021
```

For GCP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    cloud.google.com/backend-config: '{"default": "istio-gateway-backend"}'
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
    - name: http
      port: 80
    - name: https
      port: 443
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: istio-gateway-backend
  namespace: istio-system
spec:
  healthCheck:
    port: 15021
    requestPath: /healthz/ready
    type: HTTP
```

## Application-Level Health Check Endpoints

The gateway health check only tells you if the Envoy proxy is running. It does not tell you if your backend services are healthy. For uptime monitoring services (like OneUptime, Pingdom, or UptimeRobot), you want an endpoint that checks the actual health of your application.

### Option 1: Route to Your Application's Health Endpoint

The simplest approach is to expose your application's health endpoint through the gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: health-check-vs
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            exact: /healthz
      route:
        - destination:
            host: my-app.default.svc.cluster.local
            port:
              number: 80
      timeout: 5s
      retries:
        attempts: 0
```

Set `retries: 0` for health check endpoints. You do not want the health check to succeed because of a retry when the service is actually down.

### Option 2: Aggregated Health Check Service

For a more comprehensive health check, deploy a service that checks multiple backends:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: health-aggregator
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: health-aggregator
  template:
    metadata:
      labels:
        app: health-aggregator
    spec:
      containers:
        - name: health
          image: python:3.11-slim
          command: ["python", "-c"]
          args:
            - |
              from http.server import HTTPServer, BaseHTTPRequestHandler
              import urllib.request
              import json

              services = {
                  "api": "http://api-service.default.svc.cluster.local/healthz",
                  "web": "http://web-service.default.svc.cluster.local/healthz",
                  "worker": "http://worker-service.default.svc.cluster.local/healthz",
              }

              class Handler(BaseHTTPRequestHandler):
                  def do_GET(self):
                      results = {}
                      all_healthy = True
                      for name, url in services.items():
                          try:
                              req = urllib.request.urlopen(url, timeout=3)
                              results[name] = {"status": "healthy", "code": req.status}
                          except Exception as e:
                              results[name] = {"status": "unhealthy", "error": str(e)}
                              all_healthy = False

                      status = 200 if all_healthy else 503
                      self.send_response(status)
                      self.send_header("Content-Type", "application/json")
                      self.end_headers()
                      self.wfile.write(json.dumps({"healthy": all_healthy, "services": results}).encode())

                  def log_message(self, format, *args):
                      pass

              HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: health-aggregator
  namespace: default
spec:
  selector:
    app: health-aggregator
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

Route health check traffic to this aggregator:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: health-vs
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            exact: /health
      route:
        - destination:
            host: health-aggregator.default.svc.cluster.local
            port:
              number: 80
      timeout: 10s
```

### Option 3: EnvoyFilter Direct Response

For a lightweight health check that does not require a backend service at all, use an EnvoyFilter to return a 200 directly from the gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-health-endpoint
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                if path == "/gateway-health" then
                  request_handle:respond(
                    {[":status"] = "200", ["content-type"] = "application/json"},
                    '{"status":"ok","component":"istio-gateway"}'
                  )
                end
              end
```

This responds to `/gateway-health` directly from the gateway without forwarding to any backend. It only verifies that the gateway itself is running.

## Excluding Health Checks from Access Logs

Health check requests can flood your access logs. Exclude them using telemetry configuration:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: disable-health-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400 || request.url_path != '/healthz'"
```

This only logs requests that are either errors or not health checks.

## Configuring Health Check Timeouts

Health check endpoints should respond quickly. If they do not, the load balancer might mark the gateway as unhealthy. Configure strict timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: health-vs
spec:
  hosts:
    - "app.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            exact: /healthz
      route:
        - destination:
            host: my-app.default.svc.cluster.local
      timeout: 3s
      retries:
        attempts: 0
```

The 3-second timeout is usually fine for health checks. Your load balancer's health check timeout should be longer than this (say 5 seconds) to avoid false negatives from network jitter.

## Multi-Gateway Health Checks

If you have multiple Istio gateways (internal and external), each needs its own health check:

```yaml
# External gateway health
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-health
spec:
  hosts:
    - "api.example.com"
  gateways:
    - external-gateway
  http:
    - match:
        - uri:
            exact: /healthz
      route:
        - destination:
            host: api-service.default.svc.cluster.local

---
# Internal gateway health
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: internal-health
spec:
  hosts:
    - "internal.example.com"
  gateways:
    - internal-gateway
  http:
    - match:
        - uri:
            exact: /healthz
      route:
        - destination:
            host: internal-service.default.svc.cluster.local
```

## Securing Health Check Endpoints

If your health check endpoint reveals sensitive information (like service names and their status), restrict access to it:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: health-check-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - /healthz
      from:
        - source:
            remoteIpBlocks:
              - "10.0.0.0/8"
              - "172.16.0.0/12"
```

This restricts the health check endpoint to internal IP ranges, preventing external users from probing your service health.

## Summary

Health check endpoints at the Istio gateway serve two purposes: telling load balancers that the gateway is ready (use the built-in /healthz/ready on port 15021) and telling monitoring services that your application is healthy (route through a VirtualService to your backend health endpoint or an aggregator). For simple gateway-level checks, an EnvoyFilter can return 200 directly without involving any backend. Always set strict timeouts, disable retries on health check routes, and consider excluding health check requests from access logs to keep them clean.
