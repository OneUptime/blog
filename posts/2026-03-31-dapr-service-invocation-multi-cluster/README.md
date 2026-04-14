# How to Use Dapr Service Invocation in a Multi-Cluster Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Cluster, Kubernetes, Service Invocation, Federation

Description: Learn how to configure Dapr service invocation across multiple Kubernetes clusters using Dapr's cluster-federation capabilities and external name resolution.

---

## Multi-Cluster Service Invocation Challenges

Dapr's default name resolution uses kube-dns, which only resolves services within a single Kubernetes cluster. To invoke services across clusters, you need an additional mechanism to bridge service discovery.

## Approach 1: Using External DNS

Configure external DNS so services in each cluster are reachable by DNS name:

```yaml
# HTTPEndpoint component pointing to cluster B service
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: cluster-b-order-service
spec:
  baseUrl: https://order-service.cluster-b.internal.example.com
  headers:
    - name: Authorization
      secretKeyRef:
        name: cluster-b-auth
        key: token
```

Then invoke it:

```bash
curl http://localhost:3500/v1.0/invoke/cluster-b-order-service/method/orders
```

## Approach 2: Using a Service Mesh Federation

If you use Istio or Linkerd for multi-cluster federation, Dapr works alongside the mesh:

```yaml
# ServiceEntry in Istio to import remote service
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cluster-b-orders
spec:
  hosts:
    - order-service.cluster-b.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: order-service.cluster-b.example.com
```

After registering the service entry, invoke normally using the FQDN as the app target via HTTPEndpoint.

## Approach 3: Dapr with Consul Multi-Datacenter

Consul supports multi-datacenter service discovery natively:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: consul
    configuration:
      client:
        address: consul-server.consul.svc.cluster.local:8500
      queryOptions:
        datacenter: cluster-b
```

Then invoke:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Consul resolves `order-service` in the `cluster-b` datacenter.

## Security Considerations

Cross-cluster traffic requires:

```bash
# Exchange trust bundles between clusters
kubectl get secret dapr-trust-bundle -n dapr-system -o yaml > cluster-a-trust.yaml
# Apply in cluster B
kubectl apply -f cluster-a-trust.yaml -n dapr-system --context cluster-b
```

## Latency and Fallback

Always implement fallback logic for cross-cluster calls due to higher latency:

```javascript
import { HttpMethod } from "@dapr/dapr";

async function getRemoteOrder(id) {
  try {
    return await daprClient.invoker.invoke('cluster-b-order-service', `orders/${id}`, HttpMethod.GET);
  } catch {
    return await localOrderCache.get(id);
  }
}
```

## Summary

Dapr does not natively support multi-cluster service invocation but can be extended using HTTPEndpoint components with external DNS, service mesh federation with Istio or Linkerd, or Consul multi-datacenter name resolution. Always apply mTLS trust bundle exchange and implement fallback logic for cross-cluster call failures.
