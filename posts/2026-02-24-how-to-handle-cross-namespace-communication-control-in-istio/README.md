# How to Handle Cross-Namespace Communication Control in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Namespace, Authorization, Service Mesh

Description: Practical techniques for managing and controlling cross-namespace service communication in Istio using authorization policies and sidecar configurations.

---

When you have services spread across multiple Kubernetes namespaces, controlling which namespaces can communicate with each other becomes essential. Maybe your organization uses namespaces to separate teams, environments, or application tiers. Whatever the reason, you need a way to enforce boundaries while still allowing the legitimate cross-namespace calls your application depends on.

## The Default Behavior

Without any Istio policies, every service can call any other service across any namespace. A pod in the `team-alpha` namespace can freely hit services in `team-beta`, `production`, or even `kube-system`. Istio doesn't change this by default. You need to explicitly create policies to restrict cross-namespace traffic.

## Mapping Your Cross-Namespace Dependencies

Before locking things down, figure out what your actual cross-namespace communication patterns look like. If you have Istio metrics flowing to Prometheus, run this query:

```
sum(rate(istio_requests_total{reporter="destination"}[1h])) by (source_workload_namespace, destination_workload_namespace) > 0
```

This gives you a namespace-to-namespace communication matrix. You'll see things like:

- `frontend` -> `backend`
- `backend` -> `database`
- `monitoring` -> everywhere
- `istio-system` -> everywhere (for control plane)

Document these dependencies. They'll form the basis of your policies.

## Setting Up Namespace Labels

Istio authorization policies can reference namespaces directly, but it's also useful to label your namespaces for organizational purposes:

```bash
kubectl label namespace frontend tier=frontend
kubectl label namespace backend tier=backend
kubectl label namespace database tier=data
kubectl label namespace monitoring role=monitoring
```

These labels can be used in Kubernetes NetworkPolicy (for Layer 3/4 control) to complement your Istio policies.

## Implementing Cross-Namespace Controls

Start by applying a default-deny policy in namespaces that need protection:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: database
spec:
  {}
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: backend
spec:
  {}
```

Now create targeted allow rules for each legitimate cross-namespace path.

Allow the `frontend` namespace to call `backend`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
```

Allow the `backend` namespace to reach the `database` namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend
  namespace: database
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["backend"]
```

Allow intra-namespace traffic in each namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-same-namespace
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["backend"]
```

## Handling Monitoring and Observability

Monitoring tools need cross-namespace access to scrape metrics, collect traces, and pull logs. Create specific policies for your monitoring namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["monitoring"]
    to:
    - operation:
        methods: ["GET"]
        ports: ["15090", "9090", "8080"]
        paths: ["/metrics", "/stats/prometheus"]
```

Apply a similar policy in each namespace that Prometheus needs to scrape.

## Granular Cross-Namespace Rules

Sometimes namespace-level allow rules are too broad. You might want the `frontend` namespace to call only specific services in the `backend` namespace, not everything:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api-only
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
```

The `selector` field scopes this policy to only the `api-gateway` workload. Other services in the `backend` namespace remain unreachable from `frontend`.

For even more precision, combine namespace and service account restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-caller
  namespace: backend
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
        - "cluster.local/ns/frontend/sa/mobile-bff"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/users/*"]
```

## Using Sidecar Resources for Visibility Control

AuthorizationPolicy controls who can call your service. The Sidecar resource controls what your service can see. This is equally important for cross-namespace communication.

By default, every Envoy proxy gets configuration for every service in the mesh. This means every pod "knows about" services in every namespace. You can restrict this with Sidecar resources:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: frontend-sidecar
  namespace: frontend
spec:
  egress:
  - hosts:
    - "./*"
    - "backend/api-gateway.backend.svc.cluster.local"
    - "istio-system/*"
```

This tells pods in the `frontend` namespace that they can only reach services in their own namespace, the api-gateway in the backend namespace, and services in istio-system. Even if someone tries to call a database service from the frontend, the proxy won't have a route for it.

This also has a performance benefit. With fewer services in the proxy configuration, memory usage and config push times go down.

## Handling Shared Services

Many clusters have shared services that need to be accessible from multiple namespaces. Things like logging sidecars, service meshes, or shared authentication services. Create a dedicated shared namespace and allow broad access to it:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-to-shared
  namespace: shared-services
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "frontend"
        - "backend"
        - "database"
    to:
    - operation:
        methods: ["GET", "POST"]
```

## Debugging Cross-Namespace Issues

When a cross-namespace call fails, here's how to diagnose it:

Check if the authorization policy is blocking the request:

```bash
kubectl logs deploy/api-gateway -c istio-proxy -n backend | grep "rbac"
```

Look for RBAC access denied messages. They'll tell you which policy blocked the request.

Verify the caller's identity:

```bash
istioctl proxy-config secret deploy/web-app -n frontend
```

Check the proxy configuration to make sure the destination is known:

```bash
istioctl proxy-config endpoint deploy/web-app -n frontend | grep api-gateway
```

If the endpoint isn't listed, a Sidecar resource might be filtering it out.

Run a connectivity test:

```bash
kubectl exec deploy/web-app -n frontend -- curl -v http://api-gateway.backend.svc.cluster.local:8080/health
```

A 403 means Istio authorization blocked it. A connection timeout means either NetworkPolicy or a Sidecar resource is preventing the connection.

## Policy Ordering and Precedence

When you have multiple AuthorizationPolicy resources in the same namespace, the evaluation order matters. Istio evaluates them as follows:

1. If any DENY policy matches, the request is denied
2. If no ALLOW policies exist, the request is allowed
3. If any ALLOW policies exist, the request must match at least one ALLOW rule

This means you can combine allow and deny rules. For instance, allow the entire frontend namespace but deny a specific service account:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-untrusted-frontend
  namespace: backend
spec:
  action: DENY
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/untrusted-service"
```

DENY policies always take precedence over ALLOW policies, so this untrusted service gets blocked even if another policy would allow it based on its namespace.

Cross-namespace communication control is something you should set up early in your Istio deployment. Retrofitting it later, when you have dozens of services with unknown dependencies, is much harder than building it incrementally as your cluster grows.
