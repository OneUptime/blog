# Execute Azure CNI Legacy Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, EBPF

Description: Learn how to chain Cilium onto Azure CNI (legacy mode) on Azure Kubernetes Service to enhance network policy enforcement with eBPF while retaining Azure VNet IP addressing for pods.

---

## Introduction

Azure CNI (legacy mode) assigns pods VNet IP addresses directly, enabling direct routing within Azure VNet without NAT or overlays. While effective for connectivity, Azure CNI's native network policy implementation has limitations in terms of granularity and observability.

Chaining Cilium onto Azure CNI gives AKS clusters eBPF-based L3/L4/L7 network policy enforcement, Hubble flow observability, and transparent mTLS-while Azure CNI continues to manage VNet IP allocation and basic pod connectivity.

## Prerequisites

- AKS cluster with Azure CNI (legacy) configured
- `kubectl`, `cilium`, and `helm` CLIs installed
- Node access (nodes must support eBPF - Linux kernel 5.4+ on AKS nodes)

## Step 1: Verify Azure CNI Configuration

Check that Azure CNI is running and pods have VNet IP addresses.

```bash
# Confirm Azure CNI DaemonSet is running
kubectl get pods -n kube-system | grep azure

# Verify pods have VNet CIDR IPs
kubectl get pods -o wide -n default

# Check current CNI configuration on a node
# Connect via kubectl debug or az aks command invoke
kubectl debug node/<node-name> -it --image=ubuntu -- cat /etc/cni/net.d/10-azure.conflist
```

## Step 2: Install Cilium in Azure CNI Chaining Mode

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium chained onto Azure CNI
# azure-cni chaining mode preserves Azure CNI IP management
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set cni.chainingMode=azure-cni \
  --set cni.exclusive=false \
  --set tunnel=disabled \
  --set enableIPv4Masquerade=false \
  --set endpointRoutes.enabled=true \
  --set kubeProxyReplacement=false \
  --set azure.resourceGroup="my-aks-rg"
```

## Step 3: Validate the Installation

```bash
# Wait for Cilium to be fully operational
cilium status --wait

# Run the Cilium connectivity test suite
cilium connectivity test

# Check that both CNI plugins appear in the chain
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "chaining|cni"
```

## Step 4: Deploy a CiliumNetworkPolicy

Apply a CiliumNetworkPolicy to test eBPF-based enforcement on top of Azure CNI.

```yaml
# Test: deny all ingress to the app namespace except from the frontend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: backend-ingress-policy
  namespace: app
spec:
  endpointSelector:
    matchLabels:
      tier: backend
  ingress:
    # Only allow traffic from pods labeled tier=frontend
    - fromEndpoints:
        - matchLabels:
            tier: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

```bash
# Apply and verify
kubectl apply -f backend-ingress-policy.yaml
cilium policy get
```

## Step 5: Enable Hubble for Flow Observability

```bash
# Enable Hubble relay and UI
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Open the Hubble UI to visualize flows on AKS
cilium hubble ui
```

## Best Practices

- Confirm the AKS node pool uses Ubuntu (not Windows) nodes; Cilium's eBPF requires Linux kernel 5.4+, which all modern AKS Ubuntu node pools provide.
- Keep `cni.exclusive=false` to prevent Cilium from removing the Azure CNI configuration.
- Use `cilium connectivity test` after installation to verify end-to-end connectivity before applying network policies.
- Monitor Cilium agent logs on AKS nodes for Azure API rate-limiting errors if running large node pools.
- Plan a migration to Cilium as the primary CNI (Azure CNI Overlay + Cilium) for the full eBPF datapath on newer AKS node pools.

## Conclusion

Chaining Cilium onto Azure CNI legacy mode is a non-disruptive way to add advanced network security and observability to existing AKS clusters. Pods retain their Azure VNet IP addresses while gaining Cilium's powerful eBPF enforcement and Hubble's deep visibility into network flows.
