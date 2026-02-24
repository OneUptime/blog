# How to Integrate Istio with Open Policy Agent (OPA) for AuthZ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OPA, Authorization, Security, Policy

Description: Step-by-step guide to integrating Open Policy Agent with Istio for fine-grained authorization policies across your service mesh using external authorization.

---

Authorization in a service mesh is one of those things that sounds simple until you try to do it for real. Istio has built-in authorization policies that work fine for basic rules like "service A can call service B." But when you need complex authorization logic based on JWT claims, request body contents, time-of-day rules, or data from external systems, you need something more powerful. That is where Open Policy Agent comes in.

OPA is a general-purpose policy engine that evaluates policies written in Rego, its purpose-built policy language. By integrating OPA with Istio, you get a centralized authorization system that can handle arbitrarily complex rules while keeping your application code clean.

## Architecture Overview

The integration works through Istio's External Authorization feature. Here is the flow:

1. A request arrives at the Envoy sidecar
2. Envoy sends an authorization check to OPA before forwarding the request
3. OPA evaluates the request against your Rego policies
4. OPA returns allow or deny
5. Envoy either forwards the request or returns a 403

You deploy OPA as a sidecar alongside each Envoy proxy, or as a separate service in the cluster. The sidecar approach has lower latency since the authorization check stays local to the pod.

## Deploying OPA

First, deploy OPA as a standalone service that Istio can call for authorization decisions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  namespace: istio-system
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
            - "--set=plugins.envoy_ext_authz_grpc.addr=:9191"
            - "--set=plugins.envoy_ext_authz_grpc.path=istio/authz/allow"
            - "--set=decision_logs.console=true"
            - "/policies"
          ports:
            - containerPort: 8181
              name: http
            - containerPort: 9191
              name: grpc
          volumeMounts:
            - name: policy
              mountPath: /policies
      volumes:
        - name: policy
          configMap:
            name: opa-policy
---
apiVersion: v1
kind: Service
metadata:
  name: opa
  namespace: istio-system
spec:
  selector:
    app: opa
  ports:
    - port: 9191
      targetPort: 9191
      name: grpc
    - port: 8181
      targetPort: 8181
      name: http
```

Note the `envoy_ext_authz_grpc` plugin configuration. This tells OPA to speak the Envoy external authorization gRPC protocol, which is what Istio expects.

## Writing Rego Policies

Create your authorization policies in Rego. Here is a practical policy that handles common authorization scenarios:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-policy
  namespace: istio-system
data:
  policy.rego: |
    package istio.authz

    import input.attributes.request.http as http_request
    import input.attributes.source.principal as source_principal

    default allow = false

    # Allow health checks without authorization
    allow {
      http_request.path == "/healthz"
    }

    allow {
      http_request.path == "/readyz"
    }

    # Allow requests from the frontend to the API
    allow {
      source_principal == "spiffe://cluster.local/ns/default/sa/frontend"
      startswith(http_request.path, "/api/")
      http_request.method == "GET"
    }

    # Allow the order service to call the payment service
    allow {
      source_principal == "spiffe://cluster.local/ns/default/sa/order-service"
      http_request.headers["x-destination-service"] == "payment-service"
      http_request.method == "POST"
      startswith(http_request.path, "/api/v1/payments")
    }

    # Role-based access using JWT claims
    allow {
      token := parse_jwt(http_request.headers.authorization)
      token.payload.role == "admin"
    }

    # Time-based access control
    allow {
      source_principal == "spiffe://cluster.local/ns/default/sa/batch-processor"
      is_business_hours
    }

    is_business_hours {
      now := time.now_ns()
      hour := time.clock(now)[0]
      hour >= 9
      hour < 17
    }

    parse_jwt(auth_header) = token {
      startswith(auth_header, "Bearer ")
      encoded := substring(auth_header, 7, -1)
      parts := split(encoded, ".")
      payload := json.unmarshal(base64url.decode(parts[1]))
      token := {"payload": payload}
    }
```

This single policy file handles multiple authorization scenarios: health check bypass, service-to-service rules, JWT-based RBAC, and time-based access control.

## Configuring Istio External Authorization

Now tell Istio to use OPA for authorization decisions. Add the external authorizer to your mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: opa-authz
        envoyExtAuthzGrpc:
          service: opa.istio-system.svc.cluster.local
          port: "9191"
```

If you are using Helm, add this to your values:

```yaml
meshConfig:
  extensionProviders:
    - name: opa-authz
      envoyExtAuthzGrpc:
        service: opa.istio-system.svc.cluster.local
        port: "9191"
```

## Applying Authorization Policies

With OPA configured as an extension provider, create an Istio AuthorizationPolicy that delegates to OPA:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: opa-authz
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: my-service
  action: CUSTOM
  provider:
    name: opa-authz
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

This policy applies OPA authorization to all requests hitting pods with the label `app: my-service`. You can also apply it mesh-wide by putting it in the `istio-system` namespace without a selector.

For mesh-wide enforcement:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: opa-authz-mesh
  namespace: istio-system
spec:
  action: CUSTOM
  provider:
    name: opa-authz
  rules:
    - to:
        - operation:
            notPaths: ["/healthz", "/readyz"]
```

## Testing the Integration

Deploy a test pod and verify that OPA is making authorization decisions:

```bash
# This should be allowed (health check)
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/healthz

# This should be denied (no matching policy)
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/secret
```

Check OPA decision logs to see what is happening:

```bash
kubectl logs -n istio-system deploy/opa -f | jq '.decision_id, .result'
```

## Managing Policies with OPA Bundles

For production use, storing policies in a ConfigMap is not ideal. OPA supports loading policies from a bundle server, which gives you version control and atomic updates.

Configure OPA to pull policies from a bundle server:

```yaml
containers:
  - name: opa
    image: openpolicyagent/opa:latest
    args:
      - "run"
      - "--server"
      - "--addr=0.0.0.0:8181"
      - "--set=plugins.envoy_ext_authz_grpc.addr=:9191"
      - "--set=plugins.envoy_ext_authz_grpc.path=istio/authz/allow"
      - "--set=services.bundle.url=http://policy-server:8080"
      - "--set=bundles.authz.service=bundle"
      - "--set=bundles.authz.resource=bundle.tar.gz"
      - "--set=bundles.authz.polling.min_delay_seconds=10"
      - "--set=bundles.authz.polling.max_delay_seconds=30"
```

Build and serve your policy bundle:

```bash
# Create bundle from policy files
cd policies/
opa build -b . -o bundle.tar.gz

# Serve it (could be S3, GCS, nginx, or any HTTP server)
python3 -m http.server 8080
```

## Performance Considerations

OPA authorization adds latency to every request. In the sidecar model, expect 1-3ms overhead per request. With the standalone service model, add network latency on top.

To minimize impact:

1. Keep policies simple and avoid deep recursion
2. Use partial evaluation where possible
3. Set appropriate timeouts in the Envoy external authorization configuration

```yaml
extensionProviders:
  - name: opa-authz
    envoyExtAuthzGrpc:
      service: opa.istio-system.svc.cluster.local
      port: "9191"
      timeout: 500ms
      failOpen: false
```

Setting `failOpen: false` means if OPA is unreachable, requests are denied. This is the safer default. Set it to `true` only if availability is more important than security for your use case.

The combination of Istio and OPA gives you a policy-as-code approach to authorization that is flexible enough to handle real-world complexity without polluting your application logic with authorization checks.
