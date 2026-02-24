# How to Configure External Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, External Authorization, OPA, Security, Kubernetes

Description: Step-by-step guide to integrating external authorization services with Istio using the ext_authz filter for advanced policy decisions.

---

Istio's built-in authorization policies handle most common scenarios, but sometimes you need authorization logic that's too complex for declarative YAML. Maybe you need to check a user's subscription status in a database, enforce rate limits per user, consult a graph of permissions, or apply business rules that change frequently. External authorization lets you delegate these decisions to a service you control.

## How External Authorization Works

Istio configures Envoy's ext_authz filter to send authorization checks to an external service. For every matching request, Envoy pauses the request, sends the request metadata to the external service, and waits for a verdict. The external service responds with either "allow" or "deny", and Envoy acts accordingly.

The external service receives:
- Request headers
- Request path and method
- Source identity (from mTLS)
- Client IP
- Custom context you configure

The external service can also:
- Add headers to the upstream request (useful for injecting user context)
- Add headers to the downstream response
- Return a custom error message and status code

## Registering an External Authorization Provider

First, register your external authorization service in Istio's mesh configuration. You have two protocol options: HTTP and gRPC.

For HTTP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: "my-ext-authz"
        envoyExtAuthzHttp:
          service: "ext-authz.auth.svc.cluster.local"
          port: 8080
          includeRequestHeadersInCheck:
            - "authorization"
            - "cookie"
            - "x-custom-header"
          headersToUpstreamOnAllow:
            - "x-user-id"
            - "x-user-role"
            - "x-tenant-id"
          headersToDownstreamOnDeny:
            - "x-ext-authz-check-result"
          includeAdditionalHeadersInCheck:
            x-ext-authz-check: "true"
          pathPrefix: "/authz"
```

For gRPC:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: "my-ext-authz-grpc"
        envoyExtAuthzGrpc:
          service: "ext-authz-grpc.auth.svc.cluster.local"
          port: 9091
```

If you're updating an existing installation, edit the ConfigMap directly:

```bash
kubectl edit configmap istio -n istio-system
```

Add under the `mesh` key:

```yaml
extensionProviders:
  - name: "my-ext-authz"
    envoyExtAuthzHttp:
      service: "ext-authz.auth.svc.cluster.local"
      port: 8080
      includeRequestHeadersInCheck:
        - "authorization"
        - "cookie"
```

After editing, restart istiod to pick up the changes:

```bash
kubectl rollout restart deployment/istiod -n istio-system
```

## Creating the CUSTOM AuthorizationPolicy

With the provider registered, create a CUSTOM policy that routes authorization checks to it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-authz
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: CUSTOM
  provider:
    name: my-ext-authz
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
            notPaths: ["/api/public/*", "/healthz", "/ready"]
```

The `rules` field determines which requests get sent to the external authorizer. Only requests matching these rules trigger the external check. This is important for performance - you don't want every health check hitting your authorization service.

## Building an HTTP External Authorizer

Here's a practical external authorizer in Python using Flask:

```python
from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

PERMISSION_SERVICE_URL = os.getenv("PERMISSION_SERVICE_URL", "http://permission-service:8080")

@app.route("/authz", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
def check_auth():
    # Extract the original request information
    original_method = request.headers.get("X-Forwarded-Method", request.method)
    original_path = request.headers.get("X-Forwarded-Uri", request.path)
    auth_header = request.headers.get("Authorization", "")

    # No token = deny
    if not auth_header.startswith("Bearer "):
        return "No authorization token", 403

    token = auth_header.split(" ", 1)[1]

    # Check permissions against your backend
    try:
        resp = requests.post(
            f"{PERMISSION_SERVICE_URL}/check",
            json={
                "token": token,
                "method": original_method,
                "path": original_path,
            },
            timeout=2,
        )

        if resp.status_code == 200:
            data = resp.json()
            # Return 200 to allow, with extra headers for upstream
            response = app.make_response("")
            response.status_code = 200
            response.headers["x-user-id"] = data.get("user_id", "")
            response.headers["x-user-role"] = data.get("role", "")
            response.headers["x-tenant-id"] = data.get("tenant_id", "")
            return response
        else:
            return "Permission denied", 403

    except requests.Timeout:
        # Fail closed on timeout
        return "Authorization service timeout", 503


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Deploying the External Authorizer

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ext-authz
  namespace: auth
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ext-authz
  template:
    metadata:
      labels:
        app: ext-authz
    spec:
      containers:
        - name: ext-authz
          image: myregistry/ext-authz:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ext-authz
  namespace: auth
spec:
  selector:
    app: ext-authz
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ext-authz
  namespace: auth
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ext-authz
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Using OPA with Envoy gRPC API

OPA has native support for Envoy's external authorization gRPC API. Deploy OPA as a sidecar or standalone service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-policy
  namespace: auth
data:
  policy.rego: |
    package envoy.authz

    import input.attributes.request.http as http_request
    import future.keywords.if

    default allow := false

    # Allow health checks
    allow if {
        http_request.path == "/healthz"
    }

    # Allow public endpoints
    allow if {
        startswith(http_request.path, "/api/public/")
    }

    # Check JWT claims for protected endpoints
    allow if {
        token := parse_bearer_token(http_request.headers.authorization)
        claims := io.jwt.decode(token)[1]
        has_permission(claims, http_request.method, http_request.path)
    }

    parse_bearer_token(auth) := token if {
        startswith(auth, "Bearer ")
        token := substring(auth, 7, -1)
    }

    has_permission(claims, method, path) if {
        claims.role == "admin"
    }

    has_permission(claims, "GET", path) if {
        claims.role == "viewer"
        startswith(path, "/api/")
    }

    has_permission(claims, method, path) if {
        claims.role == "editor"
        method != "DELETE"
        startswith(path, "/api/")
    }
```

## Combining External Auth with Built-in Policies

CUSTOM policies work alongside DENY and ALLOW policies. The evaluation order is:

1. CUSTOM (external auth) - checked first
2. DENY - checked second
3. ALLOW - checked last

If the external authorizer allows a request, it still needs to pass DENY and ALLOW checks:

```yaml
# External auth for complex business logic
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-authz
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: CUSTOM
  provider:
    name: my-ext-authz
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
---
# Static deny for blocked paths
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-debug
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/debug/*"]
```

Even if the external authorizer allows `/debug/pprof`, the DENY policy blocks it.

## Performance Tuning

External authorization adds latency to every matching request. Here's how to keep it fast:

```bash
# Monitor ext_authz latency
kubectl exec -n my-app deploy/api-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ext_authz | grep -E "latency|upstream_rq"
```

Tips for keeping latency low:
- Run the authorizer in the same cluster and region
- Cache authorization decisions in the authorizer (with short TTLs)
- Use gRPC instead of HTTP for the check protocol
- Keep your policy evaluation logic simple and avoid external calls when possible
- Scope CUSTOM policies narrowly so only requests that need external auth trigger it

## Testing External Authorization

```bash
# Test with a valid token
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" http://api-service:8080/api/users

# Test without a token
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" \
  http://api-service:8080/api/users

# Check ext_authz stats
kubectl exec -n my-app deploy/api-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ext_authz
```

External authorization is the escape hatch for when Istio's declarative policies aren't enough. Use it for complex business logic, dynamic permissions, and any authorization decision that requires consulting external data sources.
