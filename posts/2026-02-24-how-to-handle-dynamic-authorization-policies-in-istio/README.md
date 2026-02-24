# How to Handle Dynamic Authorization Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dynamic Authorization, Security, External Authorization, Kubernetes

Description: How to implement dynamic authorization policies in Istio that can change at runtime based on external data, feature flags, and real-time conditions.

---

Static authorization policies work fine when your access control rules don't change often. But in many real-world systems, authorization needs to be dynamic. Maybe you need to revoke access immediately when a security incident is detected. Or you want to toggle access based on feature flags. Or your authorization rules come from an external policy engine that updates independently of your Kubernetes manifests.

Istio supports dynamic authorization through several mechanisms: external authorization providers, frequently updated policies via GitOps, and CUSTOM action policies that delegate decisions to external services. Each approach gives you different levels of dynamism and complexity.

## Understanding the Challenge

Standard Istio AuthorizationPolicies are Kubernetes resources. Changing them requires a kubectl apply or a GitOps sync. That's fine for rules that change occasionally, but it's too slow when you need:

- Instant revocation (block a compromised service account immediately)
- Feature flag integration (enable/disable access based on runtime flags)
- Rate-dependent access (allow access only when rate limits aren't exceeded)
- Context-dependent rules (different behavior based on current system state)

## Approach 1: External Authorization for Real-Time Decisions

The most flexible approach is external authorization. Your custom service makes the decision for every request, checking whatever dynamic data it needs.

First, register the external provider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: dynamic-authz
      envoyExtAuthzGrpc:
        service: dynamic-authz.istio-system.svc.cluster.local
        port: 9001
        timeout: 500ms
```

Apply the CUSTOM policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dynamic-check
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: CUSTOM
  provider:
    name: dynamic-authz
  rules:
  - to:
    - operation:
        paths: ["/api/*"]
```

Now deploy the dynamic authorization service. Here's a Go implementation that checks a Redis-backed blocklist and feature flags:

```go
package main

import (
    "context"
    "log"
    "net"
    "os"
    "strings"

    "github.com/redis/go-redis/v9"
    "google.golang.org/grpc"

    core "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
    auth "github.com/envoyproxy/go-control-plane/envoy/service/auth/v3"
    envoy_type "github.com/envoyproxy/go-control-plane/envoy/type/v3"
    "google.golang.org/genproto/googleapis/rpc/status"
    "google.golang.org/grpc/codes"
)

type server struct {
    rdb *redis.Client
}

func (s *server) Check(ctx context.Context, req *auth.CheckRequest) (*auth.CheckResponse, error) {
    attrs := req.Attributes
    source := attrs.Source
    httpReq := attrs.Request.Http

    // Get source identity
    principal := ""
    if source != nil {
        principal = source.Principal
    }

    // Check blocklist
    blocked, err := s.rdb.SIsMember(ctx, "blocked_principals", principal).Result()
    if err == nil && blocked {
        return denied("Access revoked for this service"), nil
    }

    // Check feature flags
    path := httpReq.Path
    if strings.HasPrefix(path, "/api/v2/") {
        enabled, err := s.rdb.Get(ctx, "feature:api_v2_enabled").Result()
        if err != nil || enabled != "true" {
            return denied("API v2 is currently disabled"), nil
        }
    }

    // Check rate limits
    key := "rate:" + principal
    count, _ := s.rdb.Incr(ctx, key).Result()
    if count == 1 {
        s.rdb.Expire(ctx, key, 60) // 1 minute window
    }
    if count > 100 { // 100 requests per minute
        return denied("Rate limit exceeded"), nil
    }

    return allowed(), nil
}

func denied(msg string) *auth.CheckResponse {
    return &auth.CheckResponse{
        Status: &status.Status{Code: int32(codes.PermissionDenied)},
        HttpResponse: &auth.CheckResponse_DeniedResponse{
            DeniedResponse: &auth.DeniedHttpResponse{
                Status: &envoy_type.HttpStatus{Code: 403},
                Body:   msg,
            },
        },
    }
}

func allowed() *auth.CheckResponse {
    return &auth.CheckResponse{
        Status: &status.Status{Code: int32(codes.OK)},
        HttpResponse: &auth.CheckResponse_OkResponse{
            OkResponse: &auth.OkHttpResponse{
                Headers: []*core.HeaderValueOption{
                    {Header: &core.HeaderValue{Key: "x-authz-checked", Value: "true"}},
                },
            },
        },
    }
}

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_ADDR"),
    })

    lis, err := net.Listen("tcp", ":9001")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    s := grpc.NewServer()
    auth.RegisterAuthorizationServer(s, &server{rdb: rdb})

    log.Println("Starting dynamic authz server on :9001")
    s.Serve(lis)
}
```

With this setup, you can dynamically:

- Block a service: `redis-cli SADD blocked_principals "cluster.local/ns/default/sa/compromised-app"`
- Unblock a service: `redis-cli SREM blocked_principals "cluster.local/ns/default/sa/compromised-app"`
- Toggle features: `redis-cli SET feature:api_v2_enabled true`
- Adjust rate limits: Change the limit constant or make it configurable per-principal

## Approach 2: Policy Controller Pattern

Build a Kubernetes controller that watches external sources and generates AuthorizationPolicies dynamically:

```yaml
# ConfigMap that drives policy generation
apiVersion: v1
kind: ConfigMap
metadata:
  name: access-rules
  namespace: backend
data:
  rules.json: |
    {
      "services": {
        "api-server": {
          "allowed_callers": [
            {"namespace": "frontend", "sa": "web-app", "methods": ["GET"]},
            {"namespace": "admin", "sa": "admin-service", "methods": ["GET", "POST", "PUT", "DELETE"]}
          ],
          "blocked_callers": [],
          "maintenance_mode": false
        }
      }
    }
```

A controller watches this ConfigMap and generates/updates AuthorizationPolicies:

```bash
#!/bin/bash
# Simple controller script (production would use a proper controller framework)

NAMESPACE="backend"
CONFIGMAP="access-rules"

while true; do
    # Get the current rules
    RULES=$(kubectl get configmap $CONFIGMAP -n $NAMESPACE -o jsonpath='{.data.rules\.json}')

    # Parse and generate policies
    echo "$RULES" | python3 -c "
import json, sys, yaml

rules = json.load(sys.stdin)
for service, config in rules['services'].items():
    policy = {
        'apiVersion': 'security.istio.io/v1',
        'kind': 'AuthorizationPolicy',
        'metadata': {
            'name': f'{service}-dynamic-policy',
            'namespace': '$NAMESPACE'
        },
        'spec': {
            'selector': {'matchLabels': {'app': service}},
            'action': 'ALLOW',
            'rules': []
        }
    }

    if config.get('maintenance_mode'):
        # In maintenance mode, only allow admin
        policy['spec']['rules'] = [{
            'from': [{'source': {'namespaces': ['admin']}}]
        }]
    else:
        for caller in config['allowed_callers']:
            rule = {
                'from': [{'source': {
                    'namespaces': [caller['namespace']],
                    'principals': [f\"cluster.local/ns/{caller['namespace']}/sa/{caller['sa']}\"]
                }}],
                'to': [{'operation': {'methods': caller['methods']}}]
            }
            policy['spec']['rules'].append(rule)

    print('---')
    print(yaml.dump(policy, default_flow_style=False))
" | kubectl apply -f -

    sleep 30  # Check every 30 seconds
done
```

## Approach 3: OPA/Gatekeeper Integration

Open Policy Agent (OPA) provides a policy engine that Istio can use for dynamic authorization:

Deploy OPA as an external authorizer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa-authz
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: opa-authz
  template:
    metadata:
      labels:
        app: opa-authz
    spec:
      containers:
      - name: opa
        image: openpolicyagent/opa:latest
        args:
        - "run"
        - "--server"
        - "--addr=:8181"
        - "--set=decision_logs.console=true"
        ports:
        - containerPort: 8181
        volumeMounts:
        - name: policy
          mountPath: /policies
      volumes:
      - name: policy
        configMap:
          name: opa-policies
```

Define your OPA policy in Rego:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-policies
  namespace: istio-system
data:
  policy.rego: |
    package istio.authz

    default allow = false

    # Allow if source is in trusted namespace
    allow {
        input.attributes.source.namespace == "frontend"
        input.attributes.request.http.method == "GET"
    }

    # Allow admin access
    allow {
        input.attributes.source.namespace == "admin"
    }

    # Dynamic: check feature flags from external data
    allow {
        data.features[input.attributes.request.http.path].enabled == true
    }
```

OPA policies can be updated at runtime by pushing new bundles to the OPA server, making this a truly dynamic solution.

## Handling Latency Concerns

External authorization adds latency to every request. To minimize impact:

1. Set aggressive timeouts:
```yaml
envoyExtAuthzGrpc:
  timeout: 200ms
  failOpen: false  # Set to true if you'd rather fail open than block on authz failure
```

2. Cache decisions when possible:
```yaml
envoyExtAuthzGrpc:
  statusOnError: 403  # Return 403 if the authz service is down
```

3. Keep the external service close to the mesh (same cluster, ideally same namespace).

4. Use connection pooling and keep-alive connections to reduce overhead.

## Emergency Kill Switch

For security incidents, you might need to block all external traffic immediately. Keep a DENY-all policy ready:

```bash
# Emergency: block all external traffic
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: emergency-lockdown
  namespace: backend
spec:
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["backend", "admin"]
EOF
```

Remove it when the incident is resolved:

```bash
kubectl delete authorizationpolicy emergency-lockdown -n backend
```

Dynamic authorization is powerful but adds complexity. Use static policies where you can and add dynamic authorization only for the cases where runtime decisions are truly necessary. The external authorization pattern gives you the most flexibility, while the policy controller pattern keeps things closer to the standard Kubernetes workflow.
