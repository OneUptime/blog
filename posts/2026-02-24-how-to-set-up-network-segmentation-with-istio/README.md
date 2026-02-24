# How to Set Up Network Segmentation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Segmentation, Security, Authorization, Kubernetes

Description: Step-by-step guide to implementing network segmentation in Istio using authorization policies, namespaces, and Sidecar resources.

---

Network segmentation divides your infrastructure into isolated zones so that a breach in one zone doesn't automatically compromise others. Traditionally, this was done with VLANs and firewall rules. In a Kubernetes cluster with Istio, you can achieve the same thing (and more) using authorization policies, namespace boundaries, and Sidecar configurations. The advantage of doing segmentation in Istio is that it operates at Layer 7 - you can segment based on HTTP methods, paths, and headers, not just IP addresses and ports.

## Planning Your Segments

Before writing any YAML, plan your segmentation zones. A typical setup might include:

- **Public zone** - Services exposed to the internet (API gateway, web frontend)
- **Application zone** - Business logic services
- **Data zone** - Databases, caches, message queues
- **Admin zone** - Monitoring, logging, management tools
- **Sensitive zone** - PII handling, payment processing

Map these to Kubernetes namespaces:

```bash
kubectl create namespace public
kubectl create namespace application
kubectl create namespace data
kubectl create namespace admin
kubectl create namespace sensitive

# Label namespaces for Istio injection
kubectl label namespace public istio-injection=enabled
kubectl label namespace application istio-injection=enabled
kubectl label namespace data istio-injection=enabled
kubectl label namespace admin istio-injection=enabled
kubectl label namespace sensitive istio-injection=enabled
```

## Step 1: Default Deny Everywhere

The first step is to deny all traffic by default. Without this, services can communicate freely across namespaces:

```yaml
# Apply to each namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: public
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: application
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: data
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: admin
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: sensitive
spec:
  {}
```

After applying these, all traffic between services is blocked. You'll need to explicitly allow each communication path.

## Step 2: Define Allowed Communication Paths

Now open up only the paths you need. Think of this as a firewall rule set:

### Public Zone Rules

The public zone can receive traffic from the ingress gateway and can talk to the application zone:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-gateway
  namespace: public
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["istio-system"]
```

```yaml
# Allow public services to talk to each other and to the application zone
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-internal-and-app
  namespace: application
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["public", "application"]
```

### Data Zone Rules

The data zone should only be accessible from the application zone, and only on specific ports:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-app-to-data
  namespace: data
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["application"]
      to:
        - operation:
            ports: ["5432", "6379", "27017"]
```

### Sensitive Zone Rules

The sensitive zone gets the tightest restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: sensitive-access
  namespace: sensitive
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/application/sa/payment-service"
              - "cluster.local/ns/application/sa/user-account-service"
      to:
        - operation:
            methods: ["GET", "POST"]
```

### Admin Zone Rules

The admin zone can read from other zones for monitoring, but nothing can write to it except the admin gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-access
  namespace: admin
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["istio-system"]
    - from:
        - source:
            namespaces: ["admin"]
```

## Step 3: Limit Service Discovery with Sidecar

Authorization policies block unauthorized traffic, but by default every Envoy sidecar still knows about every service in the mesh. This increases memory usage and provides unnecessary information to a compromised workload.

Use the Sidecar resource to limit what each namespace can see:

```yaml
# Public namespace can only see application services and its own services
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: public
spec:
  egress:
    - hosts:
        - "./*"
        - "application/*"
        - "istio-system/*"
---
# Application namespace can see data and sensitive services
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: application
spec:
  egress:
    - hosts:
        - "./*"
        - "data/*"
        - "sensitive/*"
        - "istio-system/*"
---
# Data namespace only sees its own services
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: data
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This reduces the attack surface and improves performance by reducing the configuration size sent to each proxy.

## Step 4: Enforce mTLS

Network segmentation isn't complete without encryption. Ensure all cross-segment traffic is encrypted:

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

With STRICT mTLS, even if network policies are misconfigured, an attacker can't eavesdrop on cross-segment traffic.

## Step 5: Add Layer 7 Segmentation

Istio's advantage over traditional network segmentation is Layer 7 awareness. You can segment based on HTTP attributes:

```yaml
# Only allow GET requests to the data zone (no writes from certain services)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: read-only-from-analytics
  namespace: data
spec:
  selector:
    matchLabels:
      app: primary-database
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/application/sa/analytics-service"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/query*"]
    - from:
        - source:
            principals:
              - "cluster.local/ns/application/sa/backend-api"
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
```

The analytics service can only read data, while the backend API has full access. This is much more granular than port-based firewall rules.

## Step 6: Combine with Kubernetes Network Policies

For defense in depth, combine Istio authorization with Kubernetes NetworkPolicies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-zone-network-policy
  namespace: data
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              zone: application
      ports:
        - port: 5432
          protocol: TCP
        - port: 6379
          protocol: TCP
```

NetworkPolicies enforce at Layer 3/4 in the CNI, while Istio enforces at Layer 7 in the proxy. If an attacker somehow bypasses Istio (e.g., by exploiting a vulnerability in the sidecar), the NetworkPolicy still blocks unauthorized traffic.

## Verifying Segmentation

After setting up segmentation, verify it works:

```bash
# Test that blocked traffic is actually blocked
kubectl exec -n public deploy/frontend -- curl -s -o /dev/null -w "%{http_code}" http://primary-database.data:5432
# Should return 403 or connection refused

# Test that allowed traffic works
kubectl exec -n application deploy/backend-api -- curl -s -o /dev/null -w "%{http_code}" http://primary-database.data:5432/health
# Should return 200

# Check for any overly permissive policies
istioctl analyze -A
```

Run a comprehensive segmentation test:

```bash
#!/bin/bash
# Test matrix: try to reach each zone from each zone
ZONES="public application data admin sensitive"
for src in $ZONES; do
  for dst in $ZONES; do
    if [ "$src" != "$dst" ]; then
      result=$(kubectl exec -n $src deploy/test-pod -- \
        curl -s -o /dev/null -w "%{http_code}" \
        http://test-service.$dst:8080/health 2>/dev/null)
      echo "$src -> $dst: HTTP $result"
    fi
  done
done
```

## Monitoring Segmentation

Track authorization policy decisions:

```bash
# Check for denied requests
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep rbac

# Denied requests show as 403s
kubectl logs -n application my-pod -c istio-proxy | grep "403"
```

Set up Grafana dashboards showing traffic flow between zones. Unexpected traffic patterns indicate either a misconfiguration or a potential security issue.

Network segmentation with Istio gives you fine-grained control over service communication. Start with default deny, open only what's needed, limit service discovery, and add Layer 7 rules for precision. Combined with Kubernetes NetworkPolicies for defense in depth, you get a segmentation model that's both more flexible and more secure than traditional network firewalls.
