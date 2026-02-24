# How to Implement Service Discovery Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Kubernetes, Envoy, Microservices

Description: How Istio handles service discovery and how to configure it for services inside and outside the mesh including ServiceEntry and WorkloadEntry.

---

Service discovery is how services find each other in a distributed system. In plain Kubernetes, kube-dns resolves service names to ClusterIP addresses. With Istio, service discovery gets more sophisticated. The control plane maintains a registry of all services and their endpoints, pushing this information to every Envoy sidecar so it can route traffic intelligently.

## How Istio Service Discovery Works

Istio's service discovery builds on top of Kubernetes service discovery but adds several layers:

1. **istiod watches the Kubernetes API** for Services, Endpoints, and Pods
2. **istiod aggregates this information** into a service registry
3. **istiod pushes the registry** to all Envoy sidecars via the EDS (Endpoint Discovery Service) protocol
4. **Envoy sidecars use this information** to route traffic directly to pod IPs (bypassing kube-proxy)

The big difference from vanilla Kubernetes: Envoy sends traffic directly to pod IPs, not through the ClusterIP virtual IP. This gives Istio the ability to do intelligent load balancing, circuit breaking, and other traffic management features at the individual endpoint level.

You can see what services a sidecar knows about:

```bash
istioctl proxy-config clusters deploy/my-app -n default
```

And what endpoints it has for each service:

```bash
istioctl proxy-config endpoints deploy/my-app -n default
```

## Mesh-Internal Service Discovery

For services that are already running in Kubernetes with Istio sidecars injected, service discovery works automatically. You do not need to configure anything special.

When you create a Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

Istio automatically:
- Discovers this service and its endpoints
- Creates an Envoy cluster for it
- Pushes the endpoint list to all sidecars in the mesh
- Sets up the appropriate listeners and routes

Your application just calls `http://my-service:8080` and Envoy handles the rest.

## Registering External Services with ServiceEntry

For services outside the mesh (external APIs, databases, third-party services), you need to tell Istio about them using a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

This tells Istio that `api.external-service.com` is a service outside the mesh. Envoy will resolve it via DNS and can apply traffic policies (retries, timeouts, circuit breaking) to requests going to this external service.

### Static IP Resolution

For services with known IP addresses:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-db
spec:
  hosts:
  - external-db.company.internal
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
  - address: 10.0.0.100
    ports:
      tcp-postgres: 5432
  - address: 10.0.0.101
    ports:
      tcp-postgres: 5432
```

This registers an external database with specific IP addresses. Envoy will load balance across these endpoints just like it does for in-mesh services.

### DNS Resolution Types

The `resolution` field controls how Envoy resolves the hostname:

- **NONE**: Use the original destination IP from the request. Good for passthrough traffic.
- **STATIC**: Use the IP addresses specified in the `endpoints` field. No DNS lookup.
- **DNS**: Look up the hostname via DNS and use the resolved IP addresses. New connections use fresh DNS results.
- **DNS_ROUND_ROBIN**: Similar to DNS but round-robins across all resolved IPs.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: cdn-service
spec:
  hosts:
  - cdn.mycompany.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS_ROUND_ROBIN
```

## Registering VM Workloads with WorkloadEntry

If you have services running on VMs (not in Kubernetes), you can register them with WorkloadEntry to include them in the mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: vm-backend-1
  namespace: default
spec:
  address: 192.168.1.100
  labels:
    app: backend
    version: v1
  serviceAccount: backend-sa
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: vm-backend-2
  namespace: default
spec:
  address: 192.168.1.101
  labels:
    app: backend
    version: v1
  serviceAccount: backend-sa
```

Then create a Service that selects these workloads:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

The Service will select both Kubernetes pods and VM workloads that match the labels. Traffic will be load balanced across all endpoints.

## WorkloadGroup for VM Auto-Registration

For larger VM deployments, WorkloadGroup lets VMs register themselves automatically when they join the mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: backend-vms
  namespace: default
spec:
  metadata:
    labels:
      app: backend
      version: v1
  template:
    serviceAccount: backend-sa
    network: vm-network
  probe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10
```

When a VM with the Istio proxy starts and connects to istiod, it automatically registers as a WorkloadEntry under this group.

## Controlling What Gets Discovered

By default, every sidecar in the mesh receives the full service registry. In large meshes, this can be a lot of data. Use the Sidecar resource to control what each workload can see:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: my-namespace
spec:
  workloadSelector:
    labels:
      app: my-app
  egress:
  - hosts:
    - "./service-a.my-namespace.svc.cluster.local"
    - "./service-b.my-namespace.svc.cluster.local"
    - "istio-system/*"
    - "*/external-api.com"
```

This sidecar only knows about service-a, service-b, everything in istio-system, and the external-api ServiceEntry. It will not receive configuration for any other service in the mesh.

## Mesh-Wide Outbound Traffic Policy

You can control what happens when a sidecar receives a request for an unknown destination (one not in the service registry):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

- **ALLOW_ANY** (default): Traffic to unknown destinations is allowed and passes through without Istio traffic management.
- **REGISTRY_ONLY**: Traffic to unknown destinations is blocked. Only services in the registry (Kubernetes services + ServiceEntries) can be reached.

Using `REGISTRY_ONLY` forces you to explicitly register all external services, which gives you better visibility and control:

```bash
# Check what mode is currently active
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

## Debugging Service Discovery

When a service cannot be found, check these things:

```bash
# Check if the service exists in the sidecar's config
istioctl proxy-config clusters deploy/my-app -n default --fqdn service-b.default.svc.cluster.local

# Check if endpoints are populated
istioctl proxy-config endpoints deploy/my-app --cluster "outbound|8080||service-b.default.svc.cluster.local"

# Check if the proxy is in sync
istioctl proxy-status

# Look for push errors
kubectl logs deploy/istiod -n istio-system | grep -i "error\|push"
```

If the cluster exists but has no endpoints, the service either has no healthy pods or there is a label mismatch between the service selector and the pod labels.

If the cluster does not exist at all, the service might be in a namespace that the Sidecar resource does not include, or the service might not be a proper Kubernetes Service.

## Health Checking in Service Discovery

Istio uses Kubernetes readiness probes for health checking. If a pod fails its readiness probe, Kubernetes removes it from the endpoint list, and istiod propagates that change to all sidecars.

You can also use Envoy's outlier detection for additional health checking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
```

This removes endpoints from the load balancing pool based on error responses, even if Kubernetes still considers them ready.

Service discovery in Istio is largely automatic for in-mesh services, but understanding how it works helps you debug issues and configure it for external services. ServiceEntry is the key tool for bringing external services into the mesh, Sidecar resources control the scope of discovery per workload, and the outbound traffic policy gives you a security boundary for unknown destinations.
