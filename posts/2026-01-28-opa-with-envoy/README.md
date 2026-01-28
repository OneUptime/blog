# How to Use OPA with Envoy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPA, Envoy, Service Mesh, Authorization, Security, Kubernetes, Istio

Description: Learn how to integrate OPA with Envoy proxy for external authorization, enabling fine-grained access control at the edge of your service mesh.

---

Envoy is the backbone of modern service meshes. By integrating OPA as Envoy's external authorization filter, you can enforce consistent authorization policies across all service-to-service communication without modifying application code.

## Why OPA with Envoy?

Envoy handles traffic routing, but authorization logic often ends up scattered across services. OPA centralizes this:

- Enforce policies at the network edge before requests reach services
- Consistent authorization across polyglot services
- No application code changes required
- Policy updates without redeploying services

```mermaid
flowchart LR
    Client[Client] --> Envoy[Envoy Proxy]
    Envoy --> OPA[OPA Sidecar]
    OPA --> Envoy
    Envoy --> Service[Backend Service]

    subgraph Pod
        Envoy
        OPA
        Service
    end
```

## Architecture Options

### Option 1: OPA as Sidecar

Each Envoy instance has its own OPA sidecar:

```mermaid
flowchart TB
    subgraph Pod1[Service A Pod]
        E1[Envoy] --> O1[OPA]
        E1 --> S1[Service A]
    end

    subgraph Pod2[Service B Pod]
        E2[Envoy] --> O2[OPA]
        E2 --> S2[Service B]
    end

    Pod1 --> Pod2
```

**Pros**: Low latency, no network dependency
**Cons**: More resource usage

### Option 2: Centralized OPA

Shared OPA service for multiple Envoy instances:

```mermaid
flowchart TB
    subgraph Services
        E1[Envoy 1] --> OPA[OPA Service]
        E2[Envoy 2] --> OPA
        E3[Envoy 3] --> OPA
    end

    OPA --> Policy[Policy Bundle]
```

**Pros**: Easier management, less resource usage
**Cons**: Network latency, single point of failure

## Setting Up Envoy with OPA

### Envoy Configuration

Configure Envoy to use OPA as an external authorization service:

```yaml
# envoy.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: backend_service
                http_filters:
                  # External authorization filter
                  - name: envoy.filters.http.ext_authz
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
                      transport_api_version: V3
                      grpc_service:
                        envoy_grpc:
                          cluster_name: opa_authz
                        timeout: 0.5s
                      failure_mode_allow: false
                      with_request_body:
                        max_request_bytes: 8192
                        allow_partial_message: true
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: opa_authz
      type: STRICT_DNS
      connect_timeout: 1s
      typed_extension_protocol_options:
        envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
          "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
          explicit_http_config:
            http2_protocol_options: {}
      load_assignment:
        cluster_name: opa_authz
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 9191

    - name: backend_service
      type: STRICT_DNS
      connect_timeout: 1s
      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 8000
```

### OPA Configuration for Envoy

Run OPA with the Envoy plugin:

```yaml
# opa-config.yaml
plugins:
  envoy_ext_authz_grpc:
    addr: :9191
    path: envoy/authz/allow
    dry-run: false
    enable-reflection: true

decision_logs:
  console: true
```

Start OPA:

```bash
opa run --server \
  --config-file=opa-config.yaml \
  --addr=localhost:8181 \
  ./policies
```

## Writing Envoy Authorization Policies

### Understanding the Input

Envoy sends a structured input to OPA:

```json
{
  "attributes": {
    "request": {
      "http": {
        "method": "GET",
        "path": "/api/users/123",
        "headers": {
          "authorization": "Bearer eyJhbG...",
          "x-request-id": "abc-123",
          "content-type": "application/json"
        },
        "host": "api.example.com",
        "protocol": "HTTP/1.1"
      }
    },
    "source": {
      "address": {
        "socketAddress": {
          "address": "10.0.0.5",
          "portValue": 54321
        }
      }
    },
    "destination": {
      "address": {
        "socketAddress": {
          "address": "10.0.0.10",
          "portValue": 8080
        }
      }
    }
  },
  "parsed_path": ["api", "users", "123"],
  "parsed_query": {},
  "parsed_body": {}
}
```

