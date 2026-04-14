# How to Use Dapr Service Invocation as API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, API Gateway, Kubernetes, Architecture

Description: Learn how to use Dapr's built-in service invocation capability as a lightweight API gateway, enabling direct client-to-service calls with name resolution, mTLS, and middleware.

---

## Dapr Service Invocation as an API Gateway

Dapr's service invocation building block is more than just inter-service communication. By exposing the Dapr HTTP API directly to external clients via a Kubernetes ingress, you can use Dapr as a lightweight API gateway that provides name resolution, mTLS between services, middleware pipelines, and distributed tracing without a separate gateway service.

## Exposing Dapr Invocation via Ingress

Configure a Kubernetes ingress to forward external requests to the Dapr HTTP API:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dapr-api-gateway
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /v1.0/invoke/$1/method/$2
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: api.myapp.com
    http:
      paths:
      - path: /api/([\w-]+)/(.+)
        pathType: ImplementationSpecific
        backend:
          service:
            name: dapr-api-token-injector
            port:
              number: 8080
```

## API Token Injection Proxy

Deploy a lightweight proxy that injects the Dapr API token for security:

```go
// token-proxy.go - injects Dapr API token before forwarding to sidecar
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "os"
)

func main() {
    daprURL, _ := url.Parse("http://localhost:3500")
    apiToken := os.Getenv("DAPR_API_TOKEN")

    proxy := httputil.NewSingleHostReverseProxy(daprURL)
    originalDirector := proxy.Director
    proxy.Director = func(req *http.Request) {
        originalDirector(req)
        req.Header.Set("dapr-api-token", apiToken)
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        proxy.ServeHTTP(w, r)
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Direct Dapr Invocation from Clients

Clients can call services directly via the Dapr API:

```bash
# Call user-service's /profile endpoint directly via Dapr
curl "https://api.myapp.com/api/user-service/profile/user123" \
  -H "Authorization: Bearer $JWT_TOKEN"

# This maps to the Dapr invocation URL:
# http://dapr-sidecar:3500/v1.0/invoke/user-service/method/profile/user123
```

## Configuring Access Control for External Invocation

Restrict which services can be called externally using Dapr access control:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: api-gateway-config
  namespace: production
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: user-service
      defaultAction: deny
      namespace: production
      operations:
      - name: /profile/*
        httpVerb: ["GET"]
        action: allow
      - name: /update
        httpVerb: ["PUT", "POST"]
        action: allow
    - appId: order-service
      defaultAction: deny
      namespace: production
      operations:
      - name: /orders/*
        httpVerb: ["GET", "POST"]
        action: allow
    - appId: payment-service
      defaultAction: deny
      namespace: production
      operations:
      - name: /payments/initiate
        httpVerb: ["POST"]
        action: allow
```

## Adding a Middleware Pipeline to the Gateway

Apply cross-cutting middleware globally via Dapr configuration on the gateway service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: external-gateway-config
  namespace: production
spec:
  httpPipeline:
    handlers:
    - name: jwt-validator
      type: middleware.http.bearer
    - name: rate-limiter
      type: middleware.http.ratelimit
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      protocol: grpc
```

## Caveats and Considerations

Using Dapr service invocation as an API gateway has limitations:

```bash
# Things to check before using this pattern
# 1. Dapr service names are internal - ensure they are not exposed publicly
kubectl get services -n production | grep dapr

# 2. Verify the access control policy is applied
kubectl get configuration api-gateway-config -n production -o yaml

# 3. Monitor invocation metrics for external-origin requests
curl "http://prometheus:9090/api/v1/query?query=dapr_service_invocation_req_sent_total"
```

## Summary

Using Dapr service invocation as an API gateway is a lightweight alternative to a dedicated gateway service, routing external requests to Dapr's HTTP API via a Kubernetes ingress and proxy. Configure access control policies to explicitly allow only specific service operations from external callers, apply JWT authentication via Dapr middleware components, and use the Dapr API token for securing the sidecar endpoint. This pattern works well for smaller deployments but consider a dedicated gateway for complex routing, request transformation, or multi-protocol support needs.
