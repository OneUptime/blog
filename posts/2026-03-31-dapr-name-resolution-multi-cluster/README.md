# How to Configure Name Resolution for Multi-Cluster Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Cluster, Name Resolution, Service Discovery, Kubernetes

Description: Learn how to configure Dapr name resolution to enable service invocation across multiple Kubernetes clusters using DNS federation, Consul, or service mesh integration.

---

## The Multi-Cluster Name Resolution Challenge

By default, Dapr's Kubernetes name resolution only resolves services within the same cluster. When you need services in different clusters to invoke each other, you need to set up cross-cluster service discovery. The main approaches are:

1. DNS federation (cross-cluster DNS)
2. HashiCorp Consul with WAN federation
3. Service mesh integration (Istio, Linkerd)
4. Gateway-based routing

## Approach 1: Kubernetes DNS Federation

Configure CoreDNS to forward queries for a specific domain to another cluster's DNS server:

```yaml
# Cluster 1 CoreDNS ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 30
    }
    cluster2.local:53 {
        forward . 10.1.0.10:53
    }
```

Then configure the Dapr name resolution in Cluster 1 to resolve services in the second cluster using a custom template:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: cross-cluster-config
spec:
  nameResolution:
    component: "kubernetes"
    configuration:
      template: "{{"{{"}} .ID {{"}}"}}-dapr.{{"{{"}} .Namespace {{"}}"}}.svc.cluster2.local:{{"{{"}} .Port {{"}}"}}"
```

Invoke a service in Cluster 2:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Note: With this configuration, all service invocations resolve to Cluster 2. For bidirectional communication, each cluster needs its own Configuration pointing to the other cluster's domain.

## Approach 2: Consul WAN Federation

Deploy Consul in both clusters and enable WAN federation:

```bash
# Cluster 1 - Primary datacenter
helm install consul hashicorp/consul \
  --set server.replicas=3 \
  --set server.extraConfig='{"datacenter":"dc1","primary_datacenter":"dc1"}'

# Cluster 2 - Secondary datacenter
helm install consul hashicorp/consul \
  --set server.replicas=3 \
  --set server.extraConfig='{"datacenter":"dc2","primary_datacenter":"dc1","retry_join_wan":["consul-server.dc1.example.com"]}'
```

Configure the Dapr Consul name resolution with WAN awareness:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: consul-cross-dc-config
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
        address: "consul.default.svc.cluster.local:8500"
        datacenter: "dc1"
      queryOptions:
        datacenter: "dc2"
```

## Approach 3: Service Mesh with External Endpoints

Using Istio's ServiceEntry, expose services from one cluster to another:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cluster2-order-service
spec:
  hosts:
    - order-service.cluster2.internal
  ports:
    - number: 3500
      name: http
      protocol: HTTP
  location: MESH_EXTERNAL
  resolution: DNS
  endpoints:
    - address: order-service.cluster2.internal
```

Configure NameFormat to route to the mesh endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: mesh-cross-cluster-config
spec:
  nameResolution:
    component: "nameformat"
    configuration:
      format: "{appid}.cluster2.internal"
```

## Testing Cross-Cluster Resolution

Test from a pod in Cluster 1:

```bash
kubectl exec -it test-pod -- \
  curl http://localhost:3500/v1.0/invoke/order-service/method/health
```

Check logs for resolution details:

```bash
kubectl logs test-pod -c daprd | grep -i resolve
```

## Latency Considerations

Cross-cluster calls add network latency. Use Dapr resiliency policies to handle timeouts:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: cross-cluster-resiliency
spec:
  policies:
    timeouts:
      cross-cluster-timeout: 5s
    retries:
      cross-cluster-retry:
        policy: exponential
        maxRetries: 3
  targets:
    apps:
      order-service:
        timeout: cross-cluster-timeout
        retry: cross-cluster-retry
```

## Summary

Multi-cluster Dapr name resolution requires additional infrastructure beyond the default Kubernetes DNS component. DNS federation via CoreDNS is simple but limited to same-network clusters. Consul WAN federation works across clouds. Service mesh integration provides the most flexibility. Always add resiliency policies for cross-cluster calls to handle increased latency and failure rates.