### Basic Authorization Policy

```rego
# policy/envoy/authz.rego
package envoy.authz

import rego.v1

import input.attributes.request.http as http_request

# Default deny
default allow := false

# Allow health checks without authentication
allow if {
    http_request.path == "/health"
}

allow if {
    http_request.path == "/ready"
}

# Main authorization rule
allow if {
    # Verify JWT token
    token := bearer_token
    claims := verify_jwt(token)

    # Check authorization
    has_permission(claims, http_request.method, http_request.path)
}

# Extract bearer token from Authorization header
bearer_token := token if {
    auth_header := http_request.headers.authorization
    startswith(auth_header, "Bearer ")
    token := substring(auth_header, 7, -1)
}

# JWT verification
verify_jwt(token) := claims if {
    [header, payload, signature] := io.jwt.decode(token)
    claims := payload

    # Verify expiration
    claims.exp > time.now_ns() / 1000000000

    # Verify issuer
    claims.iss == data.config.jwt_issuer
}

# Permission check
has_permission(claims, method, path) if {
    # Get user roles from JWT
    role := claims.roles[_]

    # Match against permissions
    permission := data.permissions[role][_]
    glob.match(permission.path_pattern, ["/"], path)
    permission.methods[_] == method
}
```

### Permission Data

```json
{
  "config": {
    "jwt_issuer": "https://auth.example.com"
  },
  "permissions": {
    "admin": [
      {
        "path_pattern": "/api/**",
        "methods": ["GET", "POST", "PUT", "DELETE"]
      }
    ],
    "user": [
      {
        "path_pattern": "/api/users/{id}",
        "methods": ["GET", "PUT"]
      },
      {
        "path_pattern": "/api/documents/**",
        "methods": ["GET"]
      }
    ],
    "service": [
      {
        "path_pattern": "/internal/**",
        "methods": ["GET", "POST"]
      }
    ]
  }
}
```

## Advanced Patterns

### Rate Limiting by User

```rego
package envoy.authz

import rego.v1

import input.attributes.request.http as http_request

default allow := false

allow if {
    token := bearer_token
    claims := verify_jwt(token)

    # Check rate limit
    not rate_limited(claims.sub)

    has_permission(claims, http_request.method, http_request.path)
}

# Rate limiting using external data
rate_limited(user_id) if {
    # Check rate limit counter from external data source
    count := data.rate_limits[user_id].request_count
    count > data.config.rate_limit_threshold
}
```

### Service-to-Service Authentication

```rego
package envoy.authz

import rego.v1

import input.attributes.request.http as http_request
import input.attributes.source.address.socketAddress as source

default allow := false

# Allow service-to-service calls with mTLS
allow if {
    # Verify source is a known service (by IP range)
    net.cidr_contains("10.0.0.0/8", source.address)

    # Check service identity from mTLS certificate
    service_name := http_request.headers["x-forwarded-client-cert"]
    allowed_service(service_name, http_request.path)
}

allowed_service(service, path) if {
    permission := data.service_permissions[service][_]
    glob.match(permission.path, ["/"], path)
}
```

### Response Headers

OPA can instruct Envoy to add headers to responses:

```rego
package envoy.authz

import rego.v1

# Return structured response
default allow := {
    "allowed": false,
    "headers": {"x-auth-status": "denied"},
    "body": "Authorization denied",
    "http_status": 403
}

allow := response if {
    # Authorization logic
    verify_request

    response := {
        "allowed": true,
        "headers": {
            "x-auth-user": claims.sub,
            "x-auth-roles": concat(",", claims.roles)
        }
    }
}
```

## Kubernetes Deployment

