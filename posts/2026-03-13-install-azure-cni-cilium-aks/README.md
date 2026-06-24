# Install Azure CNI with Cilium on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Step-by-step guide to installing Cilium as the CNI plugin on Azure Kubernetes Service using the Azure CNI Powered by Cilium feature.

---

## Introduction

Azure Kubernetes Service supports Cilium as the data plane through the "Azure CNI Powered by Cilium" feature. This integration combines Azure's native IP address management (IPAM) with Cilium's eBPF-based networking, providing advanced network policy enforcement and improved observability without replacing Azure's networking plane. Features such as transit encryption and Hubble-based observability are available through Advanced Container Networking Services (ACNS).

This guide covers enabling the Cilium data plane on a new AKS cluster and verifying the installation with Cilium's connectivity tests.

## Prerequisites

- Azure CLI (`az`) version 2.48.1 or later installed and authenticated
- Azure subscription with AKS permissions
- `kubectl` installed
- `cilium` CLI installed
- For Hubble in Step 4, Azure CLI 2.79.0 or later, the `hubble` CLI installed, and an AKS cluster running Kubernetes 1.29 or later

## Step 1: Verify Azure CLI and Resource Provider

```bash
# Check the installed Azure CLI version
az --version

# Register or refresh the AKS resource provider
az provider register --namespace Microsoft.ContainerService
```

## Step 2: Create an AKS Cluster with Azure CNI Powered by Cilium

```bash
# Set variables for the cluster
RESOURCE_GROUP="my-aks-rg"
CLUSTER_NAME="my-cilium-cluster"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create AKS cluster with Azure CNI Overlay powered by Cilium
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --location $LOCATION \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys
```

## Step 3: Get Credentials and Verify Installation

```bash
# Get kubectl credentials for the new cluster
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME

# Verify Cilium pods are running in the kube-system namespace
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium agent status on each node
kubectl exec -n kube-system ds/cilium -- cilium status

# Use the Cilium CLI for a comprehensive status check
cilium status --wait

# Run Cilium connectivity tests
cilium connectivity test
```

## Step 4: Enable Hubble for Network Observability

Hubble is Cilium's built-in network observability layer. On AKS, enable it through Advanced Container Networking Services:

```bash
# Enable ACNS on the existing AKS cluster with Cilium
az aks update \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --enable-acns

# Verify Hubble Relay is running
kubectl get pods -o wide -n kube-system -l k8s-app=hubble-relay

# Port-forward Hubble Relay for the Hubble CLI
kubectl port-forward -n kube-system svc/hubble-relay --address 127.0.0.1 4245:443

# Configure Hubble CLI TLS certificates in another terminal
CERT_DIR="$(pwd)/.certs"
mkdir -p "$CERT_DIR"
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['tls\.crt']}" | base64 -d > "$CERT_DIR/tls.crt"
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['tls\.key']}" | base64 -d > "$CERT_DIR/tls.key"
kubectl get secret hubble-relay-client-certs -n kube-system -o jsonpath="{.data['ca\.crt']}" | base64 -d > "$CERT_DIR/ca.crt"
hubble config set tls-client-cert-file "$CERT_DIR/tls.crt"
hubble config set tls-client-key-file "$CERT_DIR/tls.key"
hubble config set tls-ca-cert-files "$CERT_DIR/ca.crt"
hubble config set tls true
hubble config set tls-server-name instance.hubble-relay.cilium.io

# Use the Hubble CLI to observe network flows
hubble observe --namespace production --follow
```

## Step 5: Apply a Cilium Network Policy

```yaml
# cilium-network-policy.yaml - Allow only frontend to access backend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

## Best Practices

- Use Azure CNI Overlay mode with Cilium to conserve IP addresses in large clusters
- Enable ACNS for Hubble-based network flow visibility before deploying production workloads
- Apply `CiliumNetworkPolicy` resources gradually, starting with deny-all and explicitly allowing required traffic
- Monitor Cilium agent health with `cilium status` as part of your cluster health checks
- Use Azure Policy to enforce network policy requirements across all AKS clusters in your subscription

## Conclusion

Azure CNI Powered by Cilium provides the best of both worlds: Azure's native IP management and Cilium's eBPF-based network policies, with optional ACNS features for transit encryption and deep observability. The integration is seamless for AKS users and provides more efficient network policy enforcement and better visibility compared to the standard Azure CNI. Enable ACNS alongside Cilium for production observability from day one.
