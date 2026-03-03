# How to Integrate Istio with Open Policy Agent (OPA)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OPA, Open Policy Agent, Security, Kubernetes, Policy

Description: How to use Open Policy Agent with Istio for fine-grained authorization and policy enforcement in your service mesh.

---

Istio has its own AuthorizationPolicy resource that handles basic access control pretty well. But when you need complex, context-aware authorization decisions that go beyond source identity and HTTP method matching, Open Policy Agent (OPA) steps in. OPA lets you write authorization policies in Rego, a purpose-built policy language that can evaluate any combination of request attributes, external data, and custom logic.

## How OPA Works with Istio

The integration works through Istio's external authorization feature. When a request arrives at the Envoy sidecar, Envoy sends an authorization check to OPA before forwarding the request to your application. OPA evaluates the request against your Rego policies and returns an allow or deny decision.

The flow looks like this:

```text
Client -> Envoy Sidecar -> External Authz (OPA) -> Application
```

## Deploying OPA

Deploy OPA as a sidecar alongside your application or as a standalone service. The standalone service approach is simpler and lets multiple services share the same OPA instance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  namespace: opa-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: opa
  template:
    metadata:
      labels:
        app: opa
    spec:
      containers:
      - name: opa
        image: openpolicyagent/opa:latest
        args:
        - "run"
        - "--server"
        - "--addr=0.0.0.0:8181"
        - "--set=plugins.envoy_ext_authz_grpc.addr=0.0.0.0:9191"
        - "--set=plugins.envoy_ext_authz_grpc.path=istio/authz/allow"
        - "--set=decision_logs.console=true"
        - "/policies"
        ports:
        - containerPort: 8181
          name: http
        - containerPort: 9191
          name: grpc
        volumeMounts:
        - name: policies
          mountPath: /policies
      volumes:
      - name: policies
        configMap:
          name: opa-policies
---
apiVersion: v1
kind: Service
metadata:
  name: opa
  namespace: opa-system
spec:
  selector:
    app: opa
  ports:
  - port: 9191
    name: grpc
    targetPort: 9191
  - port: 8181
    name: http
    targetPort: 8181
```

The key argument here is `plugins.envoy_ext_authz_grpc` which enables the Envoy external authorization gRPC plugin. This is how Envoy communicates with OPA.

## Configuring Istio's External Authorization

Tell Istio to use OPA as an external authorization provider. Add it to the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: opa-ext-authz
      envoyExtAuthzGrpc:
        service: opa.opa-system.svc.cluster.local
        port: 9191
```

If Istio is already running, update the istio ConfigMap:

```bash
kubectl edit configmap istio -n istio-system
```

Then create an AuthorizationPolicy that delegates to OPA:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: opa-authz
  namespace: default
spec:
  action: CUSTOM
  provider:
    name: opa-ext-authz
  rules:
  - to:
    - operation:
        paths: ["/api/*"]
```

This policy sends all requests matching `/api/*` to OPA for evaluation. Requests to other paths are not affected.

## Writing Rego Policies

Now the fun part - writing the actual policies. Rego is a declarative language designed for policy decisions. Create a ConfigMap with your policies:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-policies
  namespace: opa-system
data:
  policy.rego: |
    package istio.authz

    import rego.v1

    default allow := false

    # Allow GET requests to public endpoints
    allow if {
      input.attributes.request.http.method == "GET"
      startswith(input.attributes.request.http.path, "/api/public")
    }

    # Allow requests with valid JWT claims
    allow if {
      token := input.attributes.request.http.headers.authorization
      startswith(token, "Bearer ")
      jwt := substring(token, 7, -1)
      payload := io.jwt.decode(jwt)[1]
      payload.role == "admin"
    }

    # Allow requests from specific service accounts
    allow if {
      input.attributes.source.principal == "cluster.local/ns/frontend/sa/frontend"
      input.attributes.request.http.method == "GET"
    }
```

The `input` object contains the full Envoy external authorization request, which includes:

- `input.attributes.request.http.method` - HTTP method
- `input.attributes.request.http.path` - Request path
- `input.attributes.request.http.headers` - All HTTP headers
- `input.attributes.source.principal` - Source SPIFFE identity (from mTLS)
- `input.attributes.destination.principal` - Destination identity

## More Complex Policy Examples

Here is a policy that implements role-based access control using data from an external source:

```rego
package istio.authz

import rego.v1

default allow := false

# Role permissions mapping
role_permissions := {
  "admin": ["GET", "POST", "PUT", "DELETE"],
  "editor": ["GET", "POST", "PUT"],
  "viewer": ["GET"]
}

allow if {
  token := bearer_token
  payload := io.jwt.decode(token)[1]
  user_role := payload.role
  permitted_methods := role_permissions[user_role]
  input.attributes.request.http.method in permitted_methods
}

bearer_token := t if {
  auth_header := input.attributes.request.http.headers.authorization
  startswith(auth_header, "Bearer ")
  t := substring(auth_header, 7, -1)
}
```

Time-based access control:

```rego
package istio.authz

import rego.v1

default allow := false

# Only allow access during business hours (UTC)
allow if {
  now := time.now_ns()
  hour := time.clock(now)[0]
  hour >= 8
  hour < 18
  day := time.weekday(now)
  day != "Saturday"
  day != "Sunday"
}
```

## Using OPA Bundles

For production, you do not want to store policies in ConfigMaps. OPA supports loading policy bundles from HTTP servers, S3, GCS, or OCI registries:

```yaml
containers:
- name: opa
  image: openpolicyagent/opa:latest
  args:
  - "run"
  - "--server"
  - "--addr=0.0.0.0:8181"
  - "--set=plugins.envoy_ext_authz_grpc.addr=0.0.0.0:9191"
  - "--set=plugins.envoy_ext_authz_grpc.path=istio/authz/allow"
  - "--set=bundles.authz.service=bundle-server"
  - "--set=bundles.authz.resource=authz/bundle.tar.gz"
  - "--set=services.bundle-server.url=https://your-bundle-server.com"
```

## Testing Policies

Test your policies before deploying them. OPA has built-in testing:

```rego
package istio.authz_test

import rego.v1

test_allow_public_get if {
  allow with input as {
    "attributes": {
      "request": {
        "http": {
          "method": "GET",
          "path": "/api/public/health"
        }
      }
    }
  }
}

test_deny_post_without_auth if {
  not allow with input as {
    "attributes": {
      "request": {
        "http": {
          "method": "POST",
          "path": "/api/users",
          "headers": {}
        }
      }
    }
  }
}
```

Run tests:

```bash
opa test /policies -v
```

## Monitoring OPA Decisions

OPA logs every decision when you enable decision logging. Check the logs:

```bash
kubectl logs -n opa-system -l app=opa
```

OPA also exposes Prometheus metrics at `/metrics`. Key metrics to watch are `opa_decision_counter` and `opa_decision_latency`.

The combination of Istio and OPA gives you a powerful policy enforcement layer. Istio handles the plumbing of intercepting requests and routing them to OPA, while OPA provides the flexible policy engine where you can encode any authorization logic you need. The Rego language takes some getting used to, but once you are comfortable with it, you can express policies that would be impossible with Istio's built-in AuthorizationPolicy alone.
