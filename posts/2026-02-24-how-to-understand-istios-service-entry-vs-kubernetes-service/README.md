# How to Understand Istio's Service Entry vs Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Kubernetes Service, Networking, Service Mesh

Description: A clear comparison of Istio ServiceEntry and Kubernetes Service, explaining when to use each one and how they work together in a service mesh.

---

Kubernetes Service and Istio ServiceEntry both register services that your applications can call. But they serve different purposes and work at different levels. Confusing the two leads to misconfigurations that are hard to debug. Here is a clear breakdown of what each one does and when you should use which.

## Kubernetes Service: The Foundation

A Kubernetes Service is the standard way to expose a set of pods as a network service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: default
spec:
  selector:
    app: payment
  ports:
  - port: 8080
    targetPort: 8080
    name: http
```

What it does:
- Creates a DNS entry (`payment-service.default.svc.cluster.local`)
- Assigns a virtual IP (ClusterIP) like `10.96.10.20`
- Creates Endpoints that map the ClusterIP to actual pod IPs
- kube-proxy sets up iptables/IPVS rules for load balancing

Kubernetes Service only works for workloads running inside the cluster that are managed by Kubernetes.

## Istio ServiceEntry: Extending the Registry

An Istio ServiceEntry registers a service in Istio's service registry. Its primary use case is making external services (things running outside the cluster) known to the mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-api
spec:
  hosts:
  - api.stripe.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

What it does:
- Adds the service to Istio's service registry
- Configures Envoy sidecars to recognize traffic to this host
- Enables Istio features (metrics, routing, policies) for the external service
- Does NOT create Kubernetes Endpoints or ClusterIP

## Key Differences

### Scope

**Kubernetes Service** registers workloads running inside the Kubernetes cluster as pods.

**ServiceEntry** can register anything - external APIs, databases running on VMs, services in other clusters, or even internal services that you want to customize in Istio's registry.

### Who Creates Endpoints

**Kubernetes Service** - Kubernetes automatically creates and maintains Endpoints based on the pod selector. When pods scale up or down, Endpoints update automatically.

**ServiceEntry** - You specify endpoints yourself (for STATIC resolution) or Istio resolves them via DNS. There is no pod selector.

```yaml
# ServiceEntry with static endpoints
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: legacy-database
spec:
  hosts:
  - legacy-db.internal
  location: MESH_EXTERNAL
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 192.168.1.100
    ports:
      tcp-postgres: 5432
  - address: 192.168.1.101
    ports:
      tcp-postgres: 5432
```

### DNS Behavior

**Kubernetes Service** creates a real DNS entry in CoreDNS. Any pod in the cluster can resolve it.

**ServiceEntry** does NOT create a DNS entry in CoreDNS (unless you use Istio DNS proxy). The host resolution is handled by the Envoy sidecar. Non-mesh pods cannot resolve ServiceEntry hosts.

```yaml
# This ServiceEntry host is only resolvable by mesh pods
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: internal-vm
spec:
  hosts:
  - my-vm-service.internal
  location: MESH_INTERNAL
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: STATIC
  endpoints:
  - address: 10.0.5.20
```

Pods with sidecars can call `http://my-vm-service.internal:8080`. Pods without sidecars cannot.

### mTLS Behavior

**Kubernetes Service** - When Istio is enabled, mTLS is automatically applied between mesh services backed by Kubernetes Services.

**ServiceEntry with MESH_EXTERNAL** - mTLS is NOT applied. The sidecar routes traffic to the external endpoint as-is (or with TLS origination if configured).

**ServiceEntry with MESH_INTERNAL** - mTLS IS applied. The sidecar treats the endpoint as part of the mesh and expects the other side to present a valid mesh certificate.

### Traffic Policy Application

Both Kubernetes Service and ServiceEntry can have VirtualService and DestinationRule applied to them. The difference is how the destination is referenced:

```yaml
# VirtualService for a Kubernetes Service
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-routes
spec:
  hosts:
  - payment-service  # Kubernetes Service name
  http:
  - timeout: 5s
    route:
    - destination:
        host: payment-service
```

```yaml
# VirtualService for a ServiceEntry
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: stripe-routes
spec:
  hosts:
  - api.stripe.com  # ServiceEntry host
  http:
  - timeout: 10s
    route:
    - destination:
        host: api.stripe.com
```

## When to Use Which

### Use Kubernetes Service when:

- The workload runs as pods inside your cluster
- You want automatic endpoint management via pod selectors
- You want DNS resolution available to all pods (mesh and non-mesh)
- You are running a standard Kubernetes application

### Use ServiceEntry when:

- The service runs outside the cluster (external API, VM, database)
- You want to bring an external service into Istio's observability
- You need to apply Istio routing policies to external traffic
- You are integrating VMs into the mesh
- You want to control the outbound traffic policy (with REGISTRY_ONLY mode)

## Common Patterns

### Pattern 1: External API with Circuit Breaking

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-dr
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

### Pattern 2: VM Workload as Part of the Mesh

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: vm-payment
spec:
  hosts:
  - vm-payment.default.svc.cluster.local
  location: MESH_INTERNAL
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: STATIC
  endpoints:
  - address: 10.0.5.20
    labels:
      app: payment
      version: v1
```

### Pattern 3: TLS Origination for External Service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-https
spec:
  hosts:
  - external.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-tls
spec:
  host: external.example.com
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 80
      tls:
        mode: SIMPLE
```

This lets your app call `http://external.example.com:80` and the sidecar upgrades it to HTTPS.

## Overlap and Coexistence

A Kubernetes Service and a ServiceEntry can coexist for the same hostname. When they do, the Kubernetes Service takes precedence for endpoint resolution, but the ServiceEntry can add additional endpoints or configuration.

This is used in multi-cluster setups where you want to add remote cluster endpoints to a service that also has local pods:

```yaml
# Local service (created by Kubernetes)
apiVersion: v1
kind: Service
metadata:
  name: payment
spec:
  selector:
    app: payment
  ports:
  - port: 8080

---
# Remote endpoints (ServiceEntry)
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-remote
spec:
  hosts:
  - payment.default.svc.cluster.local
  location: MESH_INTERNAL
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: STATIC
  endpoints:
  - address: 10.1.5.20  # Pod in remote cluster
    labels:
      app: payment
```

The distinction between Kubernetes Service and Istio ServiceEntry comes down to where the workload runs and what manages its endpoints. Kubernetes Service handles in-cluster pods with automatic endpoint tracking. ServiceEntry handles everything else. Use them together to build a service registry that covers your entire infrastructure, not just what runs in Kubernetes.
