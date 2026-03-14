# Install Calico on IBM Kubernetes Service Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, IBM Kubernetes Service

Description: Step-by-step guide to installing and configuring Calico network policies on IBM Kubernetes Service for advanced Kubernetes networking.

---

## Introduction

IBM Kubernetes Service (IKS) includes Calico as its default CNI plugin, making it unique among major cloud Kubernetes services - Calico is already installed when you create an IKS cluster. This means you can immediately start using Calico network policies without an additional installation step.

However, configuring calicoctl, managing IP pools, and applying advanced Calico policies on IKS requires specific configuration steps due to IBM's networking architecture. This guide walks through the setup and configuration process.

## Prerequisites

- IBM Cloud CLI (`ibmcloud`) installed and authenticated
- `kubectl` configured for your IKS cluster
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`
- IKS cluster running (standard tier required for network policies)

## Step 1: Create an IKS Cluster

```bash
# Log in to IBM Cloud
ibmcloud login --sso

# List available zones
ibmcloud ks zones --provider classic

# Create a standard IKS cluster (Calico is included by default)
ibmcloud ks cluster create classic \
  --name my-iks-cluster \
  --location dal10 \
  --workers 3 \
  --flavor b3c.4x16 \
  --kube-version 1.29

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

# The cluster config --network flag creates a calicoctl configuration file
# Set the KUBECONFIG to include the network config
export KUBECONFIG=/home/user/.bluemix/plugins/container-service/clusters/my-iks-cluster/kube-config-dal10-my-iks-cluster.yml

# Verify calicoctl can connect
calicoctl get nodes

# Check existing IP pools
calicoctl get ippools -o wide
```

## Step 3: Verify Calico is Running

```bash
# Check Calico pods in IKS (they run in the kube-system namespace)
kubectl get pods -n kube-system | grep calico

# IKS uses calico-node DaemonSet on each worker node
kubectl get daemonset calico-node -n kube-system

# Check Calico node status
kubectl exec -n kube-system ds/calico-node -- calico-node -status
```

## Step 4: Apply Calico Network Policies on IKS

IKS has some specific considerations for network policies due to IBM's LoadBalancer and NodePort services:

```yaml
# iks-allow-loadbalancer.yaml - Allow traffic from IBM Load Balancer health checks
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-ibm-lb-health-checks
spec:
  selector: ibm.role in {'worker_public', 'worker_private'}
  order: 1800
  ingress:
    # Allow IBM Cloud Load Balancer health check IPs
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 169.46.7.238/32
          - 169.48.228.78/32
  types:
    - Ingress
---
# Allow application traffic within the cluster
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-traffic
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
calicoctl apply -f iks-allow-loadbalancer.yaml

# Apply standard Kubernetes NetworkPolicy using kubectl
kubectl apply -f allow-app-traffic.yaml

# Verify policies are applied
calicoctl get networkpolicies -A
kubectl get networkpolicies -A
```

## Best Practices

- Use `ibmcloud ks cluster config --network` to get the correct calicoctl configuration for each IKS cluster
- Be careful with GlobalNetworkPolicies on IKS - IBM uses specific network ranges for health checks and NodePort services
- Monitor Calico node status on IKS using IBM Cloud Monitoring with the Calico metrics integration
- Test network policies in a staging IKS cluster before applying to production
- Keep Calico policies consistent across development, staging, and production to prevent environment-specific issues

## Conclusion

IBM Kubernetes Service includes Calico out of the box, making it the easiest managed Kubernetes service for getting started with Calico network policies. The configuration is slightly different from self-managed Calico due to IBM's networking specifics, but the policy API is identical. Use calicoctl with IBM's network config for advanced policy management, and be mindful of IBM's load balancer and health check IP ranges when creating deny-all baseline policies.
