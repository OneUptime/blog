# How to Configure DNS for Multi-Cluster on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Multi-Cluster, CoreDNS, Kubernetes, Federation

Description: Configure DNS to enable service discovery across multiple Talos Linux clusters for seamless multi-cluster communication.

---

Running multiple Talos Linux clusters is common in production environments. You might have separate clusters for different environments, regions, or teams. The challenge is enabling services in one cluster to discover and communicate with services in another. DNS is the foundation of service discovery in Kubernetes, and extending it across cluster boundaries requires thoughtful configuration.

This guide covers several approaches to multi-cluster DNS on Talos Linux, from simple forwarding to full mesh service discovery.

## The Multi-Cluster DNS Challenge

Each Kubernetes cluster has its own DNS domain (typically `cluster.local`). A service in Cluster A can easily resolve `my-service.default.svc.cluster.local` within its own cluster. But what about reaching `my-service.default.svc.cluster.local` in Cluster B? The same domain name refers to different services in different clusters, and there is no built-in mechanism for cross-cluster resolution.

## Approach 1: Custom Domain Per Cluster

The simplest approach gives each cluster its own DNS domain:

```text
Cluster A: cluster-a.local
Cluster B: cluster-b.local
Cluster C: cluster-c.local
```

Configure this in your Talos machine configuration when bootstrapping each cluster:

```yaml
# Cluster A machine config
cluster:
  clusterName: cluster-a
  network:
    dnsDomain: cluster-a.local
```

```yaml
# Cluster B machine config
cluster:
  clusterName: cluster-b
  network:
    dnsDomain: cluster-b.local
```

Then configure CoreDNS in each cluster to forward queries for other clusters to the appropriate DNS servers:

```yaml
# CoreDNS ConfigMap for Cluster A
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    cluster-a.local:53 {
        errors
        health {
           lazystart
        }
        ready
        kubernetes cluster-a.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        cache 30
        loop
        reload
        loadbalance
    }

    # Forward queries for Cluster B to its CoreDNS
    cluster-b.local:53 {
        errors
        cache 30
        forward . 10.200.0.10 {
            max_concurrent 100
        }
    }

    # Forward queries for Cluster C to its CoreDNS
    cluster-c.local:53 {
        errors
        cache 30
        forward . 10.300.0.10 {
            max_concurrent 100
        }
    }

    .:53 {
        errors
        forward . 8.8.8.8 1.1.1.1 {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

Services in Cluster A can now reach services in Cluster B using the fully qualified name:

```bash
# From a pod in Cluster A
curl http://my-service.default.svc.cluster-b.local:8080
```

## Approach 2: Shared External DNS Zone

Instead of cluster-specific domains, use a shared external DNS zone that both clusters can write to:

```text
my-service.production.services.example.com -> Resolves to the right cluster
```

Set up ExternalDNS in each cluster to register services in a shared zone:

```yaml
# ExternalDNS values for Cluster A
provider:
  name: cloudflare
domainFilters:
  - services.example.com
txtOwnerId: cluster-a
sources:
  - service
  - ingress
annotationFilter: "multicluster/export=true"
```

Services opt in to multi-cluster discovery with annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
  annotations:
    multicluster/export: "true"
    external-dns.alpha.kubernetes.io/hostname: "my-service.production.services.example.com"
spec:
  type: LoadBalancer
  ports:
  - port: 80
  selector:
    app: my-service
```

Configure CoreDNS to forward the shared zone queries:

```text
# Forward shared service zone to the external DNS
services.example.com:53 {
    errors
    cache 60
    forward . 8.8.8.8 1.1.1.1
}
```

## Approach 3: CoreDNS with etcd Backend

For more dynamic multi-cluster DNS, use etcd as a shared backend for CoreDNS across clusters. Both clusters write service records to a shared etcd cluster, and CoreDNS in each cluster reads from it.

Deploy a shared etcd cluster (or use an existing one):

```yaml
# etcd for shared DNS - deploy outside any cluster or in a dedicated cluster
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd-dns
  namespace: dns-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: etcd-dns
  template:
    metadata:
      labels:
        app: etcd-dns
    spec:
      containers:
      - name: etcd
        image: quay.io/coreos/etcd:v3.5.12
        ports:
        - containerPort: 2379
          name: client
```

Configure CoreDNS to use the etcd plugin:

