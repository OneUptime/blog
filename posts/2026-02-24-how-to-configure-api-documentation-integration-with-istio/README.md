# How to Configure API Documentation Integration with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Documentation, Swagger, OpenAPI, Developer Experience

Description: How to serve API documentation alongside your services using Istio routing, including Swagger UI hosting and OpenAPI spec exposure.

---

Good API documentation is only useful if people can find and access it. With Istio managing your ingress traffic, you can route documentation requests to dedicated documentation services, serve OpenAPI specs directly from your gateway, and keep your docs co-located with your APIs. This guide covers practical ways to integrate API documentation into your Istio-managed infrastructure.

## Hosting Swagger UI Behind Istio

A common setup is deploying Swagger UI as a service in your cluster and routing documentation requests to it through the Istio gateway.

First, deploy Swagger UI:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swagger-ui
  labels:
    app: swagger-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: swagger-ui
  template:
    metadata:
      labels:
        app: swagger-ui
    spec:
      containers:
        - name: swagger-ui
          image: swaggerapi/swagger-ui:latest
          ports:
            - containerPort: 8080
          env:
            - name: URLS
              value: >
                [
                  {"url": "/api/v1/openapi.json", "name": "User Service v1"},
                  {"url": "/api/v2/openapi.json", "name": "User Service v2"},
                  {"url": "/api/v1/orders/openapi.json", "name": "Order Service"}
                ]
---
apiVersion: v1
kind: Service
metadata:
  name: swagger-ui
spec:
  selector:
    app: swagger-ui
  ports:
    - port: 8080
      targetPort: 8080
```

Now route documentation requests through Istio:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-docs
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # Swagger UI
    - match:
        - uri:
            prefix: /docs
      rewrite:
        uri: /
      route:
        - destination:
            host: swagger-ui
            port:
              number: 8080
          headers:
            response:
              set:
                cache-control: "public, max-age=3600"
    # OpenAPI specs from individual services
    - match:
        - uri:
            exact: /api/v1/openapi.json
      route:
        - destination:
            host: user-service
            subset: v1
            port:
              number: 8080
    - match:
        - uri:
            exact: /api/v2/openapi.json
      route:
        - destination:
            host: user-service
            subset: v2
            port:
              number: 8080
    - match:
        - uri:
            exact: /api/v1/orders/openapi.json
      route:
        - destination:
            host: order-service
            port:
              number: 8080
```

Users can access the documentation at `https://api.example.com/docs` and the Swagger UI fetches the OpenAPI specs from the individual services.

## Serving OpenAPI Specs from a ConfigMap

If your services do not serve their own OpenAPI specs, you can store them in ConfigMaps and serve them through a static file server:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openapi-specs
data:
  user-service-v1.json: |
    {
      "openapi": "3.0.0",
      "info": {
        "title": "User Service",
        "version": "1.0.0"
      },
      "paths": {
        "/users": {
          "get": {
            "summary": "List all users",
            "responses": {
              "200": {
                "description": "A list of users"
              }
            }
          }
        }
      }
    }
  order-service-v1.json: |
    {
      "openapi": "3.0.0",
      "info": {
        "title": "Order Service",
        "version": "1.0.0"
      },
      "paths": {
        "/orders": {
          "get": {
            "summary": "List all orders",
            "responses": {
              "200": {
                "description": "A list of orders"
              }
            }
          }
        }
      }
    }
```

Deploy a simple nginx server to host these specs:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-docs-server
  labels:
    app: api-docs-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-docs-server
  template:
    metadata:
      labels:
        app: api-docs-server
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          volumeMounts:
            - name: specs
              mountPath: /usr/share/nginx/html/specs
      volumes:
        - name: specs
          configMap:
            name: openapi-specs
---
apiVersion: v1
kind: Service
metadata:
  name: api-docs-server
spec:
  selector:
    app: api-docs-server
  ports:
    - port: 80
      targetPort: 80
```

Route spec requests to this server:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: openapi-specs-routing
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /specs/
      route:
        - destination:
            host: api-docs-server
            port:
              number: 80
          headers:
            response:
              set:
                content-type: "application/json"
                cache-control: "public, max-age=3600"
                access-control-allow-origin: "*"
```

## Redoc Integration

Redoc is another popular API documentation renderer. Deploy it similarly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redoc
  labels:
    app: redoc
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redoc
  template:
    metadata:
      labels:
        app: redoc
    spec:
      containers:
        - name: redoc
          image: redocly/redoc:latest
          ports:
            - containerPort: 80
          env:
            - name: SPEC_URL
              value: "/specs/user-service-v1.json"
---
apiVersion: v1
kind: Service
metadata:
  name: redoc
spec:
  selector:
    app: redoc
  ports:
    - port: 80
      targetPort: 80
```

Route to it:

```yaml
http:
  - match:
      - uri:
          prefix: /api-reference
    rewrite:
      uri: /
    route:
      - destination:
          host: redoc
          port:
            number: 80
```

## Versioned Documentation

When you have multiple API versions, route documentation requests to the appropriate version:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: versioned-docs
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /docs/v1
      rewrite:
        uri: /
      route:
        - destination:
            host: swagger-ui-v1
            port:
              number: 8080
    - match:
        - uri:
            prefix: /docs/v2
      rewrite:
        uri: /
      route:
        - destination:
            host: swagger-ui-v2
            port:
              number: 8080
    - match:
        - uri:
            exact: /docs
      redirect:
        uri: /docs/v2
        redirectCode: 302
```

The last rule redirects `/docs` to the latest version.

## Adding Documentation Discovery Headers

Help clients discover your API documentation by adding headers to API responses:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-with-docs-headers
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            response:
              add:
                link: '</docs/v1>; rel="service-doc", </specs/user-service-v1.json>; rel="describedby"'
```

The `Link` header with `rel="service-doc"` and `rel="describedby"` are standard ways to advertise API documentation URLs.

## Protecting Documentation in Production

You might want to restrict access to API docs in production while keeping them open in staging:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: docs-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    - to:
        - operation:
            paths: ["/docs*", "/specs*", "/api-reference*"]
      from:
        - source:
            ipBlocks:
              - "10.0.0.0/8"
              - "192.168.0.0/16"
```

This restricts documentation access to internal IP ranges only.

Alternatively, use JWT authentication:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: docs-jwt-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    - to:
        - operation:
            paths: ["/docs*"]
      from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[role]
          values: ["developer", "admin"]
```

## CORS for Documentation

If your Swagger UI is on a different subdomain than your API, configure CORS:

```yaml
corsPolicy:
  allowOrigins:
    - exact: "https://docs.example.com"
  allowMethods:
    - GET
    - OPTIONS
  allowHeaders:
    - content-type
    - authorization
  maxAge: "24h"
```

## Caching Documentation Responses

API documentation does not change frequently. Add caching headers to reduce load:

```yaml
headers:
  response:
    set:
      cache-control: "public, max-age=86400"
      etag: '"v1.0.0"'
```

## Monitoring Documentation Usage

Track how often your documentation is accessed using Istio's built-in metrics:

```bash
# Check documentation request volume
kubectl exec -n istio-system deploy/prometheus -- \
  curl -s 'localhost:9090/api/v1/query?query=istio_requests_total{destination_service="swagger-ui.default.svc.cluster.local"}'
```

This helps you understand which API versions and endpoints developers are most interested in, which can inform your deprecation and migration decisions.

Integrating API documentation with Istio keeps everything under one roof. Your docs are served from the same domain as your APIs, benefit from the same TLS configuration, and can be protected with the same authentication and authorization policies.
