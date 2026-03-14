# Migrate Workloads to Calico on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GKE, Google Cloud, Kubernetes, Networking, Migration, Network Policy

Description: Learn how to enable Calico network policy on Google Kubernetes Engine (GKE) and migrate workloads to benefit from advanced network policy enforcement beyond GKE's default Calico integration.

---

## Introduction

Google Kubernetes Engine offers Calico as a network policy provider through its "Network Policy" feature, which enables Kubernetes NetworkPolicy enforcement powered by Calico. While GKE's built-in Calico integration handles standard Kubernetes NetworkPolicy, teams requiring Calico's extended features — such as GlobalNetworkPolicy, FQDN-based policies, or Calico IPAM — need to carefully plan their approach.

For most GKE users, the recommended path is to enable GKE's built-in network policy support (which uses Calico under the hood) and then use standard Kubernetes NetworkPolicy objects alongside Calico CRDs where available. This gives you Calico's enforcement engine with GKE's managed upgrade path.

This guide covers enabling and using Calico network policy on GKE, migrating existing workloads and policies, and validating enforcement across your cluster.

## Prerequisites

- GKE cluster v1.27+ (Standard mode, not Autopilot)
- `gcloud` CLI authenticated with container.admin permissions
- `kubectl` configured for the target GKE cluster
- `calicoctl` v3.27+ installed
- Existing workloads and NetworkPolicy objects to migrate

## Step 1: Enable Network Policy on GKE Cluster

Enable Calico-backed network policy on an existing GKE cluster.

Update an existing GKE cluster to enable network policy enforcement:

```bash
# Enable network policy on an existing cluster (requires node pool recreation)
gcloud container clusters update my-gke-cluster \
  --update-addons=NetworkPolicy=ENABLED \
  --zone=us-central1-a

# Enable network policy enforcement on the default node pool
gcloud container node-pools update default-pool \
  --cluster=my-gke-cluster \
  --enable-network-policy \
  --zone=us-central1-a

# Get credentials for the updated cluster
gcloud container clusters get-credentials my-gke-cluster --zone=us-central1-a
```

## Step 2: Verify Calico Components on GKE

Confirm that Calico is active and enforcing policies on the cluster.

Check the GKE Calico DaemonSet and verify node readiness:

```bash
# Check Calico node DaemonSet managed by GKE
kubectl get daemonset calico-node -n kube-system

# Verify all calico-node pods are running
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Check calico-typha for larger clusters
kubectl get deployment calico-typha -n kube-system
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

## Step 4: Use Calico CRDs for Advanced Policies on GKE

Leverage Calico's CRD-based APIs for policies beyond standard Kubernetes NetworkPolicy.

Create a Calico GlobalNetworkPolicy to restrict egress to known external services:

```yaml
# gke-calico-egress-policy.yaml - restrict egress using Calico GlobalNetworkPolicy
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-egress-to-approved-external
spec:
  selector: "environment == 'production'"
  order: 200
  types:
  - Egress
  egress:
  - action: Allow
    destination:
      nets:
      - 10.0.0.0/8       # Internal VPC CIDR
      - 172.16.0.0/12    # GKE pod and service CIDRs
  - action: Allow
    destination:
      ports:
      - 443              # Allow HTTPS to any external service
  - action: Deny         # Block all other egress
```

Apply the Calico-specific policy using calicoctl:

```bash
calicoctl apply -f gke-calico-egress-policy.yaml
```

## Step 5: Validate Policy Enforcement

Test that network policies are being enforced correctly on the GKE cluster.

Run connectivity validation tests between pods in different namespaces:

```bash
# Deploy a test pod in the production namespace
kubectl run policy-test --image=curlimages/curl -n production -- sleep 3600

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
- Use GKE Dataplane V2 (eBPF-based) for improved performance in GKE Standard clusters
- Apply default-deny policies in all namespaces and add explicit allow rules
- Store all NetworkPolicy and Calico policy YAML in version control for audit trails
- Configure OneUptime monitors for critical inter-service connectivity to detect policy regressions

## Conclusion

GKE's integration with Calico provides a managed, upgrade-friendly way to enforce network policies in your Kubernetes cluster. By combining standard Kubernetes NetworkPolicy with Calico CRDs where needed, you can achieve comprehensive network segmentation without managing the Calico lifecycle manually. Use OneUptime to continuously validate service connectivity and receive immediate alerts when policy changes inadvertently break communication paths.
