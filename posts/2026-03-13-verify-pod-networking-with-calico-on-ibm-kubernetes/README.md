# Verify Pod Networking with Calico on IBM Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, IBM Kubernetes Service

Description: Learn how to verify Calico pod networking and policy enforcement on IBM Kubernetes Service (IKS), including IBM Cloud-specific Calico configurations and network policy validation.

---

## Introduction

IBM Kubernetes Service (IKS) uses Calico as its default CNI plugin and network policy engine. Unlike some other managed Kubernetes services where Calico is an optional add-on, IKS ships with Calico as a core component, providing both pod networking and policy enforcement. IBM Cloud also provides default Calico policies and supported configuration paths for its Calico integration.

Validating Calico on IKS involves checking the IBM-specific Calico configuration, verifying that the IKS-provided Calico components are healthy, and confirming that both standard Kubernetes NetworkPolicies and Calico-specific policies work correctly. IBM IKS also deploys pre-configured Calico GlobalNetworkPolicies for cluster security, which you must account for when testing.

This guide covers verification of Calico networking on IBM Kubernetes Service.

## Prerequisites

- IBM Kubernetes Service cluster
- IBM Cloud CLI with Kubernetes plugin (`ibmcloud ks`)
- `calicoctl` CLI configured for IKS (`ibmcloud ks cluster config --cluster <cluster-name> --admin --network`)
- `kubectl` with cluster admin access

## Step 1: Verify IKS Calico Configuration

Confirm Calico is correctly deployed on the IKS cluster.

```bash
# Check cluster networking configuration via IBM Cloud CLI

ibmcloud ks cluster get --cluster <cluster-name> | grep -i "network\|calico"

# Verify Calico pods are running on all worker nodes
kubectl get pods -n calico-system 2>/dev/null || kubectl get pods -n kube-system | grep calico

# Check the specific Calico version deployed by IBM
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}' 2>/dev/null || \
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# List Calico nodes registered in the datastore
calicoctl get nodes -o wide
```

## Step 2: Review IBM Pre-Configured Calico Policies

IKS deploys default Calico GlobalNetworkPolicies - review these before adding your own.

```bash
# List all GlobalNetworkPolicies deployed by IBM
calicoctl get globalnetworkpolicy -o wide

# View the IBM default host endpoint policies
calicoctl get hostendpoint -o wide

# Inspect a specific IBM policy to understand what traffic it controls
calicoctl get globalnetworkpolicy allow-all-private-default -o yaml

# Check the policy order to understand enforcement priority
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|order:"
```

## Step 3: Test Pod-to-Pod Connectivity

Validate that pod networking works correctly in the IKS environment.

```bash
# Deploy test pods on different worker nodes
kubectl run pod-a --image=busybox:1.28 --restart=Never -- sleep 3600
kubectl run pod-b --image=busybox:1.28 --restart=Never -- sleep 3600

# Confirm pods are on different nodes
kubectl get pods -o wide

# Test cross-node pod connectivity
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 5 $POD_B_IP

# Test service connectivity
kubectl exec pod-a -- nslookup kubernetes.default.svc.cluster.local
```

## Step 4: Apply and Test Custom Network Policies

Validate that custom NetworkPolicies work alongside IBM's pre-configured policies.

```yaml
# iks-app-policy.yaml - application-level network policy for IKS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-isolation
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  # Only allow traffic from the frontend tier
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - port: 80
```

```bash
# Create a production namespace and test the policy
kubectl create namespace production

# Apply the policy and deploy test pods
kubectl apply -f iks-app-policy.yaml

# Test that frontend can reach backend
kubectl run frontend -n production --image=busybox:1.28 \
  --labels="tier=frontend" --restart=Never -- sleep 3600
kubectl run backend -n production --image=nginx \
  --labels="tier=backend" --restart=Never

kubectl wait --for=condition=Ready pod/frontend -n production --timeout=60s
kubectl wait --for=condition=Ready pod/backend -n production --timeout=60s

BACKEND_IP=$(kubectl get pod backend -n production -o jsonpath='{.status.podIP}')
kubectl exec -n production frontend -- wget -qO- -T 5 http://$BACKEND_IP:80 && echo "PASS"
```

## Step 5: Validate IKS-Specific Calico Integration

Check IBM Cloud-specific Calico features and integration.

```bash
# Verify Calico is using the IBM Cloud provided datastore configuration
kubectl get cm -n kube-system calico-config -o yaml

# Check Calico operator-managed resources on Kubernetes 1.29 and later
kubectl get installation default -n calico-system -o yaml 2>/dev/null || true

# If you run Prometheus Operator, check whether Calico ServiceMonitor resources exist
kubectl get servicemonitor -A 2>/dev/null | grep calico || true

# Check Calico node status for all worker nodes
calicoctl get nodes -o wide
```

## Best Practices

- Review IBM's pre-configured Calico policies before adding custom ones to understand the existing security baseline
- Use Kubernetes API server audit logs in IBM Cloud Logs or an external server to audit network policy changes
- When upgrading IKS versions, verify that IBM's Calico policies are updated to the new version's format
- Test policies that interact with IBM-managed host endpoints carefully - incorrect policies can disrupt worker node communication with the control plane
- Use `kubectl` and `calicoctl` output to review policy interactions

## Conclusion

Verifying Calico on IBM Kubernetes Service requires accounting for IBM's pre-configured policies alongside your custom policies. The IKS integration provides a solid security baseline, but understanding and validating how your policies interact with IBM's defaults is essential. By testing pod connectivity, reviewing existing policies, and validating custom policy enforcement, you ensure that your IKS cluster maintains the intended security posture.