### Complete Deployment with Sidecars

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        # Application container
        - name: api
          image: api-service:latest
          ports:
            - containerPort: 8000

        # Envoy sidecar
        - name: envoy
          image: envoyproxy/envoy:v1.28-latest
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: envoy-config
              mountPath: /etc/envoy
          command:
            - envoy
            - -c
            - /etc/envoy/envoy.yaml

        # OPA sidecar
        - name: opa
          image: openpolicyagent/opa:latest-envoy
          ports:
            - containerPort: 9191
              name: grpc
            - containerPort: 8181
              name: http
          args:
            - "run"
            - "--server"
            - "--config-file=/config/opa-config.yaml"
            - "--addr=0.0.0.0:8181"
            - "/policies"
          volumeMounts:
            - name: opa-config
              mountPath: /config
            - name: opa-policies
              mountPath: /policies
          livenessProbe:
            httpGet:
              path: /health
              port: 8181
          readinessProbe:
            httpGet:
              path: /health?plugins
              port: 8181

      volumes:
        - name: envoy-config
          configMap:
            name: envoy-config
        - name: opa-config
          configMap:
            name: opa-config
        - name: opa-policies
          configMap:
            name: opa-policies
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-config
data:
  opa-config.yaml: |
    plugins:
      envoy_ext_authz_grpc:
        addr: :9191
        path: envoy/authz/allow
    bundles:
      authz:
        service: bundle-service
        resource: /bundles/envoy-authz.tar.gz
        polling:
          min_delay_seconds: 30
          max_delay_seconds: 60
    services:
      bundle-service:
        url: https://bundles.example.com
```

## Istio Integration

For Istio service mesh, configure external authorization:

```yaml
# istio-ext-authz.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: opa-authz
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: CUSTOM
  provider:
    name: opa-authz
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: opa-authz-provider
  namespace: istio-system
spec:
  configPatches:
    - applyTo: CLUSTER
      match:
        context: ANY
      patch:
        operation: ADD
        value:
          name: opa-authz
          type: STRICT_DNS
          connect_timeout: 1s
          typed_extension_protocol_options:
            envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
              "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
              explicit_http_config:
                http2_protocol_options: {}
          load_assignment:
            cluster_name: opa-authz
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: opa.opa-system.svc.cluster.local
                          port_value: 9191
```

## Testing the Integration

### Local Testing with Docker Compose

```yaml
# docker-compose.yaml
version: '3.8'
services:
  envoy:
    image: envoyproxy/envoy:v1.28-latest
    ports:
      - "8080:8080"
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
    command: envoy -c /etc/envoy/envoy.yaml
    depends_on:
      - opa
      - backend

  opa:
    image: openpolicyagent/opa:latest-envoy
    ports:
      - "9191:9191"
      - "8181:8181"
    volumes:
      - ./policies:/policies
      - ./opa-config.yaml:/config.yaml
    command: run --server --config-file=/config.yaml /policies

  backend:
    image: hashicorp/http-echo
    command: ["-text", "Hello from backend"]
    ports:
      - "8000:5678"
```

### Test Requests

```bash
# Should be denied - no token
curl -i http://localhost:8080/api/users

# Should be allowed - valid token
curl -i http://localhost:8080/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Health check - always allowed
curl -i http://localhost:8080/health
```

## Performance Considerations

### Caching Decisions

Enable decision caching in Envoy:

```yaml
http_filters:
  - name: envoy.filters.http.ext_authz
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
      grpc_service:
        envoy_grpc:
          cluster_name: opa_authz
      # Cache successful decisions for 60 seconds
      stat_prefix: ext_authz
      include_peer_certificate: true
```

### Connection Pooling

Configure HTTP/2 multiplexing:

```yaml
clusters:
  - name: opa_authz
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        explicit_http_config:
          http2_protocol_options:
            max_concurrent_streams: 100
```

## Observability

```mermaid
flowchart TB
    Envoy[Envoy Proxy] --> OPA[OPA]

    Envoy --> EM[Envoy Metrics]
    OPA --> OM[OPA Metrics]
    OPA --> DL[Decision Logs]

    EM --> Prometheus
    OM --> Prometheus
    DL --> ES[Elasticsearch]

    Prometheus --> Grafana
    ES --> Kibana
```

Monitor these key metrics:
- `envoy_ext_authz_ok`: Successful authorizations
- `envoy_ext_authz_denied`: Denied requests
- `envoy_ext_authz_error`: OPA errors
- `envoy_ext_authz_timeout`: Request timeouts

---

OPA with Envoy creates a powerful, centralized authorization layer for your service mesh. Policies are enforced consistently at the network level, and changes propagate instantly without touching application code. Start with basic JWT validation, expand to fine-grained RBAC, and leverage decision logs for complete audit trails.
