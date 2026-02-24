# How to Migrate from Consul Connect to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Consul Connect, Migration, Service Mesh, Kubernetes

Description: A practical guide to migrating from HashiCorp Consul Connect service mesh to Istio including service discovery, intention conversion, and proxy swap.

---

HashiCorp Consul Connect is a service mesh that started in the VM world and later added Kubernetes support. If you're running Consul Connect on Kubernetes and want to switch to Istio, maybe because you want deeper Kubernetes integration, richer traffic management, or because Consul's licensing changes affected your plans, this guide covers the migration process.

The migration is more involved than switching between Kubernetes-native meshes because Consul has its own service catalog, configuration system, and proxy infrastructure. You need to map Consul's concepts to Istio equivalents and carefully transition your services.

## Concept Mapping

| Consul Connect | Istio |
|---|---|
| Service registry | Kubernetes Service (native) |
| Intentions (allow/deny) | AuthorizationPolicy |
| Envoy sidecar (via connect-inject) | Envoy sidecar (via istio-injection) |
| Service defaults | DestinationRule |
| Service router | VirtualService |
| Service splitter | VirtualService (weights) |
| Service resolver | DestinationRule (subsets) |
| Proxy defaults | MeshConfig / EnvoyFilter |
| Mesh gateway | Istio ingress/egress gateway |
| TLS (built-in CA) | mTLS (Istio CA / istiod) |
| Consul KV | N/A (use ConfigMaps) |
| Health checks | Kubernetes probes |

## Step 1: Inventory Your Consul Configuration

Export your current Consul configuration:

```bash
# List all services registered in Consul
consul catalog services

# Get service configuration
consul config read -kind service-defaults -name order-service
consul config read -kind service-router -name order-service
consul config read -kind service-splitter -name order-service
consul config read -kind service-resolver -name order-service

# List all intentions
consul intention list

# Export proxy defaults
consul config read -kind proxy-defaults -name global
```

Save everything to files for reference during the migration.

## Step 2: Install Istio

Install Istio alongside Consul Connect. Both can coexist temporarily:

```bash
istioctl install --set profile=default
```

Configure Istio with PERMISSIVE mTLS initially:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

## Step 3: Convert Intentions to AuthorizationPolicies

Consul Connect uses intentions to control which services can communicate. These map directly to Istio's AuthorizationPolicy.

Consul intention (allow frontend to order-service):

```bash
consul intention create frontend order-service
```

Or in Consul's CRD format:

```yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: order-service
spec:
  destination:
    name: order-service
  sources:
  - name: frontend
    action: allow
  - name: admin-dashboard
    action: allow
    permissions:
    - http:
        pathPrefix: /api/admin
        methods:
        - GET
```

Istio equivalent:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/default/sa/frontend
  - from:
    - source:
        principals:
        - cluster.local/ns/default/sa/admin-dashboard
    to:
    - operation:
        methods:
        - GET
        paths:
        - /api/admin*
```

If Consul has a default-deny intention:

```bash
consul intention create -deny '*' '*'
```

Create an Istio default-deny policy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  {}
```

## Step 4: Convert Service Routers and Splitters

Consul's service router handles path-based and header-based routing.

Consul service-router:

```hcl
Kind = "service-router"
Name = "api-service"
Routes = [
  {
    Match {
      HTTP {
        PathPrefix = "/api/v2"
      }
    }
    Destination {
      Service = "api-service"
      ServiceSubset = "v2"
    }
  },
  {
    Match {
      HTTP {
        PathPrefix = "/api"
      }
    }
    Destination {
      Service = "api-service"
      ServiceSubset = "v1"
    }
  }
]
```

Consul service-splitter:

```hcl
Kind = "service-splitter"
Name = "api-service"
Splits = [
  {
    Weight = 90
    ServiceSubset = "v1"
  },
  {
    Weight = 10
    ServiceSubset = "v2"
  }
]
```

Consul service-resolver:

```hcl
Kind = "service-resolver"
Name = "api-service"
Subsets = {
  v1 = {
    Filter = "Service.Meta.version == v1"
  }
  v2 = {
    Filter = "Service.Meta.version == v2"
  }
}
```

