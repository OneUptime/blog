# Verify Pod Networking with Calico on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, GKE, Google Cloud

Description: Learn how to verify Calico network policy enforcement on Google Kubernetes Engine (GKE), where Calico operates alongside GKE's data plane to enforce network policies for pod communication.

---

## Introduction

Google Kubernetes Engine (GKE) offers Calico as a network policy provider when you enable network policy at cluster creation. In this configuration, GKE's built-in data plane (using Alias IP ranges) handles pod IP assignment and routing, while Calico enforces network policies. This is similar to the EKS architecture where the cloud provider CNI handles data plane operations.

Validating Calico on GKE requires understanding that pod connectivity is handled by GKE's Alias IP CNI - pods receive IPs directly from the VPC subnet range. Calico provides the policy enforcement layer on top. Testing both layers independently ensures comprehensive validation of your GKE cluster networking.

This guide covers verification of Calico pod networking and policy enforcement on GKE.

## Prerequisites

- GKE cluster with Calico network policy enabled
- `gcloud` CLI configured
- `calicoctl` CLI configured (using Kubernetes API datastore mode)
- `kubectl` with cluster admin access

## Step 1: Verify GKE Network Policy Configuration

Confirm that the GKE cluster has network policy (Calico) enabled.

```bash
# Check if network policy is enabled on the GKE cluster
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkConfig.enableNetworkPolicy)"

# Alternatively, check using the GCP console network policy flag
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="yaml(networkPolicy)"

# Verify Calico pods are running on all GKE nodes
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
```

## Step 2: Test Pod Connectivity (GKE Alias IP Data Plane)

Validate that pod networking via GKE's Alias IP CNI is working.

```bash
# Deploy test pods and verify they receive GKE Alias IPs
kubectl run pod-a --image=busybox:1.28 --restart=Never -- sleep 3600
kubectl run pod-b --image=busybox:1.28 --restart=Never -- sleep 3600

# Verify pod IPs are in the VPC secondary range (Alias IP range)
kubectl get pods -o wide

# Test direct pod-to-pod connectivity
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 5 $POD_B_IP
```

## Step 3: Validate Calico Network Policy Enforcement

Test that Calico correctly enforces Kubernetes NetworkPolicies on GKE.

```yaml
# gke-network-policy-test.yaml - deny all then allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-except-same-namespace
  namespace: gke-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  # Only allow ingress from pods in the same namespace
  - from:
    - podSelector: {}
```

```bash
# Create test namespace and pods
kubectl create namespace gke-test
kubectl run server -n gke-test --image=nginx --labels="app=server" --restart=Never
kubectl run client -n gke-test --image=busybox:1.28 --labels="app=client" --restart=Never -- sleep 3600

# Apply the namespace isolation policy
kubectl apply -f gke-network-policy-test.yaml

# Test intra-namespace connectivity (should work)
SERVER_IP=$(kubectl get pod server -n gke-test -o jsonpath='{.status.podIP}')
kubectl exec -n gke-test client -- wget -qO- --timeout=5 http://$SERVER_IP && echo "PASS"
```

## Step 4: Test Cross-Namespace Policy Enforcement

Verify that cross-namespace policies work correctly with Calico on GKE.

```bash
# Create a second namespace and deploy a client there
kubectl create namespace gke-test-external
kubectl run external-client -n gke-test-external --image=busybox:1.28 --restart=Never -- sleep 3600

# Test cross-namespace access (should be blocked by the deny-all policy)
kubectl exec -n gke-test-external external-client -- \
  wget -qO- --timeout=5 http://$SERVER_IP && echo "FAIL: should be blocked" || echo "PASS: blocked"

# Add a NetworkPolicy to allow from the external namespace
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-ns
  namespace: gke-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: gke-test-external
EOF

kubectl exec -n gke-test-external external-client -- \
  wget -qO- --timeout=5 http://$SERVER_IP && echo "PASS: allowed"
```

## Step 5: Verify Calico Endpoint State on GKE

Confirm that Calico has correct endpoint representations for all pods.

```bash
# List Calico workload endpoints
calicoctl get workloadendpoint -n gke-test -o wide

# Check that endpoint labels match pod labels
calicoctl get workloadendpoint -n gke-test -o yaml | grep labels -A5

# Clean up test resources
kubectl delete namespace gke-test gke-test-external
```

## Best Practices

- Enable GKE network policy at cluster creation - enabling it post-creation requires node pool recreation
- Use Calico's `calicoctl` to inspect endpoint state when policies don't behave as expected
- Test cross-namespace policies explicitly as they are a common source of misconfigurations
- Monitor Calico pod health via GKE's built-in monitoring and alerting
- Consider upgrading to GKE Dataplane V2 (Cilium-based) for a more integrated eBPF experience

## Conclusion

Verifying Calico on GKE requires testing two separate layers: GKE's Alias IP data plane for pod connectivity and Calico's policy enforcement. By validating both layers and specifically testing cross-namespace policy behavior, you gain comprehensive confidence in your GKE network security posture. Regular policy enforcement tests should be part of your GKE cluster maintenance procedures.
