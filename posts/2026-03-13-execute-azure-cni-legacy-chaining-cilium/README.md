# Execute Azure CNI Legacy Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Learn how to chain Cilium onto Azure CNI (legacy mode) on Azure Kubernetes Service to enhance network policy enforcement with eBPF while retaining Azure VNet IP addressing for pods.

---

## Introduction

Azure CNI (legacy mode) assigns pods VNet IP addresses directly, enabling direct routing within Azure VNet without NAT or overlays. While effective for connectivity, Azure CNI's native network policy implementation has limitations in terms of granularity and observability.

Chaining Cilium onto Azure CNI gives AKS clusters eBPF-based L3/L4 network policy enforcement and Hubble flow observability while Azure CNI continues to manage VNet IP allocation and basic pod connectivity. Some advanced Cilium features, including L7 policy and transparent encryption, are limited in chained CNI deployments.

## Prerequisites

- AKS cluster with Azure CNI (legacy) configured
- `kubectl`, `cilium`, and `helm` CLIs installed
- Node access (nodes must support eBPF - Linux kernel 5.10+ or an equivalent distribution kernel)

## Step 1: Verify Azure CNI Configuration

Check that Azure CNI is running and pods have VNet IP addresses.

```bash
# Confirm Azure CNI DaemonSet is running

kubectl get pods -n kube-system | grep azure

# Verify pods have VNet CIDR IPs
kubectl get pods -o wide -n default

# Check current CNI configuration on a node
# Connect via kubectl debug or az aks command invoke
kubectl debug node/<node-name> -it --image=ubuntu -- cat /host/etc/cni/net.d/10-azure.conflist
```

## Step 2: Install Cilium in Azure CNI Chaining Mode

Create the CNI chain configuration that keeps Azure CNI first and adds Cilium as the chained plugin. Save it as `chaining.yaml`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cni-configuration
  namespace: kube-system
data:
  cni-config: |-
    {
      "cniVersion": "0.3.0",
      "name": "azure",
      "plugins": [
        {
          "type": "azure-vnet",
          "mode": "transparent",
          "ipam": {
             "type": "azure-vnet-ipam"
           }
        },
        {
          "type": "portmap",
          "capabilities": {"portMappings": true},
          "snat": true
        },
        {
           "name": "cilium",
           "type": "cilium-cni"
        }
      ]
    }
```

```bash
# Apply the CNI chain configuration
kubectl apply -f chaining.yaml

# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium chained onto Azure CNI
# generic-veth chaining mode preserves Azure CNI IP management
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set cni.chainingMode=generic-veth \
  --set cni.customConf=true \
  --set cni.exclusive=false \
  --set nodeinit.enabled=true \
  --set cni.configMap=cni-configuration \
  --set routingMode=native \
  --set enableIPv4Masquerade=false \
  --set endpointRoutes.enabled=true
```

## Step 3: Validate the Installation

```bash
# Wait for Cilium to be fully operational
cilium status --wait

# Run the Cilium connectivity test suite
cilium connectivity test

# Check that both CNI plugins appear in the chain
kubectl get configmap cni-configuration -n kube-system -o yaml | grep -E "azure-vnet|cilium-cni|portmap"

# Restart already-running non-host-network pods if the cluster was not created
# with the node.cilium.io/agent-not-ready taint
kubectl get pods --all-namespaces \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,HOSTNETWORK:.spec.hostNetwork \
  --no-headers=true | grep '<none>' | awk '{print "-n "$1" "$2}' | xargs -L 1 -r kubectl delete pod
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
kubectl get ciliumnetworkpolicy -n app backend-ingress-policy -o yaml
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

- Confirm the AKS node pool uses Linux (not Windows) nodes; Cilium requires Linux kernel 5.10+ or an equivalent distribution kernel.
- Keep `cni.exclusive=false` to prevent Cilium from removing the Azure CNI configuration.
- Use `cilium connectivity test` after installation to verify end-to-end connectivity before applying network policies.
- Monitor Cilium agent and node-init logs on AKS nodes for CNI chaining or Azure CNI transparent-mode errors.
- Plan a migration to Azure CNI Powered by Cilium for a managed Cilium dataplane on newer AKS node pools.

## Conclusion

Chaining Cilium onto Azure CNI legacy mode is a non-disruptive way to add advanced network security and observability to existing AKS clusters. Pods retain their Azure VNet IP addresses while gaining Cilium's powerful eBPF enforcement and Hubble's deep visibility into network flows.