Istio equivalent (combining all three):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service-vs
  namespace: default
spec:
  hosts:
  - api-service
  http:
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: api-service
        subset: v2
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        subset: v1
      weight: 90
    - destination:
        host: api-service
        subset: v2
      weight: 10
```

Note that Consul uses service metadata for subset filtering while Istio uses pod labels. Make sure your deployments have the right labels:

```yaml
template:
  metadata:
    labels:
      app: api-service
      version: v1  # or v2
```

## Step 5: Convert Service Defaults

Consul service-defaults handle connection timeouts, protocol, and upstream configuration.

Consul:

```hcl
Kind = "service-defaults"
Name = "api-service"
Protocol = "http"
MeshGateway {
  Mode = "local"
}
UpstreamConfig {
  Defaults {
    ConnectTimeoutMs = 5000
  }
}
```

Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-defaults
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
```

Protocol detection in Istio happens through Service port naming (e.g., `http-web`, `grpc-api`), not through explicit protocol configuration.

## Step 6: Migrate Services

Migrate one namespace at a time. The process for each namespace:

```bash
# 1. Disable Consul Connect injection
kubectl annotate namespace target-namespace consul.hashicorp.com/connect-inject-

# 2. Enable Istio injection
kubectl label namespace target-namespace istio-injection=enabled

# 3. Apply Istio resources (VirtualService, DestinationRule, AuthorizationPolicy)
kubectl apply -f istio-configs/target-namespace/

# 4. Restart deployments to swap sidecars
kubectl rollout restart deployment -n target-namespace

# 5. Wait for rollout
kubectl rollout status deployment --all -n target-namespace

# 6. Verify pods have 2/2 containers (app + istio-proxy)
kubectl get pods -n target-namespace
```

## Step 7: Handle Cross-Mesh Communication

During migration, Consul-meshed and Istio-meshed services need to communicate. Since both are in permissive mode, connections work but without mutual TLS between the meshes.

Verify cross-mesh connectivity:

```bash
# From an Istio pod, call a Consul-meshed service
kubectl exec -it deploy/frontend -n istio-ns -- \
  curl http://order-service.consul-ns:8080/health
```

If Consul uses transparent proxy, traffic is intercepted by the Consul sidecar. After swapping to Istio, the Envoy sidecar handles it instead. The application code doesn't change.

## Step 8: Deregister from Consul

After all services in a namespace are on Istio, deregister them from Consul:

```bash
# Remove Consul service registrations
consul services deregister -id=<service-id>
```

Or if using Consul's Kubernetes integration, just removing the Consul annotations and restarting pods should handle deregistration.

## Step 9: Complete Migration

After all namespaces are migrated:

```bash
# Switch Istio to STRICT mTLS
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF

# Uninstall Consul
helm uninstall consul -n consul
kubectl delete namespace consul

# Remove Consul CRDs
kubectl get crd | grep consul | awk '{print $1}' | xargs kubectl delete crd
```

## Key Differences to Watch For

**Service discovery**: Consul has its own service catalog separate from Kubernetes Services. Istio uses Kubernetes Services natively. Make sure all your services have proper Kubernetes Service definitions.

**Health checking**: Consul has its own health check system. After migrating to Istio, rely on Kubernetes readiness and liveness probes for health checking.

**KV store**: If your services use Consul KV for configuration, you'll need an alternative (Kubernetes ConfigMaps, etcd, or a dedicated config service).

**DNS**: Consul provides its own DNS (service.consul). Istio uses Kubernetes DNS (service.namespace.svc.cluster.local). Update any hardcoded DNS names in your application configuration.

**Upstream configuration**: Consul's upstream annotations on pods define which services a pod can connect to. Istio's Sidecar resource provides similar functionality for limiting service visibility.

The migration from Consul Connect to Istio requires attention to the differences in service discovery and configuration. The proxy swap itself is straightforward since both use Envoy under the hood. Take your time converting intentions to authorization policies and testing cross-mesh communication during the transition period.
