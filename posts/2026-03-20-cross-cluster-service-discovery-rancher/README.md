# How to Configure Cross-Cluster Service Discovery in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Service Discovery, Multi-Cluster, Submariner, Kubernetes, DNS, Networking

Description: Learn how to configure cross-cluster service discovery in Rancher-managed Kubernetes clusters using Submariner so services in one cluster can resolve and connect to services in another.

---

By default, Kubernetes DNS is scoped to a single cluster. Cross-cluster service discovery lets pods in one cluster call services in another by name, enabling microservice architectures that span multiple clusters.

---

## Prerequisites

- Two or more Rancher-managed clusters
- Non-overlapping pod and service CIDRs across clusters
- Network connectivity between node IPs (direct or VPN)

---

## Step 1: Install the Submariner CLI

Modern Rancher releases do not ship a first-class Submariner UI, so the supported workflow is to drive Submariner directly with the `subctl` CLI against your Rancher-managed kubeconfigs:

```bash
# Install the subctl CLI

curl -Ls https://get.submariner.io | bash
export PATH=$PATH:~/.local/bin

# Verify installation
subctl version
```

---

## Step 2: Deploy the Broker

The Submariner broker coordinates cluster metadata exchange. Deploy it on the management cluster:

```bash
subctl deploy-broker \
  --kubeconfig management-cluster.yaml \
  --globalnet   # Enable GlobalNet if CIDRs overlap
```

This creates a `broker-info.subm` file containing connection details.

---

## Step 3: Join Clusters to the Broker

```bash
# Join cluster 1
subctl join broker-info.subm \
  --kubeconfig cluster1.yaml \
  --clusterid cluster1 \
  --cable-driver libreswan

# Join cluster 2
subctl join broker-info.subm \
  --kubeconfig cluster2.yaml \
  --clusterid cluster2 \
  --cable-driver libreswan
```

---

## Step 4: Verify Tunnel Health

```bash
# Check gateway and route agents are running
kubectl get pods -n submariner-operator --kubeconfig cluster1.yaml

# Verify the tunnel is established
subctl show connections --kubeconfig cluster1.yaml
```

Expected output shows `connected` status between gateways.

---

## Step 5: Export a Service for Cross-Cluster Discovery

To make a service accessible from another cluster, create a `ServiceExport` resource:

```yaml
# serviceexport.yaml (apply on cluster1)
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: payments-api
  namespace: payments
```

Submariner automatically creates a `ServiceImport` on all other clusters.

---

## Step 6: Consume the Exported Service from Another Cluster

From cluster2, the exported service is available via a federated DNS name:

```bash
# DNS format: <service>.<namespace>.svc.clusterset.local
curl http://payments-api.payments.svc.clusterset.local/health
```

In a pod manifest on cluster2:

```yaml
env:
  - name: PAYMENTS_API_URL
    # Access the service from cluster1 using the clusterset DNS name
    value: "http://payments-api.payments.svc.clusterset.local"
```

---

## Step 7: Verify Service Import

```bash
# Check that the ServiceImport was created on cluster2
kubectl get serviceimport -n payments --kubeconfig cluster2.yaml
```

---

## Best Practices

- Keep pod CIDRs unique across all clusters to avoid routing conflicts (use `/20` per cluster from a `/16` range).
- Use **GlobalNet** mode only when CIDR overlap is unavoidable - it adds NAT overhead.
- Export only the services that need cross-cluster access, not everything.
- Monitor Submariner gateway pod CPU and memory - it handles all cross-cluster traffic.
