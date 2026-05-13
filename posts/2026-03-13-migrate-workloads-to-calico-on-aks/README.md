# How to Migrate Existing Workloads to Calico on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, AKS, Azure

Description: Migrate existing AKS workloads to Calico network policy enforcement for improved security.

---

## Introduction

Azure Kubernetes Service supports three network policy engines: Cilium, Azure Network Policy Manager, and Calico. Azure Network Policy Manager is a legacy option, while Azure-managed Calico provides standard Kubernetes NetworkPolicy enforcement for teams that need Calico-based policy enforcement on AKS.

For a controlled migration, you can create a new AKS cluster with Calico enabled and migrate workloads from your existing cluster, enabling a safe cutover with minimal downtime.

This guide covers enabling Calico on a new AKS cluster, migrating workloads from an existing cluster, and applying Calico network policies to enforce zero-trust networking on AKS.

## Prerequisites

- Azure CLI (`az`) v2.40+ authenticated
- `kubectl` with access to both source and target clusters
- Existing AKS workloads to migrate
- Azure subscription with AKS quota available
- Velero or similar tool for workload backup (recommended)

## Step 1: Create a New AKS Cluster with Calico

Create a new AKS cluster with Calico as the network policy engine.

Provision a new AKS cluster with Azure CNI networking and Calico network policies:

```bash
# Create a resource group for the new cluster

az group create --name myResourceGroup --location eastus

# Create AKS cluster with Calico network policy enabled
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-count 3 \
  --network-plugin azure \
  --network-policy calico \
  --pod-cidr 192.168.0.0/16 \
  --service-cidr 10.0.0.0/16 \
  --dns-service-ip 10.0.0.10 \
  --generate-ssh-keys

# Get credentials for the new cluster
az aks get-credentials --resource-group myResourceGroup --name myAKSCluster
```

## Step 2: Verify Calico Is Active

Confirm that Calico components are running in the new cluster.

Check that Calico node and controller pods are operational:

```bash
# Verify calico-node DaemonSet is fully running
kubectl get daemonset calico-node -n kube-system

# Check that all calico-node pods are in Running state
kubectl get pods -n kube-system -l k8s-app=calico-node

# Confirm the target cluster is configured for Calico network policy
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "networkProfile.networkPolicy" \
  --output tsv
```

## Step 3: Migrate Workload Manifests

Apply workload definitions to the new Calico-enabled cluster.

Apply source-controlled manifests to the target cluster. If the source cluster has live-only state, use Velero or another migration tool instead of applying raw `kubectl get all` output, which includes generated resources and cluster-managed metadata.

```bash
# Create the production namespace if it does not already exist
kubectl --context=myAKSCluster create namespace production --dry-run=client -o yaml | \
  kubectl --context=myAKSCluster apply -f -

# Apply workloads and configuration to the new Calico-enabled cluster
kubectl --context=myAKSCluster apply -f ./manifests/production/
```

## Step 4: Apply Calico Network Policies

Define and apply Calico network policies to enforce traffic rules in the new cluster.

Create a default-deny policy with explicit allow rules for your application tiers:

```yaml
# production-network-policy.yaml - network policy for production namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

Apply the network policies using kubectl:

```bash
kubectl --context=myAKSCluster apply -f production-network-policy.yaml
```

## Step 5: Validate and Cut Over Traffic

Test connectivity and then update DNS or load balancer endpoints to route traffic to the new cluster.

Verify that application endpoints are responding correctly before switching traffic:

```bash
# Check all pods are running in production namespace
kubectl --context=myAKSCluster get pods -n production

# Test internal service connectivity
kubectl --context=myAKSCluster run test --image=curlimages/curl --rm -it -- \
  curl http://backend.production.svc.cluster.local:8080/health

# Verify Calico policy is enforcing rules
kubectl --context=myAKSCluster get networkpolicy -n production -o wide
```

## Best Practices

- Use namespace- and label-based policies to logically separate platform and application traffic
- Use AKS node taints to ensure workloads are scheduled only on intended node pools
- Monitor cluster and workload health with Azure Monitor, and use a supported Calico or Tigera observability option if you need Calico-specific flow visibility
- Test all Kubernetes network policies in a staging cluster before applying to production
- Monitor pod connectivity with OneUptime synthetic checks post-migration to catch regressions

## Conclusion

Migrating workloads to Calico on AKS provides Kubernetes NetworkPolicy enforcement that scales across namespaces and workload types. By provisioning a new Calico-enabled cluster and migrating workloads systematically, you can minimize downtime during cutover. Combine Calico's policy enforcement with OneUptime's monitoring to maintain full visibility into network health and security compliance after migration.
