# Configure Calico on GKE for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, gke, google-cloud, kubernetes, networking, cni

Description: A guide to deploying Calico on a new Google Kubernetes Engine cluster, enabling advanced network policy capabilities beyond GKE's native Dataplane V2.

---

## Introduction

Google Kubernetes Engine offers its own network policy implementation called Dataplane V2 (based on eBPF/Cilium). However, many teams prefer Calico for its extensive policy API, including GlobalNetworkPolicy, host endpoint protection, and BGP capabilities.

Calico can be deployed on GKE Standard clusters (not Autopilot) by disabling GKE's network policy enforcement and installing Calico directly. This gives you access to the full Calico feature set including Calico Enterprise features, while running on GKE's managed infrastructure.

This guide covers creating a GKE cluster configured for Calico installation, deploying Calico via the Tigera operator, and verifying policy enforcement.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- A Google Cloud project with GKE API enabled
- `kubectl` installed
- `calicoctl` CLI installed

## Step 1: Create a GKE Cluster for Calico

Create a GKE Standard cluster without GKE's managed network policy (Calico requires control of network policy).

```bash
# Set your project and region
PROJECT_ID="my-gcp-project"
CLUSTER_NAME="calico-gke-cluster"
REGION="us-central1"
ZONE="us-central1-a"

# Create the GKE cluster
# --no-enable-network-policy disables GKE's built-in network policy so Calico can manage it
gcloud container clusters create $CLUSTER_NAME \
  --project $PROJECT_ID \
  --zone $ZONE \
  --machine-type n2-standard-2 \
  --num-nodes 3 \
  --no-enable-network-policy \
  --enable-ip-alias \
  --cluster-ipv4-cidr "10.100.0.0/16" \
  --services-ipv4-cidr "10.101.0.0/16"

# Get credentials
gcloud container clusters get-credentials $CLUSTER_NAME \
  --zone $ZONE \
  --project $PROJECT_ID

# Verify nodes are Ready
kubectl get nodes
```

## Step 2: Install the Tigera Calico Operator

Deploy the Calico operator on the GKE cluster.

```bash
# Install the Tigera operator CRDs and deployment
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Verify the operator is running
kubectl get pods -n tigera-operator
```

## Step 3: Configure Calico for GKE

Create the Calico Installation resource configured for GKE's networking.

```yaml
# calico-gke-installation.yaml
# Calico installation configured for GKE with VPC-native networking
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use GKE native networking — Calico acts as policy-only engine
  cni:
    type: GKE
  calicoNetwork:
    # Disable BGP since GKE handles routing
    bgp: Disabled
    # Configure IP pools to match GKE's pod CIDR
    ipPools:
    - cidr: 10.100.0.0/16
      encapsulation: None
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
# Apply the Calico installation resource
kubectl apply -f calico-gke-installation.yaml

# Monitor the installation progress
kubectl get tigerastatus

# Wait until Calico is Ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=10m

# Verify all Calico pods are running
kubectl get pods -n calico-system
```

## Step 4: Configure calicoctl

Set up `calicoctl` to manage Calico resources on GKE.

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl && chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/

# Verify calicoctl connectivity
DATASTORE_TYPE=kubernetes calicoctl get nodes
```

## Step 5: Apply Calico Network Policies on GKE

Deploy workloads and verify Calico policy enforcement.

```yaml
# gke-calico-policy.yaml
# Calico GlobalNetworkPolicy for cluster-wide baseline security
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-kube-dns
spec:
  order: 1
  selector: all()
  egress:
  # Allow all pods to resolve DNS
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  - action: Allow
    protocol: TCP
    destination:
      ports: [53]
```

```bash
# Apply the baseline policy
calicoctl apply -f gke-calico-policy.yaml

# Verify policy is active
calicoctl get globalnetworkpolicies

# Test that pods can still resolve DNS after applying the baseline
kubectl run test --image=busybox --rm -it -- nslookup kubernetes.default
```

## Best Practices

- Use GKE Standard clusters (not Autopilot) — Calico requires DaemonSet deployment which isn't supported on Autopilot
- Disable GKE's built-in network policy before installing Calico to avoid conflicts
- Match Calico's pod CIDR configuration to GKE's `--cluster-ipv4-cidr` setting
- Use node auto-provisioning carefully — new node pools must be compatible with Calico's DaemonSet
- Monitor Calico with GKE's built-in Cloud Monitoring by exporting Calico's Prometheus metrics

## Conclusion

Calico on GKE provides advanced network policy capabilities that complement GKE's managed infrastructure. While GKE Dataplane V2 is a strong default, teams with complex policy requirements, multi-cluster architectures, or Calico Enterprise needs will benefit from running Calico directly on GKE Standard clusters with the full Calico feature set.
