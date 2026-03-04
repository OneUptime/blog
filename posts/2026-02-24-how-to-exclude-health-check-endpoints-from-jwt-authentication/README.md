# How to Exclude Health Check Endpoints from JWT Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Authentication, Kubernetes, Health Checks, Security

Description: Learn how to exclude health check and readiness probe endpoints from JWT authentication requirements in Istio service mesh configurations.

---

One of the most common headaches when rolling out JWT authentication across your Istio service mesh is that Kubernetes health checks suddenly start failing. Your liveness and readiness probes return 401 Unauthorized because they don't carry a JWT token. This breaks pod lifecycle management, and suddenly your perfectly healthy pods are getting restarted left and right.

The fix is straightforward once you know where to look. Istio's RequestAuthentication and AuthorizationPolicy resources support excluding specific paths from JWT validation. This post walks through the exact configuration you need.

## Why Health Checks Fail with JWT Auth

When you apply a RequestAuthentication policy that requires JWT tokens, every request hitting your service's sidecar proxy gets checked. Kubernetes sends health check requests from the kubelet to your pod's health check endpoint (usually something like `/healthz` or `/ready`). These requests come from the kubelet directly - they don't carry JWT tokens.

The result: your health probes fail, Kubernetes thinks your pod is unhealthy, and it restarts the pod. This cycle repeats forever.

## The RequestAuthentication Resource

Here's a typical RequestAuthentication that enforces JWT validation:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: require-jwt
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
```

This policy by itself only validates tokens that are present - it doesn't reject requests without tokens. The rejection part comes from the AuthorizationPolicy.

## Adding an AuthorizationPolicy That Excludes Health Paths

The key is in your AuthorizationPolicy. You need to allow unauthenticated access to health check paths while requiring JWT tokens for everything else.

Here's how to do it with two policies - one that allows health checks and one that requires authentication for everything else:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/healthz"
              - "/ready"
              - "/livez"
              - "/startup"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
```

The first policy allows any request to the health check paths without any authentication. The second policy requires a valid JWT (indicated by `requestPrincipals: ["*"]`) for all other paths.

## Understanding How Multiple Policies Interact

Istio evaluates authorization policies in a specific order. When you have multiple ALLOW policies, a request is permitted if it matches ANY of the ALLOW policies. So a request to `/healthz` matches the first policy and gets through, even though it doesn't carry a JWT token.

A request to `/api/data` doesn't match the first policy (wrong path), so it needs to match the second policy. The second policy requires `requestPrincipals: ["*"]`, which means a valid JWT must be present.

## Using notPaths for a Cleaner Approach

If you prefer a single policy, you can use `notPaths` to exclude health check endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-except-health
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
    - to:
        - operation:
            paths:
              - "/healthz"
              - "/ready"
              - "/livez"
```

Since rules are OR-ed together, this policy allows a request if it either has a valid JWT OR targets one of the health check paths.

## Handling Wildcard Health Check Paths

Some applications use path prefixes for health checks, like `/health/*` or `/actuator/health`. Istio supports prefix and suffix matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-prefix
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/health*"
              - "/actuator/*"
```

The `*` wildcard matches any suffix. So `/health`, `/healthz`, `/health/live`, and `/health/ready` all match `/health*`.

## Kubelet Probes and the Sidecar

There's an important nuance here. By default, Istio rewrites kubelet health check probes so they go through the sidecar. This is controlled by the `sidecar.istio.io/rewriteAppHTTPProbers` annotation, which defaults to `true` in most Istio installations.

When this rewrite is active, health probes go through the Envoy sidecar on port 15020, and then Envoy forwards them to your application. This means your authorization policies apply to these probes.

You can verify this behavior:

```bash
kubectl get pod my-service-pod -o yaml | grep -A 5 "httpGet"
```

If the probe port shows 15020, the rewrite is active and your authorization policies need to account for health checks.

## Alternative: Disable Probe Rewrite

An alternative approach is to disable the probe rewrite entirely for specific workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "false"
    spec:
      containers:
        - name: my-service
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
```

With this annotation set to `false`, kubelet probes bypass the Envoy sidecar entirely and go straight to your application container. This means authorization policies won't affect them at all.

However, this approach has a downside - you lose mTLS on health check probes, and the probes won't be visible in Istio's telemetry. For most production setups, the authorization policy approach is cleaner.

## Testing Your Configuration

After applying your policies, verify that health checks work:

```bash
# Check pod status - should be Running, not CrashLoopBackOff
kubectl get pods -n my-app -l app=my-service

# Check that health endpoint works without a token
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/healthz

# Check that API endpoints require a token
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data

# Check that API endpoints work WITH a valid token
TOKEN=$(curl -s https://your-auth-server/token | jq -r .access_token)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://my-service:8080/api/data
```

The health endpoint should return 200 without a token. The API endpoint should return 403 without a token and 200 with a valid token.

## Namespace-Wide Configuration

If you want to exclude health checks across an entire namespace, apply the policy at the namespace level without a selector:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks-ns
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/healthz"
              - "/ready"
              - "/livez"
              - "/startup"
              - "/health*"
```

This applies to all workloads in the namespace. Combined with a namespace-wide JWT requirement policy, it gives you blanket coverage without needing per-service configurations.

## Common Pitfalls

A few things to watch out for:

1. **Path matching is case-sensitive.** If your app uses `/Healthz` but your policy says `/healthz`, it won't match.

2. **Order of policy application matters.** DENY policies are evaluated before ALLOW policies. If you have a DENY policy that blocks unauthenticated requests, your ALLOW policy for health checks won't help.

3. **Don't forget about startup probes.** Kubernetes 1.18+ supports startup probes in addition to liveness and readiness. Make sure all three probe paths are excluded.

4. **gRPC health checks use different paths.** If your service uses gRPC health checking, the path is typically `/grpc.health.v1.Health/Check`.

Getting health check exclusions right is one of those tasks that seems simple but trips up a lot of teams during their Istio rollout. The two-policy approach (allow health checks explicitly, require JWT for everything else) is the most maintainable pattern for production use.