```text
# CoreDNS Corefile with etcd backend
global.svc:53 {
    errors
    etcd {
        path /skydns
        endpoint http://etcd-dns.dns-system:2379
    }
    cache 30
    reload
}
```

Register services in etcd from each cluster:

```bash
#!/bin/bash
# register-service.sh
# Registers a Kubernetes service in shared etcd for multi-cluster DNS

ETCD_ENDPOINT="http://etcd-dns.dns-system:2379"
CLUSTER_NAME="cluster-a"
SERVICE_NAME=$1
NAMESPACE=$2

# Get the service's ClusterIP or LoadBalancer IP
SERVICE_IP=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$SERVICE_IP" ]; then
    SERVICE_IP=$(kubectl get svc "$SERVICE_NAME" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}')
fi

# Register in etcd with the path format CoreDNS expects
# Path: /skydns/svc/global/<namespace>/<cluster>/<service>
etcdctl --endpoints="$ETCD_ENDPOINT" put \
    "/skydns/svc/global/$NAMESPACE/$CLUSTER_NAME/$SERVICE_NAME" \
    "{\"host\":\"$SERVICE_IP\",\"ttl\":30}"

echo "Registered $SERVICE_NAME.$NAMESPACE.$CLUSTER_NAME.global.svc -> $SERVICE_IP"
```

## Approach 4: Kubernetes Multi-Cluster Services API

The Kubernetes Multi-Cluster Services (MCS) API is the official way to handle multi-cluster service discovery. It uses ServiceExport and ServiceImport resources:

```yaml
# In Cluster A: export a service
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: my-service
  namespace: production
```

```yaml
# In Cluster B: the service becomes available as
# my-service.production.svc.clusterset.local
```

To use MCS, you need a multi-cluster controller like Submariner or Cilium ClusterMesh. Here is how to set up Cilium ClusterMesh on Talos:

```bash
# Install Cilium on both clusters with ClusterMesh enabled
cilium install --cluster-name cluster-a --cluster-id 1
cilium clustermesh enable

# On cluster B
cilium install --cluster-name cluster-b --cluster-id 2
cilium clustermesh enable

# Connect the clusters
cilium clustermesh connect --destination-context cluster-b
```

## Network Connectivity Between Clusters

Multi-cluster DNS only works if the clusters can actually reach each other's services. Common approaches include:

```bash
# Option 1: VPN/tunnel between clusters
# Use WireGuard or IPsec

# Option 2: VPC peering (cloud environments)
# Peer the VPCs so pod networks can communicate

# Option 3: Service mesh gateway
# Use Istio or Linkerd multi-cluster gateways

# Verify connectivity
kubectl --context cluster-a run test --rm -it --restart=Never --image=busybox -- \
    wget -q -O- http://10.200.1.50:8080/health
```

## Testing Multi-Cluster DNS

Verify cross-cluster resolution:

```bash
#!/bin/bash
# test-multicluster-dns.sh
# Tests DNS resolution across clusters

echo "=== Testing from Cluster A ==="
kubectl --context cluster-a run dns-test --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "Local service:"
    dig my-service.default.svc.cluster-a.local +short

    echo ""
    echo "Remote service (Cluster B):"
    dig my-service.default.svc.cluster-b.local +short

    echo ""
    echo "Shared service zone:"
    dig my-service.production.services.example.com +short
'

echo ""
echo "=== Testing from Cluster B ==="
kubectl --context cluster-b run dns-test --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1

    echo "Local service:"
    dig my-service.default.svc.cluster-b.local +short

    echo ""
    echo "Remote service (Cluster A):"
    dig my-service.default.svc.cluster-a.local +short
'
```

## Monitoring Multi-Cluster DNS

Track cross-cluster DNS health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: multicluster-dns-alerts
  namespace: monitoring
spec:
  groups:
  - name: multicluster-dns
    rules:
    - alert: CrossClusterDNSFailure
      expr: |
        rate(coredns_forward_responses_total{rcode="SERVFAIL", to=~"10\\.(200|300).*"}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cross-cluster DNS forwarding is failing"
```

## Wrapping Up

Multi-cluster DNS on Talos Linux can range from simple static forwarding to fully automated service discovery with the MCS API. Start with the approach that matches your complexity needs. For two or three clusters, custom domains with forwarding rules work well. For larger deployments or dynamic environments, consider Cilium ClusterMesh or the MCS API. Whichever approach you choose, make sure the underlying network connectivity between clusters is solid before debugging DNS issues.
