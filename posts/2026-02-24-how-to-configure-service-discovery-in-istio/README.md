# How to Configure Service Discovery in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Kubernetes, MeshConfig, Networking

Description: A practical guide to configuring service discovery in Istio covering Kubernetes services, ServiceEntry for external services, and multicluster discovery.

---

Service discovery in Istio is how the mesh knows about all the services that exist and where their endpoints are. When your application calls `orders.default.svc.cluster.local`, the sidecar needs to know that this service exists, what IP addresses its pods have, and what protocol it uses. Istio builds this knowledge from multiple sources and keeps it updated in real time.

## How Istio Discovers Services

Istio automatically discovers services from several sources:

1. **Kubernetes Services**: Istio watches the Kubernetes API server and automatically adds all services and their endpoints to its registry
2. **ServiceEntry resources**: You manually register external services that live outside the mesh
3. **WorkloadEntry resources**: You register VM workloads that are part of the mesh but not running in Kubernetes
4. **Remote cluster API servers**: In multicluster setups, Istiod watches remote clusters for their services

All of these sources feed into a unified service registry that Istiod maintains. This registry is then distributed to all sidecar proxies through the xDS API.

## Kubernetes Service Discovery

For Kubernetes services, discovery is automatic. Any Service object in a namespace that Istiod watches becomes part of the mesh registry:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: default
spec:
  selector:
    app: orders
  ports:
    - name: http-api
      port: 8080
      targetPort: 8080
```

When this Service is created, Istiod:
1. Adds it to the service registry
2. Watches the corresponding Endpoints (or EndpointSlices) for pod IPs
3. Pushes the configuration to all relevant sidecars

You can verify that a service is in the registry:

```bash
istioctl proxy-config clusters deploy/sleep -n sample | grep orders
```

This shows the Envoy clusters (upstream service definitions) configured on the sleep pod's sidecar.

## Controlling Discovery Scope

By default, Istiod watches all namespaces. Use discovery selectors to limit this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-managed: "true"
```

Only namespaces with the label `istio-managed: "true"` will be watched. This reduces Istiod's resource consumption and the amount of configuration pushed to sidecars.

## External Service Discovery with ServiceEntry

Services outside the mesh are not automatically discovered. You register them with ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-api
  namespace: default
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

The `resolution` field controls how Istio resolves the ServiceEntry's endpoints:

### DNS Resolution

```yaml
spec:
  hosts:
    - api.example.com
  resolution: DNS
```

Istio resolves the hostname using DNS and uses the resulting IPs as endpoints. The DNS resolution is refreshed periodically.

### Static Resolution

```yaml
spec:
  hosts:
    - internal-db.example.com
  resolution: STATIC
  endpoints:
    - address: 192.168.1.100
      ports:
        tcp: 5432
    - address: 192.168.1.101
      ports:
        tcp: 5432
```

You provide the IPs explicitly. Use this when you know the exact addresses and they do not change often.

### None Resolution

```yaml
spec:
  hosts:
    - "*.external-service.com"
  resolution: NONE
```

Istio uses the original destination IP from the connection. Use this when the application already resolved the IP (typically for wildcard hosts or when you do not want Istio to do DNS resolution).

## ServiceEntry Visibility

By default, a ServiceEntry is visible to all namespaces. Control visibility with `exportTo`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: team-a-database
  namespace: team-a
spec:
  hosts:
    - db.internal.example.com
  exportTo:
    - "."  # Only visible in the same namespace
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

Options for `exportTo`:
- `"."` - Current namespace only
- `"*"` - All namespaces
- Specific namespace names

## WorkloadEntry for VM Discovery

When you have workloads running on VMs, use WorkloadEntry to register them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: legacy-app-vm
  namespace: default
spec:
  address: 192.168.1.50
  labels:
    app: legacy-app
    version: v1
  serviceAccount: legacy-app-sa
```

Pair it with a Service that selects the WorkloadEntry labels:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  namespace: default
spec:
  ports:
    - name: http
      port: 8080
  selector:
    app: legacy-app
```

The Service's selector matches both Kubernetes pods and WorkloadEntry labels, allowing you to have a mix of pod and VM endpoints behind the same service.

## Multicluster Service Discovery

In multicluster meshes, each Istiod needs access to remote clusters to discover their services. This is done through remote secrets:

```bash
# Give cluster1 access to cluster2's API server
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

When the remote secret is applied, Istiod starts watching the remote cluster's services and endpoints. Services with the same name and namespace across clusters are merged into a single service with endpoints from all clusters.

Verify multicluster discovery:

```bash
# Check endpoints from all clusters
istioctl proxy-config endpoints deploy/sleep -n sample --cluster "outbound|8080||orders.default.svc.cluster.local"
```

The output should show endpoints from both local and remote clusters.

## Debugging Service Discovery Issues

### Service Not Found

If a service is not appearing in the proxy configuration:

```bash
# Check if the service exists in the Istio registry
istioctl proxy-config clusters deploy/sleep -n sample | grep my-service

# If not found, check if the namespace is being watched
kubectl get namespace my-namespace --show-labels | grep istio

# Check Istiod logs for discovery errors
kubectl logs -l app=istiod -n istio-system | grep "my-service"
```

### Stale Endpoints

If endpoints are not updating:

```bash
# Check proxy sync status
istioctl proxy-status

# Check the endpoints on a specific proxy
istioctl proxy-config endpoints deploy/sleep -n sample | grep my-service

# Compare with actual Kubernetes endpoints
kubectl get endpoints my-service -n default
```

### ServiceEntry Not Working

```bash
# Verify the ServiceEntry is created
kubectl get serviceentry -n default

# Check if it appears in the proxy config
istioctl proxy-config clusters deploy/sleep -n sample | grep external-service

# Check for configuration conflicts
istioctl analyze -n default
```

## Service Discovery Performance

For large meshes, optimize service discovery:

1. Use discovery selectors to limit watched namespaces
2. Use Sidecar resources to limit what each proxy sees
3. Avoid creating ServiceEntry resources with wildcard hosts unless necessary (they add entries for every matching hostname)
4. Monitor Istiod memory and CPU - high usage often indicates too many services being processed

```bash
# Check how many services Istiod is tracking
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/debug/registryz | jq length
```

Service discovery is the foundation of everything Istio does. Understand the sources, control the scope, and monitor for issues. A well-configured service discovery setup keeps your mesh fast and your debugging sessions short.
