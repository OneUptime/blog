# How to Set Up Cross-Cluster DNS Resolution for Multi-Cluster Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, DNS, Service Discovery, Networking

Description: Learn how to configure DNS resolution across multiple Kubernetes clusters to enable seamless service discovery and communication in multi-cluster environments.

---

Managing multiple Kubernetes clusters brings unique challenges, especially when services need to communicate across cluster boundaries. DNS resolution becomes critical in these scenarios because each cluster operates its own DNS namespace. Setting up cross-cluster DNS resolution allows services in one cluster to discover and connect to services in another cluster using familiar DNS names.

In this guide, you'll learn how to configure cross-cluster DNS resolution using popular tools and patterns, enabling your multi-cluster architecture to function as a cohesive distributed system.

## Understanding the Challenge

By default, Kubernetes DNS (CoreDNS) only resolves service names within its own cluster. When you have services running across multiple clusters, you face several problems:

- Services cannot resolve DNS names from other clusters
- Hard-coded IP addresses create brittle configurations
- Service discovery mechanisms don't span cluster boundaries
- Application code needs cluster-specific configurations

Cross-cluster DNS resolution solves these issues by extending DNS queries across cluster boundaries, allowing services to use standard DNS names regardless of which cluster hosts the target service.

## Approach 1: CoreDNS Forwarding

The simplest approach involves configuring CoreDNS in each cluster to forward specific DNS queries to other clusters. This works well for smaller multi-cluster setups with stable cluster configurations.

First, identify the CoreDNS service endpoints in each cluster:

```bash
# In cluster-1
kubectl get svc -n kube-system kube-dns -o wide

# Note the ClusterIP, let's say it's 10.96.0.10
```

Create a ConfigMap to extend CoreDNS configuration in cluster-2:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  cluster1.server: |
    # Forward queries for cluster-1 services
    cluster1.local:53 {
      errors
      cache 30
      forward . 10.244.0.5 {
        force_tcp
      }
    }
```

This configuration tells CoreDNS in cluster-2 to forward any queries for `*.cluster1.local` to the specified IP address. You'll need VPN or direct network connectivity between clusters for this to work.

Apply the configuration:

```bash
kubectl apply -f coredns-custom.yaml
kubectl rollout restart deployment/coredns -n kube-system
```

Now services in cluster-2 can resolve services in cluster-1:

```bash
# From a pod in cluster-2
nslookup myservice.default.svc.cluster1.local
```

## Approach 2: Using ExternalDNS with Multi-Cluster Support

ExternalDNS can synchronize Kubernetes services to external DNS providers, making them resolvable from any cluster that can reach that DNS provider.

Install ExternalDNS in each cluster with cloud DNS integration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: external-dns
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
        image: registry.k8s.io/external-dns/external-dns:v0.14.0
        args:
        - --source=service
        - --source=ingress
        - --domain-filter=multi.example.com  # Restrict to specific domain
        - --provider=aws  # Or google, azure, etc.
        - --policy=sync
        - --registry=txt
        - --txt-owner-id=cluster-1  # Unique per cluster
```

Annotate services that should be externally resolvable:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: payment.multi.example.com
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: payment
```

ExternalDNS creates DNS records in your cloud provider, making the service resolvable from any cluster:

```bash
# From any cluster
curl http://payment.multi.example.com
```

## Approach 3: Submariner for Service Discovery

Submariner provides automated cross-cluster connectivity and service discovery without requiring external DNS infrastructure. It creates encrypted tunnels between clusters and synchronizes service endpoints.

Install the Submariner broker in a central location:

```bash
subctl deploy-broker --kubeconfig cluster-1.yaml
```

Join each cluster to the broker:

```bash
# Join cluster-1
subctl join broker-info.subm --kubeconfig cluster-1.yaml \
  --clusterid cluster-1 \
  --natt=false

# Join cluster-2
subctl join broker-info.subm --kubeconfig cluster-2.yaml \
  --clusterid cluster-2 \
  --natt=false
```

Export services that should be visible across clusters:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: payment-service
  namespace: default
```

Services exported from one cluster automatically become available in other clusters with a modified DNS name:

```bash
# From cluster-2, access service from cluster-1
curl http://payment-service.default.svc.clusterset.local
```

The `.clusterset.local` suffix indicates this is a multi-cluster service. Submariner's DNS component handles the resolution and routing.

## Approach 4: Istio Multi-Cluster DNS

If you're using Istio service mesh across multiple clusters, it provides built-in cross-cluster DNS resolution through its control plane.

Configure Istio for multi-cluster with a shared control plane:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
spec:
  values:
    global:
      multiCluster:
        clusterName: cluster-1
      meshID: shared-mesh
      network: network-1
```

Create a ServiceEntry to make remote services discoverable:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-service-remote
spec:
  hosts:
  - payment.default.svc.cluster2.local
  ports:
  - number: 80
    name: http
    protocol: HTTP
  resolution: DNS
  location: MESH_INTERNAL
  endpoints:
  - address: payment.default.svc.cluster.local
    locality: cluster-2/zone-a
    labels:
      cluster: cluster-2
```

With Istio's multi-cluster configuration, services can communicate using standard Kubernetes DNS names, and Istio handles the cross-cluster routing transparently.

## Testing Cross-Cluster DNS

Regardless of which approach you choose, verify DNS resolution works correctly:

```bash
# Deploy a test pod
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash

# Inside the pod, test DNS resolution
nslookup payment-service.default.svc.cluster1.local

# Test actual connectivity
curl http://payment-service.default.svc.cluster1.local/health
```

Monitor CoreDNS logs to troubleshoot resolution issues:

```bash
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50 -f
```

## Best Practices

When implementing cross-cluster DNS, follow these guidelines:

Use consistent naming conventions across clusters to avoid confusion. Consider using cluster identifiers in service names or namespaces.

Implement proper network policies and firewalls. Cross-cluster DNS doesn't provide security; it only enables discovery. You still need to secure the actual communication channels.

Monitor DNS query performance. Cross-cluster resolution adds latency, especially when forwarding through multiple hops. Use caching aggressively to minimize repeated lookups.

Plan for cluster failures. If your DNS resolution depends on a specific cluster being available, you create a single point of failure. Use external DNS providers or distributed solutions like Submariner for better resilience.

Document your DNS architecture clearly. Multi-cluster DNS can become complex quickly, and your team needs to understand which services are local versus remote.

## Conclusion

Cross-cluster DNS resolution removes a major barrier to building distributed applications across multiple Kubernetes clusters. Whether you choose simple CoreDNS forwarding, external DNS synchronization, or comprehensive solutions like Submariner or Istio, the key is matching the complexity of your solution to your actual requirements.

Start with simple forwarding if you have just a few clusters and stable configurations. Move to more sophisticated solutions as your multi-cluster architecture grows and requires better automation, security, and resilience.

With proper cross-cluster DNS configuration, your applications can treat multiple clusters as a unified platform, discovering and connecting to services seamlessly regardless of their physical location.
