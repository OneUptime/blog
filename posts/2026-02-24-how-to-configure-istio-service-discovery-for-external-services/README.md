# How to Configure Istio Service Discovery for External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, External Services, Kubernetes, ServiceEntry

Description: How to configure Istio's service discovery mechanisms for external services that live outside your Kubernetes cluster and service mesh.

---

Istio's service discovery is built around Kubernetes services by default, but real-world applications rarely talk only to things inside the cluster. Your services probably call cloud APIs, third-party SaaS platforms, databases running on VMs, or legacy systems that predate your Kubernetes adoption. Getting Istio's service discovery to handle these external services properly gives you observability, traffic management, and security controls over all your dependencies, not just the internal ones.

## How Istio Service Discovery Works

Istio maintains a service registry that the control plane (istiod) pushes to every sidecar proxy. This registry is built from multiple sources:

- Kubernetes Services and Endpoints
- ServiceEntry resources
- WorkloadEntry resources (for VMs)
- Multicluster service discovery

When a sidecar needs to route traffic, it looks up the destination in this registry. If the destination is known, the sidecar applies all configured policies (routing rules, mTLS, circuit breaking, etc.). If the destination is unknown, the behavior depends on the outbound traffic policy.

## The Outbound Traffic Policy

Before configuring external service discovery, you need to understand your mesh's outbound traffic policy:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep outbound
```

With `ALLOW_ANY`, unknown destinations are passed through to the original IP. Traffic still goes through the sidecar, but without Istio-level observability or policy.

With `REGISTRY_ONLY`, unknown destinations are blocked. This is more secure but requires you to register every external service.

## Registering External Services with ServiceEntry

The primary way to add external services to Istio's service discovery is ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: default
spec:
  hosts:
  - s3.amazonaws.com
  - "*.s3.amazonaws.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

This registers AWS S3 as a known service. Now every sidecar in the mesh knows about it and can:
- Report traffic metrics for S3 calls
- Apply circuit breaking and retry policies
- Enforce access control

## Resolution Strategies Explained

The `resolution` field tells Istio how to discover endpoints for the service:

### DNS Resolution
```yaml
spec:
  hosts:
  - api.example.com
  resolution: DNS
```
The sidecar resolves the hostname via DNS and uses the returned IP addresses as endpoints. DNS results are cached based on TTL. Good for: cloud services, APIs behind load balancers.

### Static Resolution
```yaml
spec:
  hosts:
  - legacy-database.internal
  resolution: STATIC
  endpoints:
  - address: 10.0.1.50
    ports:
      mysql: 3306
```
You provide the IP addresses directly. No DNS lookup happens. Good for: known infrastructure with stable IPs, like on-prem databases.

### None (Passthrough)
```yaml
spec:
  hosts:
  - "*.partner-apis.com"
  resolution: NONE
```
The sidecar uses whatever IP the application resolved. Good for: wildcard entries, transparent proxying.

## Discovering External TCP Services

HTTP services are easy because the Host header tells Envoy where the traffic should go. TCP is trickier because there's no hostname in the protocol. For TCP services, you need either a unique IP per service or DNS proxy with auto-allocation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: external-postgres
  namespace: default
spec:
  hosts:
  - external-postgres.internal
  addresses:
  - 240.240.0.1/32
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.0.5.100
    ports:
      tcp-postgres: 5432
```

The `addresses` field assigns a virtual IP (VIP) to this service. Applications connect to the VIP, and Envoy routes to the real endpoint. Alternatively, enable `ISTIO_META_DNS_AUTO_ALLOCATE` and let Istio assign VIPs automatically.

## Using WorkloadEntry for VM Integration

For external services running on VMs that you want to integrate more deeply into the mesh, use WorkloadEntry combined with a Kubernetes Service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: WorkloadEntry
metadata:
  name: legacy-app-vm1
  namespace: default
spec:
  address: 10.0.10.50
  labels:
    app: legacy-app
    version: v1
---
apiVersion: networking.istio.io/v1alpha3
kind: WorkloadEntry
metadata:
  name: legacy-app-vm2
  namespace: default
spec:
  address: 10.0.10.51
  labels:
    app: legacy-app
    version: v1
---
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  namespace: default
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: legacy-app
```

WorkloadEntry makes the VMs look like Kubernetes pods to the rest of the mesh. They show up in service discovery, get health checked, and can participate in traffic splitting.

## Configuring Health Checks for External Services

You can add outlier detection to external services so unhealthy endpoints get removed from the rotation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: external-api-resilience
  namespace: default
spec:
  host: api.external-service.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 10
```

## Service Discovery Scope

By default, every sidecar gets the full service registry, which includes all Kubernetes services and all ServiceEntries. In a large mesh, this can be a lot of configuration data. Use the Sidecar resource to limit what each workload sees:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: team-a-sidecar
  namespace: team-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
```

This sidecar only discovers services in its own namespace, istio-system, and the shared-services namespace. This reduces memory and CPU usage on the sidecar and speeds up configuration updates.

## Verifying Service Discovery

Check what services a specific proxy knows about:

```bash
istioctl proxy-config cluster deploy/my-app
```

For a specific external service:

```bash
istioctl proxy-config cluster deploy/my-app | grep external-service
```

Check the endpoints:

```bash
istioctl proxy-config endpoint deploy/my-app | grep external-service
```

If a service doesn't show up, it's either not registered (missing ServiceEntry) or filtered out by a Sidecar resource.

## Monitoring External Service Discovery

Istio generates metrics for all discovered services, including external ones:

```bash
# Check if traffic is being tracked
istioctl proxy-config stats deploy/my-app | grep external-service
```

In Prometheus, look for metrics like:
- `istio_requests_total{destination_service="api.external-service.com"}`
- `istio_tcp_connections_opened_total{destination_service="legacy-database.internal"}`

These metrics only appear for services that are in the service registry. If you're running with `ALLOW_ANY` and haven't registered an external service, you'll see its traffic lumped into the `PassthroughCluster` metrics.

Configuring service discovery for external services is one of those tasks that pays dividends over time. The initial setup takes some effort, but having full visibility and control over all your service dependencies, both internal and external, is well worth it.
