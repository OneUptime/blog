# Install Calico on GKE Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GKE, Google Cloud, Kubernetes, Networking, Network Policy

Description: Step-by-step guide to installing Calico on Google Kubernetes Engine for advanced network policy enforcement beyond GKE's native capabilities.

---

## Introduction

Google Kubernetes Engine includes basic network policy support, but Calico provides significantly more advanced policy capabilities including Calico-native policies, global policies, and richer selector expressions. Installing Calico on GKE requires using the Tigera Operator and configuring it to work alongside GKE's networking.

This guide covers installing Calico on GKE in network policy enforcement mode, preserving GKE's native networking while adding Calico's policy engine.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- `kubectl` configured for GKE
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`
- GKE cluster with at least 3 nodes

## Step 1: Create a GKE Cluster

```bash
# Create a GKE cluster with network policy support disabled (Calico will provide it)
gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-ip-alias \
  --no-enable-network-policy \
  --workload-pool=my-project.svc.id.goog

# Get credentials for kubectl
gcloud container clusters get-credentials my-cluster \
  --zone us-central1-a
```

## Step 2: Install Calico Operator on GKE

```bash
# Install the Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for the operator deployment to be ready
kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

Configure Calico for GKE's networking stack:

```yaml
# calico-installation-gke.yaml - Calico installation for GKE
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Preserve GKE's CNI for pod networking
  cni:
    type: GKE
  calicoNetwork:
    # Disable BGP as GKE uses its own routing
    bgp: Disabled
    ipPools: []
  # Use VXLAN encapsulation for cross-node Calico traffic
  nodeMetricsPort: 9091
```

Apply and verify:

```bash
# Apply the Calico installation configuration
kubectl apply -f calico-installation-gke.yaml

# Wait for all Calico components to be ready
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s

# Verify pods are running
kubectl get pods -n calico-system
```

## Step 3: Configure calicoctl for GKE

```bash
# Use Kubernetes datastore for GKE (no etcd needed)
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify calicoctl is working
calicoctl get nodes -o wide
```

## Step 4: Create Network Policies for GKE Workloads

Use Calico's extended policy API for richer controls:

```yaml
# global-deny-all.yaml - Global deny-all as a baseline (Calico GlobalNetworkPolicy)
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all-namespaces
spec:
  # Apply to all pods except those in kube-system and calico-system
  selector: projectcalico.org/namespace not in {'kube-system', 'calico-system', 'calico-apiserver', 'tigera-operator'}
  types:
    - Ingress
    - Egress
  ingress: []
  egress: []
---
# Allow all pods to reach DNS
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-kube-dns
spec:
  selector: all()
  egress:
    - action: Allow
      protocol: UDP
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'kube-system'
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'kube-system'
        ports:
          - 53
  types:
    - Egress
```

## Step 5: Test Policy Enforcement

```bash
# Deploy test workloads
kubectl run nginx --image=nginx -n production
kubectl run curl-test --image=curlimages/curl:latest -n production \
  --command -- sleep 3600

# Test that traffic is blocked by default-deny
kubectl exec curl-test -n production -- curl --max-time 5 http://nginx

# Apply an allow policy
cat <<EOF | kubectl apply -f -
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-curl-to-nginx
  namespace: production
spec:
  selector: run == 'nginx'
  ingress:
    - action: Allow
      source:
        selector: run == 'curl-test'
  types:
    - Ingress
EOF

# Verify traffic is now allowed
kubectl exec curl-test -n production -- curl --max-time 5 http://nginx
```

## Best Practices

- Use `GlobalNetworkPolicy` for cluster-wide baseline rules to reduce per-namespace configuration
- Enable GKE's Workload Identity with Calico's tier-based policies for microservice-level access control
- Monitor Calico node agent health on GKE using Cloud Monitoring with custom metrics
- Test all network policies in GKE autopilot before applying to standard GKE clusters
- Keep Calico versions aligned with GKE's Kubernetes version support matrix

## Conclusion

Installing Calico on GKE provides richer network policy capabilities beyond GKE's built-in offering, including global policies, tier-based policy ordering, and Calico's extended selector syntax. The Tigera Operator makes installation and upgrades straightforward. Start with global baseline policies and layer application-specific policies on top for a maintainable, auditable network security posture.
