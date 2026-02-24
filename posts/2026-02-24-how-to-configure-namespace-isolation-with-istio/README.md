# How to Configure Namespace Isolation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Namespace Isolation, Kubernetes, Security, Service Mesh

Description: Learn how to isolate Kubernetes namespaces using Istio authorization policies to prevent unauthorized cross-namespace communication.

---

Namespaces in Kubernetes provide a logical boundary for organizing resources, but they don't provide any network isolation by default. Any pod in any namespace can freely communicate with any other pod across the entire cluster. When you're running multiple teams, environments, or tenants in the same cluster, this is a real problem. Istio gives you the tools to enforce strict namespace isolation at the application layer.

## The Problem with Default Kubernetes Networking

Out of the box, Kubernetes uses a flat network model. Every pod gets an IP address and can reach every other pod directly. Namespaces are just labels for organization. A pod in the `dev` namespace can hit a database in the `production` namespace without any restriction.

This might be fine for a small team running a single application, but once you start sharing clusters across teams or running multiple environments, you need boundaries.

## Setting Up the Foundation

Before you start isolating namespaces, make sure mutual TLS is enabled. This is critical because namespace isolation in Istio relies on cryptographic service identity, not IP addresses.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

With strict mTLS, every service in the mesh gets a SPIFFE identity that includes its namespace. The identity looks like `cluster.local/ns/<namespace>/sa/<service-account>`. This is what Istio uses to enforce namespace boundaries.

## Default Deny per Namespace

The first step in namespace isolation is applying a default-deny policy. Create an `AuthorizationPolicy` with an empty spec in each namespace you want to isolate:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
```

Apply it:

```bash
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}
EOF
```

Repeat for every namespace you want to lock down. After this, no service outside the namespace (or inside it, for that matter) can communicate with any service in that namespace.

## Allowing Intra-Namespace Traffic

Most of the time, services within the same namespace should be able to talk to each other. Add an allow policy that permits traffic from the same namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
  namespace: production
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["production"]
```

Now services within `production` can communicate freely, but everything from outside is still blocked.

## Allowing Specific Cross-Namespace Access

Complete isolation is rarely practical. Your frontend namespace probably needs to call services in the backend namespace. Your monitoring namespace needs to scrape metrics from everywhere. You handle these cases with targeted allow rules.

Here's how to let the `monitoring` namespace scrape metrics from `production`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["monitoring"]
    to:
    - operation:
        ports: ["15090", "9090"]
        methods: ["GET"]
```

And here's how to let a specific frontend service call the API gateway in the backend namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
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

## Isolating Sensitive Namespaces

Some namespaces are more sensitive than others. Your database namespace, secrets management namespace, or PCI-scoped namespace might need tighter controls. For these, you can combine namespace restrictions with service account restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-database-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
        - "cluster.local/ns/backend/sa/user-service"
    to:
    - operation:
        ports: ["5432"]
```

This locks the database down to only two specific service accounts, regardless of what namespace they come from. Even if someone deploys a rogue service in the backend namespace, it won't have access to the database unless it's running under one of those service accounts.

## Handling the Istio System Namespace

One thing that trips people up is the `istio-system` namespace. If you apply a blanket deny-all across all namespaces, you might accidentally block Istio's own control plane traffic. The istiod control plane needs to communicate with sidecar proxies in every namespace.

The good news is that Istio control plane traffic (xDS configuration updates) doesn't flow through the data plane, so authorization policies don't affect it. However, if you're running Istio addons like Kiali, Jaeger, or Prometheus in the `istio-system` namespace, you'll need to create appropriate allow rules for them.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-istio-telemetry
  namespace: production
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["istio-system"]
    to:
    - operation:
        ports: ["15090"]
        methods: ["GET"]
```

## Automating Namespace Isolation

If you have a lot of namespaces, manually creating policies for each one gets tedious. You can use a combination of Helm charts or Kustomize overlays to template your isolation policies.

Here's a Kustomize approach:

```yaml
# base/authorization-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["$(NAMESPACE)"]
```

Then in each namespace overlay, set the namespace:

```yaml
# overlays/production/kustomization.yaml
namespace: production
resources:
- ../../base
```

## Validating Your Isolation

After applying your policies, test them. The simplest way is to exec into a pod and try to reach a service in another namespace:

```bash
kubectl exec -it deploy/test-client -n frontend -- curl -v http://api-gateway.backend.svc.cluster.local:8080/health
```

If your isolation is working, you should get a connection refused or a 403 Forbidden response. If it goes through when it shouldn't, check your policies.

You can also use `istioctl analyze` to look for configuration issues:

```bash
istioctl analyze -n production
```

And check the proxy configuration to verify policies are applied:

```bash
istioctl proxy-config listener deploy/api-gateway -n backend -o json | grep -A 5 "rbac"
```

## Common Pitfalls

A few things that catch people off guard with namespace isolation:

Services that use headless services or StatefulSets sometimes have different communication patterns. Make sure your policies account for pod-to-pod direct communication, not just service-level traffic.

If you're using Istio's sidecar injection, pods without sidecars won't be subject to authorization policies. Make sure all namespaces have sidecar injection enabled, or use `PeerAuthentication` with `STRICT` mode to reject plaintext connections.

Jobs and CronJobs can be tricky because they create short-lived pods. If these pods need cross-namespace access, make sure the service account they run under is included in your allow rules.

Namespace isolation with Istio gives you a strong security boundary without changing your application code. Start with a single namespace, get comfortable with the policy model, and expand from there. The combination of cryptographic identity and Layer 7 policy enforcement makes it far more reliable than IP-based approaches.
