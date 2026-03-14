# Install Calico on EKS Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, EKS, AWS

Description: Step-by-step guide to installing Calico on Amazon EKS, covering both Calico as a full CNI replacement for the VPC CNI and as a network policy engine.

---

## Introduction

Amazon EKS uses the AWS VPC CNI by default, which provides native VPC networking. Calico can be installed on EKS in two modes: as a network policy engine on top of VPC CNI (recommended for most cases), or as a full CNI replacement using Calico's IP-in-IP or VXLAN overlay (for environments with IP address constraints).

This guide covers the recommended approach: installing Calico as a network policy engine while keeping the VPC CNI for pod networking.

## Prerequisites

- AWS CLI installed and configured
- `eksctl` or AWS console access for cluster creation
- `kubectl` installed and configured for EKS
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`

## Step 1: Create EKS Cluster

```bash
# Create EKS cluster using eksctl
eksctl create cluster \
  --name my-eks-cluster \
  --region us-east-1 \
  --nodegroup-name standard-nodes \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 5 \
  --managed

# Verify cluster is accessible
kubectl get nodes
```

## Step 2: Install Calico for Network Policy Enforcement

When using VPC CNI (default), install Calico for network policy enforcement only:

```bash
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for the operator to be ready
kubectl wait --for=condition=Available deployment/tigera-operator -n tigera-operator --timeout=120s
```

Create the Calico installation configuration for EKS VPC CNI mode:

```yaml
# calico-installation-eks.yaml - Calico in policy-only mode for EKS VPC CNI
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use the VPC CNI for pod networking
  cni:
    type: AmazonVPC
  # Use Calico only for network policy
  calicoNetwork:
    bgp: Disabled
    ipPools: []
```

Apply the installation:

```bash
# Apply the Calico installation for EKS
kubectl apply -f calico-installation-eks.yaml

# Wait for Calico to be ready
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s

# Verify all Calico pods are running
kubectl get pods -n calico-system
kubectl get pods -n calico-apiserver
```

## Step 3: Configure calicoctl

```bash
# Configure calicoctl to use Kubernetes datastore (standard for EKS)
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify connectivity
calicoctl get nodes

# Check Calico node status on each worker node
calicoctl node status
```

## Step 4: Apply Network Policies

Create namespace-level isolation:

```yaml
# namespace-isolation.yaml - Isolate the production namespace with Calico
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  selector: all()
  types:
    - Ingress
    - Egress
---
# Allow DNS for all pods in production
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  selector: all()
  egress:
    - action: Allow
      protocol: UDP
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'kube-system'
        ports:
          - 53
  types:
    - Egress
---
# Allow frontend pods to reach the API on port 8080
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector: app == 'api'
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'frontend'
      destination:
        ports:
          - 8080
  types:
    - Ingress
```

## Step 5: Verify Network Policies

```bash
# List all network policies across namespaces
calicoctl get networkpolicies -A

# Test connectivity between pods
kubectl exec -it frontend-pod -n production -- curl http://api-service:8080/health

# Test that blocked traffic is denied
kubectl exec -it other-pod -n production -- curl --max-time 5 http://api-service:8080/health
# Should timeout if policy is working correctly
```

## Best Practices

- For EKS, keep the VPC CNI and use Calico for policy enforcement only - full CNI replacement complicates VPC integration
- Use Calico `GlobalNetworkPolicy` for cluster-wide baseline rules (node-to-pod communication, health checks)
- Enable Calico's eBPF dataplane for better performance on EKS with large workloads
- Use AWS Security Groups in conjunction with Calico policies for defense-in-depth network security
- Upgrade Calico minor versions with a rolling node upgrade to avoid network disruption

## Conclusion

Installing Calico on EKS in policy-only mode provides enterprise-grade network policy enforcement without disrupting EKS's native VPC networking. The Tigera Operator simplifies installation and lifecycle management. Start with a deny-all policy and explicitly allow traffic flows to build a zero-trust network posture in your EKS clusters.
