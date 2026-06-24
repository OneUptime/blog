# Migrate Workloads to Calico on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, GKE, Google Cloud

Description: Learn how to enable Calico network policy on Google Kubernetes Engine (GKE) and migrate workloads to benefit from advanced network policy enforcement beyond GKE's default Calico integration.

---

## Introduction

Google Kubernetes Engine offers Calico as a network policy provider through its "Network Policy" feature, which enables Kubernetes NetworkPolicy enforcement powered by Calico in Standard clusters. While GKE's built-in Calico integration handles standard Kubernetes NetworkPolicy, teams requiring Calico's extended features - such as GlobalNetworkPolicy or Calico IPAM - need to carefully plan a self-managed Calico or Calico Enterprise approach instead of assuming those APIs are available from the managed GKE add-on.

For most GKE Standard users who want Calico-based enforcement, the recommended path is to enable GKE's built-in network policy support and then use standard Kubernetes NetworkPolicy objects. This gives you Calico's enforcement engine with GKE's managed upgrade path.

This guide covers enabling and using Calico network policy on GKE, migrating existing workloads and policies, and validating enforcement across your cluster.

## Prerequisites

- Supported GKE Standard cluster (not Autopilot)
- `gcloud` CLI authenticated with container.admin permissions
- `kubectl` configured for the target GKE cluster
- Existing workloads and NetworkPolicy objects to migrate

## Step 1: Enable Network Policy on GKE Cluster

Enable Calico-backed network policy on an existing GKE cluster.

Update an existing GKE cluster to enable network policy enforcement:

```bash
# Enable network policy on an existing cluster (requires node pool recreation)

gcloud container clusters update my-gke-cluster \
  --update-addons=NetworkPolicy=ENABLED \
  --zone=us-central1-a

# Enable network policy enforcement on the cluster's nodes
gcloud container clusters update my-gke-cluster \
  --enable-network-policy \
  --zone=us-central1-a

# Get credentials for the updated cluster
gcloud container clusters get-credentials my-gke-cluster --zone=us-central1-a
```

## Step 2: Verify Calico Components on GKE

Confirm that Calico is active and enforcing policies on the cluster.

Check the GKE Calico node readiness label and verify the managed Calico Pods:

```bash
# Verify that nodes have Calico network policy enforcement enabled
kubectl get nodes -l projectcalico.org/ds-ready=true

# Verify all calico-node pods are running
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
```

## Step 3: Migrate Existing Network Policies

Apply or convert existing NetworkPolicy objects to work with Calico on GKE.

Create namespace-level isolation policies using Kubernetes NetworkPolicy:

```yaml
# gke-namespace-isolation.yaml - namespace isolation policy for GKE with Calico
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}             # Applies to all pods in the namespace
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api               # Policy targets the API pods
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend      # Only allow traffic from frontend pods
    ports:
    - protocol: TCP
      port: 8080
```

Apply the network policies to the cluster:

```bash
kubectl apply -f gke-namespace-isolation.yaml
```

## Step 4: Use Kubernetes NetworkPolicy for Egress Controls on GKE

Use Kubernetes NetworkPolicy APIs for policies enforced by GKE's managed Calico integration. Calico CRDs such as GlobalNetworkPolicy are not installed by enabling GKE's managed network policy add-on.

Create an egress NetworkPolicy to restrict selected workloads to internal CIDR ranges and HTTPS:

```yaml
# gke-egress-policy.yaml - restrict egress using Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress-to-approved-external
  namespace: production
spec:
  podSelector:
    matchLabels:
      environment: production
  types:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/8       # Internal VPC CIDR
    - ipBlock:
        cidr: 172.16.0.0/12    # Example private CIDR; replace with your cluster ranges
  - ports:
    - protocol: TCP
      port: 443                # Allow HTTPS to any external service
```

Apply the policy using kubectl:

```bash
kubectl apply -f gke-egress-policy.yaml
```

## Step 5: Validate Policy Enforcement

Test that network policies are being enforced correctly on the GKE cluster.

Run connectivity validation tests between pods in different namespaces:

```bash
# Deploy a test pod in the production namespace
kubectl run policy-test --image=curlimages/curl -n production \
  --labels=app=frontend -- sleep 3600

# Test allowed connection to the API service
kubectl exec policy-test -n production -- \
  curl -s http://api.production.svc.cluster.local:8080/health

# Deploy a test pod in a different namespace to test isolation
kubectl run external-test --image=curlimages/curl -n staging -- sleep 3600

# Verify that cross-namespace traffic is blocked by default-deny
kubectl exec external-test -n staging -- \
  curl --connect-timeout 5 http://api.production.svc.cluster.local:8080/health
```

## Best Practices

- Enable network policy at GKE cluster creation time to avoid node pool recreation
- Evaluate GKE Dataplane V2 for new clusters that prioritize GKE's recommended Cilium-based data plane; it is mutually exclusive with the Calico network policy plugin
- Apply default-deny policies in all namespaces and add explicit allow rules
- Store all NetworkPolicy YAML in version control for audit trails
- Configure OneUptime monitors for critical inter-service connectivity to detect policy regressions

## Conclusion

GKE's integration with Calico provides a managed, upgrade-friendly way to enforce Kubernetes NetworkPolicy in your Standard cluster. By using standard Kubernetes NetworkPolicy objects, you can achieve practical network segmentation without managing the Calico lifecycle manually. Use OneUptime to continuously validate service connectivity and receive immediate alerts when policy changes inadvertently break communication paths.
