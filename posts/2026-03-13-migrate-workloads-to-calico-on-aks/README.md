# Migrate Workloads to Calico on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, AKS, Azure, Kubernetes, Networking, Migration, Network Policy

Description: Learn how to enable Calico network policy on Azure Kubernetes Service (AKS) and migrate existing workloads to leverage Calico's advanced policy enforcement capabilities.

---

## Introduction

Azure Kubernetes Service supports two network policy engines: Azure Network Policy Manager and Calico. While Azure's built-in policy manager covers basic use cases, Calico provides a richer policy language, support for GlobalNetworkPolicy, namespace-level isolation, and fine-grained egress controls that enterprise teams require.

Enabling Calico on AKS is done at cluster creation time since AKS does not support in-place CNI migration. However, you can create a new node pool with Calico enabled and migrate workloads from your existing cluster or node pool, enabling a safe cutover with minimal downtime.

This guide covers enabling Calico on a new AKS cluster, migrating workloads from an existing cluster, and applying Calico network policies to enforce zero-trust networking on AKS.

## Prerequisites

- Azure CLI (`az`) v2.40+ authenticated
- `kubectl` with access to both source and target clusters
- `calicoctl` v3.27+ installed
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

# Validate IP pools configured by AKS
calicoctl get ippools -o wide
```

## Step 3: Migrate Workload Manifests

Export and apply workload definitions to the new Calico-enabled cluster.

Export all workload resources from the source cluster and apply to the target:

```bash
# Export all namespace resources from the source cluster
kubectl --context=source-cluster get all -n production -o yaml > production-workloads.yaml

# Export ConfigMaps and Secrets (sanitize secrets before committing to git)
kubectl --context=source-cluster get configmaps,secrets -n production -o yaml > production-config.yaml

# Apply workloads to the new Calico-enabled cluster
kubectl --context=myAKSCluster apply -f production-workloads.yaml
kubectl --context=myAKSCluster apply -f production-config.yaml
```

## Step 4: Apply Calico Network Policies

Define and apply Calico network policies to enforce traffic rules in the new cluster.

Create a default-deny policy with explicit allow rules for your application tiers:

```yaml
# production-network-policy.yaml - tiered network policy for production namespace
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  selector: all()
  types:
  - Ingress
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector: "app == 'backend'"
  types:
  - Ingress
  ingress:
  - action: Allow
    source:
      selector: "app == 'frontend'"
    destination:
      ports:
      - 8080
```

Apply the network policies using calicoctl:

```bash
calicoctl apply -f production-network-policy.yaml
```

## Step 5: Validate and Cut Over Traffic

Test connectivity and then update DNS or load balancer endpoints to route traffic to the new cluster.

Verify that application endpoints are responding correctly before switching traffic:

```bash
# Check all pods are running in production namespace
kubectl get pods -n production

# Test internal service connectivity
kubectl run test --image=curlimages/curl --rm -it -- \
  curl http://backend.production.svc.cluster.local:8080/health

# Verify Calico policy is enforcing rules
calicoctl get networkpolicies -n production -o wide
```

## Best Practices

- Enable Calico tier-based policies to logically separate platform and application policies
- Use AKS node taints to ensure workloads are scheduled only on intended node pools
- Integrate Calico with Azure Monitor for network flow logging and anomaly detection
- Test all Calico network policies in a staging cluster before applying to production
- Monitor pod connectivity with OneUptime synthetic checks post-migration to catch regressions

## Conclusion

Migrating workloads to Calico on AKS provides enterprise-grade network policy enforcement with a rich policy language that scales across namespaces and workload types. By provisioning a new Calico-enabled cluster and migrating workloads systematically, you can achieve a zero-downtime cutover. Combine Calico's policy enforcement with OneUptime's monitoring to maintain full visibility into network health and security compliance after migration.
