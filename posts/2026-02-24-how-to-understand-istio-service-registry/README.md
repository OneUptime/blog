# How to Understand Istio Service Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Registry, Service Discovery, Kubernetes, Networking

Description: A thorough explanation of how Istio's service registry works, where it gets its data from, and how it differs from the standard Kubernetes service discovery.

---

Every service mesh needs to know what services exist and where they are running. In Istio, the service registry is the internal database that tracks all services, their endpoints (pod IPs), and their metadata. Without it, the sidecar proxies would not know where to send traffic.

Understanding the service registry helps you debug issues like "my service is not reachable" or "traffic is going to the wrong pods." It also explains how Istio handles external services and multi-cluster setups.

## Where Does the Service Registry Get Its Data?

Istio does not have its own standalone service registry. Instead, it builds its registry by watching the Kubernetes API server. Specifically, it watches these Kubernetes resources:

- **Services** - Defines the logical service name, namespace, and ports
- **Endpoints** (or EndpointSlices) - Maps Services to actual pod IP addresses
- **Pods** - Provides label and annotation metadata

When you create a Kubernetes Service:

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

Kubernetes automatically creates Endpoints (or EndpointSlices) that list the IP addresses of pods matching the selector. Istiod watches both the Service and the Endpoints, combines them, and adds the result to the service registry.

## Viewing the Service Registry

You can see what istiod knows about your services through the debug endpoint:

```bash
# Port-forward to istiod
kubectl port-forward -n istio-system deploy/istiod 15014:15014

# Query the service registry
curl -s localhost:15014/debug/registryz | python3 -m json.tool | head -60
```

The output shows each service with its hostname, addresses, and ports.

A more practical way is to check what a specific sidecar knows:

```bash
# View all known clusters (services) from a sidecar's perspective
istioctl proxy-config clusters deploy/my-app -n default
```

Output:

```
SERVICE FQDN                                PORT   SUBSET   DIRECTION    TYPE
kubernetes.default.svc.cluster.local        443    -        outbound     EDS
payment-service.default.svc.cluster.local   8080   -        outbound     EDS
order-service.default.svc.cluster.local     8080   -        outbound     EDS
```

And the endpoints behind each service:

```bash
istioctl proxy-config endpoints deploy/my-app -n default \
    --cluster "outbound|8080||payment-service.default.svc.cluster.local"
```

```
ENDPOINT            STATUS   OUTLIER CHECK   CLUSTER
10.244.1.5:8080     HEALTHY  OK              outbound|8080||payment-service...
10.244.2.8:8080     HEALTHY  OK              outbound|8080||payment-service...
10.244.3.12:8080    HEALTHY  OK              outbound|8080||payment-service...
```

## How the Registry Updates

The service registry is dynamic. When pods come and go, the registry updates automatically:

1. A new pod matching the `app: payment` label starts up
2. Kubernetes adds the pod's IP to the Endpoints for `payment-service`
3. Istiod detects the change via its Kubernetes watch
4. Istiod generates new EDS (Endpoint Discovery Service) configuration
5. Istiod pushes the update to all relevant sidecars
6. Sidecars start routing traffic to the new endpoint

This process typically takes 1-3 seconds, depending on cluster size and configuration push latency.

## Service Entry: Adding External Services

By default, the registry only contains Kubernetes services. But what about external services like a third-party API or a database running outside the cluster?

Istio uses ServiceEntry resources to register external services in the registry:

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
```

After applying this, `api.example.com` appears in the service registry and sidecars can route traffic to it with full observability and policy enforcement.

For services with static IPs:

```yaml
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
  - address: 192.168.1.101
```

## Mesh-Internal vs Mesh-External

The `location` field in ServiceEntry is important:

- `MESH_EXTERNAL` - The service is outside the mesh. mTLS is not applied. Sidecars route traffic to it but do not expect an Istio sidecar on the other side.
- `MESH_INTERNAL` - The service is inside the mesh. mTLS is applied. Used for services that should be treated like any other mesh service.

## The PassthroughCluster

By default, when a sidecar receives a request for a service that is not in the registry, it passes the request through unchanged. This is handled by the `PassthroughCluster`:

```bash
istioctl proxy-config clusters deploy/my-app -n default | grep Passthrough
# PassthroughCluster   -   -   -   ORIGINAL_DST
```

This means your services can still reach unknown external endpoints. But you lose observability and policy enforcement for those connections.

You can change this behavior to block all traffic to unregistered services:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

With `REGISTRY_ONLY`, any request to a service not in the registry will fail. You need to explicitly add ServiceEntry resources for every external dependency.

```bash
# Verify the outbound policy
istioctl proxy-config clusters deploy/my-app -n default | grep BlackHole
# BlackHoleCluster   -   -   -   STATIC
```

When `REGISTRY_ONLY` is active, the BlackHoleCluster replaces the PassthroughCluster, and traffic to unknown destinations gets dropped.

## Service Registry and Namespaces

The service registry is global across the cluster. Every sidecar (by default) knows about every service in every namespace. This is why a pod in the `frontend` namespace can call a service in the `backend` namespace without any special configuration.

The fully qualified service name follows this pattern:

```
<service-name>.<namespace>.svc.cluster.local
```

So `payment-service` in the `default` namespace is:

```
payment-service.default.svc.cluster.local
```

## Limiting Registry Visibility

For large meshes, having every sidecar know about every service wastes memory and increases configuration push times. Use the Sidecar resource to limit visibility:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
  - hosts:
    - "frontend/*"
    - "backend/*"
    - "istio-system/*"
```

This tells all sidecars in the `frontend` namespace to only receive registry information for services in `frontend`, `backend`, and `istio-system`. Services in other namespaces will not be in their registry.

## Multi-Cluster Service Registry

In multi-cluster Istio setups, the service registry spans multiple clusters. Each istiod instance connects to the API servers of all clusters and merges their service information.

Set up remote cluster access:

```bash
istioctl create-remote-secret --name=cluster-2 | kubectl apply -f - --context=cluster-1
```

After this, services in cluster-2 appear in the service registry of cluster-1, and sidecars can route traffic to pods in either cluster.

## Debugging Registry Issues

When a service is not reachable, check the registry:

```bash
# Check if the service exists in the registry
istioctl proxy-config clusters deploy/my-app -n default | grep payment-service

# Check if endpoints are healthy
istioctl proxy-config endpoints deploy/my-app -n default | grep payment-service

# Check for any configuration issues
istioctl analyze -n default
```

If a service shows up in clusters but has no endpoints, check:

```bash
# Are there pods matching the Service selector?
kubectl get endpoints payment-service -n default

# Is the pod running and ready?
kubectl get pods -l app=payment -n default
```

The service registry is the foundation of how Istio routes traffic. Every VirtualService, DestinationRule, and AuthorizationPolicy ultimately operates on services that exist in this registry. Knowing how the registry is populated, how it handles external services, and how to debug it gives you a solid foundation for troubleshooting any routing issue in your mesh.
