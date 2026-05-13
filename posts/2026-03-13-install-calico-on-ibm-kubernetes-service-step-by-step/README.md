# Install Calico on IBM Kubernetes Service Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, IBM Kubernetes Service

Description: Step-by-step guide to installing and configuring Calico network policies on IBM Kubernetes Service for advanced Kubernetes networking.

---

## Introduction

IBM Kubernetes Service (IKS) includes Calico as its default CNI plugin, making it unique among major cloud Kubernetes services - Calico is already installed when you create an IKS cluster. This means you can immediately start using Calico network policies without an additional installation step.

However, configuring calicoctl, inspecting IP pools, and applying advanced Calico policies on IKS requires specific configuration steps due to IBM's networking architecture. This guide walks through the setup and configuration process.

## Prerequisites

- IBM Cloud CLI (`ibmcloud`) installed and authenticated
- `kubectl` configured for your IKS cluster
- `calicoctl` installed: `sudo curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && sudo chmod +x /usr/local/bin/calicoctl`
- IKS cluster running (standard tier required for network policies)

## Step 1: Create an IKS Cluster

```bash
# Log in to IBM Cloud

ibmcloud login --sso

# List available zones
ibmcloud ks zone ls --provider classic

# List supported Kubernetes versions
ibmcloud ks versions

# Create a standard IKS cluster (Calico is included by default)
ibmcloud ks cluster create classic \
  --name my-iks-cluster \
  --zone dal10 \
  --workers 3 \
  --flavor b3c.4x16 \
  --hardware shared \
  --version <supported_version>

# Wait for cluster to be ready
ibmcloud ks cluster get --cluster my-iks-cluster --output json | grep state

# Get kubeconfig for the cluster
ibmcloud ks cluster config --cluster my-iks-cluster
```

## Step 2: Configure calicoctl for IKS

IKS uses the Kubernetes API datastore for Calico, requiring specific calicoctl configuration:

```bash
# IKS provides a Calico config file for calicoctl
# Download it from IBM Cloud
ibmcloud ks cluster config --cluster my-iks-cluster --network

# For Kubernetes 1.19 and later, use the Kubernetes API datastore
export DATASTORE_TYPE=kubernetes

# Verify calicoctl can connect
calicoctl get nodes

# Check existing IP pools
calicoctl get ippools -o wide
```

## Step 3: Verify Calico is Running

```bash
# Check Calico pods in IKS
kubectl get pods -n calico-system

# IKS uses a calico-node DaemonSet on each worker node
kubectl get daemonset calico-node -n calico-system

# Check the Calico node rollout
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 4: Apply Calico Network Policies on IKS

IKS has some specific considerations for network policies due to IBM's LoadBalancer and NodePort services. IBM publishes region-specific Calico policy examples for worker interfaces, and you should start from those samples when tightening public or private worker network access:

```yaml
# iks-allow-worker-dns.yaml - Allow DNS traffic on public worker interfaces
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-worker-dns-public
spec:
  selector: ibm.role == 'worker_public'
  order: 1500
  ingress:
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 53
          - 5353
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
          - 5353
  types:
    - Ingress
```

For application pod traffic, use a standard Kubernetes `NetworkPolicy` when you do not need Calico-specific fields:

```yaml
# allow-app-traffic.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-traffic
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  policyTypes:
    - Ingress
```

If you need Calico-specific fields such as `action` or Calico selectors, apply a Calico namespaced policy instead:

```yaml
# allow-app-traffic-calico.yaml
# Calico-specific namespaced policy equivalent
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-traffic-calico
  namespace: production
spec:
  selector: app == 'web-api'
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

Apply the policies:

```bash
# Apply policies using calicoctl (required for Calico-specific resources)
calicoctl apply -f iks-allow-worker-dns.yaml
calicoctl apply -f allow-app-traffic-calico.yaml

# Apply standard Kubernetes NetworkPolicy using kubectl
kubectl apply -f allow-app-traffic.yaml

# Verify policies are applied
calicoctl get NetworkPolicy --all-namespaces
calicoctl get GlobalNetworkPolicy
kubectl get networkpolicies -A
```

## Best Practices

- Use `ibmcloud ks cluster config --network` to get the correct calicoctl configuration for each IKS cluster
- Be careful with GlobalNetworkPolicies on IKS - IBM provides region-specific sample policies for worker interfaces, and these samples must be reviewed and adapted for your cluster
- Monitor Calico pods and rollout status with `kubectl`, and use IBM Cloud Monitoring for Kubernetes cluster and workload metrics
- Test network policies in a staging IKS cluster before applying to production
- Keep Calico policies consistent across development, staging, and production to prevent environment-specific issues

## Conclusion

IBM Kubernetes Service includes Calico out of the box, so you can get started with Kubernetes and Calico network policies without installing a separate CNI. The configuration is slightly different from self-managed Calico due to IBM's networking specifics, but the Calico policy API is the same. Use calicoctl with IBM's network config for advanced policy management, and review IBM's region-specific sample policies carefully when creating deny-all baseline policies.
