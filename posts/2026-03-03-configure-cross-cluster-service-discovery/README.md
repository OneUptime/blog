# How to Configure Cross-Cluster Service Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Service Discovery, Multi-Cluster, Cilium, CoreDNS

Description: A complete guide to configuring cross-cluster service discovery on Talos Linux so services in one cluster can find and communicate with services in another.

---

When you run multiple Kubernetes clusters on Talos Linux, services in one cluster eventually need to talk to services in another. Maybe your frontend lives in one cluster and your API backend lives in another. Or you have a shared database cluster that multiple application clusters need to reach. Cross-cluster service discovery makes this possible without hardcoding IP addresses or maintaining external DNS records manually.

This guide covers several approaches to cross-cluster service discovery on Talos Linux, from simple DNS-based solutions to full service mesh integrations.

## The Problem

Kubernetes service discovery works beautifully within a single cluster. You create a Service, and every pod in the cluster can reach it by name. But that DNS resolution stops at the cluster boundary. A pod in cluster-a cannot resolve `my-service.default.svc.cluster.local` if that service lives in cluster-b.

You need a mechanism to bridge this gap. The right approach depends on your requirements for latency, security, and operational complexity.

## Option 1: External DNS with Shared DNS Zone

The simplest approach is to use ExternalDNS to publish service endpoints to a shared DNS zone. Each cluster runs ExternalDNS, which watches for Services with specific annotations and creates DNS records.

First, install ExternalDNS on each cluster:

```bash
# Install ExternalDNS with your DNS provider
# This example uses AWS Route53
helm install external-dns bitnami/external-dns \
  --namespace kube-system \
  --set provider=aws \
  --set domainFilters[0]=services.example.com \
  --set policy=upsert-only \
  --set aws.zoneType=private \
  --set txtOwnerId=cluster-a
```

Then annotate services that should be discoverable:

```yaml
# service-in-cluster-a.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-backend
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api-backend.services.example.com
spec:
  type: LoadBalancer
  selector:
    app: api-backend
  ports:
    - port: 8080
      targetPort: 8080
```

Services in cluster-b can now reach the API backend using `api-backend.services.example.com`. This works, but it has limitations. The DNS records point to load balancer IPs, so you go through external networking even if the clusters are on the same network. DNS TTLs also mean there is a delay when endpoints change.

## Option 2: CoreDNS with Cross-Cluster Forwarding

A more integrated approach is to configure CoreDNS in each cluster to forward queries for other clusters to their respective DNS servers. This requires network connectivity between clusters.

On Talos Linux, you can customize the CoreDNS configuration through the cluster config:

```yaml
# Talos cluster config patch for cluster-a
cluster:
  coreDNS:
    disabled: false
```

After the cluster is running, modify the CoreDNS ConfigMap to add forwarding rules:

```yaml
# coredns-configmap.yaml for cluster-a
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        ready
        kubernetes cluster-a.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        # Forward queries for cluster-b services
        cluster-b.local:53 {
            forward . 10.96.0.10  # cluster-b CoreDNS ClusterIP
        }
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

With this setup, pods in cluster-a can reach services in cluster-b using the format `service-name.namespace.svc.cluster-b.local`. You need to set up a VPN or tunnel between clusters for the DNS queries and actual traffic to flow.

## Option 3: Cilium ClusterMesh

If you are already running Cilium as your CNI on Talos Linux, ClusterMesh is the best option. It provides transparent cross-cluster service discovery with identity-aware security.

Enable Cilium ClusterMesh on each cluster. First, make sure each cluster has a unique cluster ID:

```yaml
# Talos config patch for cluster-a
cluster:
  inlineManifests:
    - name: cilium-config
      contents: |
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: cilium-config
          namespace: kube-system
        data:
          cluster-name: cluster-a
          cluster-id: "1"
          cluster-pool-ipv4-cidr: "10.0.0.0/16"
```

```yaml
# Talos config patch for cluster-b
cluster:
  inlineManifests:
    - name: cilium-config
      contents: |
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: cilium-config
          namespace: kube-system
        data:
          cluster-name: cluster-b
          cluster-id: "2"
          cluster-pool-ipv4-cidr: "10.1.0.0/16"
```

Make sure the pod CIDRs do not overlap between clusters. Then enable and connect ClusterMesh:

```bash
# Enable ClusterMesh on both clusters
cilium clustermesh enable --context cluster-a --service-type LoadBalancer
cilium clustermesh enable --context cluster-b --service-type LoadBalancer

# Wait for ClusterMesh to be ready
cilium clustermesh status --context cluster-a --wait

# Connect the clusters
cilium clustermesh connect \
  --context cluster-a \
  --destination-context cluster-b
```

Verify connectivity:

```bash
cilium clustermesh status --context cluster-a
# Cluster Connections:
# - cluster-b: 3/3 nodes connected
```

Now, to make a service discoverable across clusters, annotate it:

```yaml
# global-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: shared-redis
  annotations:
    service.cilium.io/global: "true"
    # Optional: only use remote endpoints as backup
    service.cilium.io/shared: "true"
spec:
  selector:
    app: redis
  ports:
    - port: 6379
```

Pods in both clusters can now reach `shared-redis` by its standard Kubernetes DNS name. Cilium handles routing the traffic to the correct cluster transparently.

## Option 4: Istio Multi-Cluster Service Mesh

For teams already using Istio, multi-cluster service mesh provides cross-cluster service discovery along with traffic management, security, and observability.

Install Istio on both clusters with multi-cluster configuration:

```bash
# On the primary cluster (cluster-a)
istioctl install -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-a
      network: network1
EOF

# Create a remote secret for cluster-b
istioctl create-remote-secret --context=cluster-b --name=cluster-b | \
  kubectl apply -f - --context=cluster-a

# Install Istio on cluster-b
istioctl install --context=cluster-b -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-b
      network: network1
EOF
```

With Istio multi-cluster, any service in the mesh is automatically discoverable from any cluster. You also get mTLS between clusters, traffic splitting, and fault injection for testing.

## Choosing the Right Approach

For Talos Linux clusters, here is a practical decision framework:

If you just need a few services to be reachable across clusters and already have external load balancers, ExternalDNS is the simplest path. If you use Cilium (which pairs well with Talos), ClusterMesh is the natural choice and gives you the best integration. If you need advanced traffic management and already run Istio, multi-cluster mesh is worth the operational overhead.

Avoid the CoreDNS forwarding approach for production unless you have very specific requirements. It works but is fragile and hard to troubleshoot when things go wrong.

## Testing Cross-Cluster Discovery

Whatever approach you choose, always verify it works with a simple test:

```bash
# Deploy a test pod in cluster-a
kubectl run --context cluster-a test-pod --image=busybox --rm -it -- sh

# From inside the pod, try to reach a service in cluster-b
nslookup shared-redis.default.svc.cluster.local
wget -qO- http://api-backend.default.svc.cluster.local:8080/health
```

Cross-cluster service discovery on Talos Linux is not fundamentally different from any other Kubernetes distribution. The advantage of Talos is that its predictable, API-driven nature makes the initial cluster setup and CNI configuration more consistent across your fleet, which makes cross-cluster networking more reliable from the start.
