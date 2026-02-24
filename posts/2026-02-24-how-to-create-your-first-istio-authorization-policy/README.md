# How to Create Your First Istio Authorization Policy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, Kubernetes, Service Mesh

Description: A beginner-friendly walkthrough for creating your first Istio AuthorizationPolicy to control traffic between services in your mesh.

---

Authorization policies are how you tell Istio who can talk to what in your service mesh. Without them, every service in the mesh can reach every other service. That's fine for development, but in production you want to lock things down so that only the services that need to communicate actually can.

This post walks you through creating your first AuthorizationPolicy from scratch, explaining every field along the way.

## What is an AuthorizationPolicy?

An AuthorizationPolicy is a Kubernetes custom resource that Istio uses to control access to services. It sits at the Envoy sidecar level, meaning it's enforced before traffic ever reaches your application container.

The basic structure looks like this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-policy
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/client-ns/sa/client-sa"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
```

There are four main parts:

1. **selector** - Which workloads this policy applies to
2. **action** - What to do when a rule matches (ALLOW, DENY, or CUSTOM)
3. **rules** - The conditions that determine if traffic matches
4. **from/to/when** - The specifics of what traffic to match

## Prerequisites

Before you start, make sure you have:

- A running Kubernetes cluster with Istio installed
- At least two services deployed with Istio sidecar injection enabled
- `kubectl` and `istioctl` configured

Let's set up a simple test environment:

```bash
# Create a namespace with Istio injection
kubectl create namespace authz-demo
kubectl label namespace authz-demo istio-injection=enabled

# Deploy a simple httpbin service
kubectl apply -n authz-demo -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/httpbin/httpbin.yaml

# Deploy a sleep pod to use as a client
kubectl apply -n authz-demo -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/sleep/sleep.yaml
```

Verify both pods are running with sidecars:

```bash
kubectl get pods -n authz-demo
```

You should see two containers per pod (the app container and the istio-proxy sidecar).

## Step 1: Verify Baseline Connectivity

Before adding any policies, confirm that the sleep pod can reach httpbin:

```bash
kubectl exec -n authz-demo deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.authz-demo:8000/get
```

This should return `200`. Everything is open by default.

## Step 2: Create a Simple ALLOW Policy

Now create a policy that only allows GET requests to httpbin:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: httpbin-allow-get
  namespace: authz-demo
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET"]
```

Save this as `httpbin-policy.yaml` and apply it:

```bash
kubectl apply -f httpbin-policy.yaml
```

## Step 3: Test the Policy

Now test different HTTP methods:

```bash
# GET should work (200)
kubectl exec -n authz-demo deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.authz-demo:8000/get

# POST should be denied (403)
kubectl exec -n authz-demo deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X POST http://httpbin.authz-demo:8000/post

# PUT should be denied (403)
kubectl exec -n authz-demo deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X PUT http://httpbin.authz-demo:8000/put
```

GET returns 200, while POST and PUT return 403. The policy is working.

## Understanding the Selector

The `selector` field determines which workloads the policy targets. It uses Kubernetes label selectors:

```yaml
spec:
  selector:
    matchLabels:
      app: httpbin
      version: v1
```

If you omit the selector entirely, the policy applies to ALL workloads in the namespace:

```yaml
spec:
  # No selector - applies to everything in this namespace
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["trusted-ns"]
```

If you apply a policy to the root namespace (usually `istio-system`), it becomes a mesh-wide policy.

## Understanding the From Field

The `from` field specifies who can send traffic. It supports several source types:

```yaml
rules:
  - from:
      - source:
          # Identity-based (requires mTLS)
          principals: ["cluster.local/ns/my-ns/sa/my-sa"]

          # Namespace-based
          namespaces: ["frontend", "backend"]

          # IP-based
          ipBlocks: ["10.0.0.0/8"]

          # JWT-based
          requestPrincipals: ["https://auth.example.com/user-123"]
```

Multiple values in a field are OR-ed. Multiple fields in a single source are AND-ed:

```yaml
# Must be from namespace "frontend" AND from service account "web-sa"
- source:
    namespaces: ["frontend"]
    principals: ["cluster.local/ns/frontend/sa/web-sa"]
```

## Understanding the To Field

The `to` field specifies what operations are allowed:

```yaml
rules:
  - to:
      - operation:
          methods: ["GET", "HEAD"]
          paths: ["/api/*", "/health"]
          ports: ["8080"]
          hosts: ["myservice.example.com"]
```

Path matching supports:
- Exact match: `/api/users`
- Prefix match: `/api/*`
- Suffix match: `*/info`

## Step 4: Adding Source Restrictions

Update the policy to only allow traffic from the sleep service account:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: httpbin-allow-sleep
  namespace: authz-demo
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/authz-demo/sa/sleep"]
      to:
        - operation:
            methods: ["GET"]
```

Apply it:

```bash
kubectl apply -f httpbin-policy.yaml
```

Now only the sleep service (identified by its service account) can send GET requests to httpbin. Any other service in the mesh would be denied.

## Step 5: Verify Source Restriction

If you have another service in the mesh, it should be denied:

```bash
# From sleep pod - should work
kubectl exec -n authz-demo deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin.authz-demo:8000/get

# From any other pod without the sleep service account - should return 403
```

## Common Patterns

Here are a few patterns you'll use regularly.

**Allow internal traffic only:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: internal-only
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["my-app", "shared-services"]
```

**Allow specific paths publicly, restrict the rest:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: public-paths
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    # Public endpoints
    - to:
        - operation:
            paths: ["/health", "/metrics"]
    # Authenticated endpoints
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/*"]
```

## Debugging Your Policy

When your policy isn't behaving as expected:

```bash
# Check if the policy was accepted
kubectl get authorizationpolicy -n authz-demo

# Run Istio analysis for configuration errors
istioctl analyze -n authz-demo

# Check Envoy logs for RBAC decisions
kubectl logs -n authz-demo deploy/httpbin -c istio-proxy | grep rbac

# Inspect the Envoy config
istioctl proxy-config listener deploy/httpbin -n authz-demo
```

The most common first-policy mistake is forgetting that once you add an ALLOW policy, everything that doesn't match is automatically denied. If you add an ALLOW policy that only covers GET requests, all POST, PUT, DELETE, and other methods are implicitly denied.

## Cleaning Up

When you're done experimenting:

```bash
kubectl delete namespace authz-demo
```

That removes everything - the pods, services, and authorization policies.

Creating your first AuthorizationPolicy is a small step, but it opens up a whole world of access control possibilities. Start simple with method and path restrictions, then gradually add source identity checks as you get more comfortable with how the policies interact.
