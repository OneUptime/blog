# How to Configure AKS with Bring Your Own CNI Plugin for Custom Networking Solutions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, CNI, Networking, Kubernetes, Cilium, Calico, Azure

Description: Learn how to deploy AKS clusters with the bring-your-own CNI option and install custom CNI plugins like Cilium for advanced networking capabilities.

---

AKS ships with two built-in CNI options: Azure CNI and kubenet. Azure CNI gives every pod a VNet IP address, which is great for VNet integration but eats through IP addresses quickly. Kubenet uses a simpler overlay approach but lacks some enterprise features. Neither option fits every use case.

The bring-your-own-CNI (BYOCNI) option lets you deploy an AKS cluster without any CNI plugin pre-installed. You then install whatever CNI you want - Cilium, Calico, Flannel, or anything else that implements the CNI specification. This gives you full control over your cluster's networking stack.

## Why Bring Your Own CNI

There are several reasons teams choose BYOCNI:

- **Advanced network policy**: Cilium's eBPF-based network policies are significantly more powerful and performant than what Azure CNI offers out of the box
- **Service mesh integration**: Some CNI plugins (Cilium, Linkerd with its CNI plugin) offer built-in service mesh capabilities
- **IP address conservation**: Overlay-based CNIs like Cilium in overlay mode do not consume VNet IP addresses per pod
- **Observability**: Cilium Hubble provides deep network observability that is not available with the built-in options
- **Consistency across clouds**: If you run Kubernetes on multiple clouds, using the same CNI everywhere simplifies operations

## Prerequisites

- Azure CLI 2.50 or later
- kubectl configured for your target cluster
- Helm 3.x for installing CNI plugins
- Familiarity with Kubernetes networking concepts

## Step 1: Create an AKS Cluster with BYOCNI

When creating the cluster, specify `none` as the network plugin. This tells AKS to skip CNI installation entirely.

```bash
# Create resource group
az group create --name myBYOCNIRG --location eastus

# Create AKS cluster with no CNI plugin
# The cluster will start but pods will not have networking until you install a CNI
az aks create \
  --resource-group myBYOCNIRG \
  --name myBYOCNICluster \
  --network-plugin none \
  --node-count 3 \
  --generate-ssh-keys
```

After the cluster is created, get credentials:

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group myBYOCNIRG \
  --name myBYOCNICluster
```

At this point, the nodes will be in a NotReady state and system pods like CoreDNS will be pending. This is expected because there is no CNI to assign pod IPs or set up networking.

```bash
# Verify nodes are NotReady (expected before CNI installation)
kubectl get nodes
# NAME                                STATUS     ROLES   AGE   VERSION
# aks-nodepool1-12345678-vmss000000   NotReady   agent   2m    v1.29.2
# aks-nodepool1-12345678-vmss000001   NotReady   agent   2m    v1.29.2
# aks-nodepool1-12345678-vmss000002   NotReady   agent   2m    v1.29.2
```

## Step 2: Install Cilium as the CNI

Cilium is the most popular choice for BYOCNI on AKS. It uses eBPF for high-performance networking and provides advanced features like transparent encryption, network policies, and Hubble observability.

First, add the Cilium Helm repository:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update
```

Now install Cilium with settings optimized for AKS:

```yaml
# cilium-values.yaml
# Cilium configuration optimized for AKS BYOCNI deployment
aksbyocni:
  # Tell Cilium it is running on AKS in BYOCNI mode
  enabled: true
nodeinit:
  # Enable node initialization for AKS
  enabled: true
ipam:
  # Use Cilium's cluster-pool IPAM for overlay networking
  mode: cluster-pool
  operator:
    # Pod CIDR range - choose a range that does not overlap with your VNet
    clusterPoolIPv4PodCIDRList:
      - "10.244.0.0/16"
    clusterPoolIPv4MaskSize: 24
tunnel:
  # Use VXLAN tunneling for pod-to-pod traffic
  protocol: vxlan
hubble:
  # Enable Hubble for network observability
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
operator:
  # Run the operator with 1 replica for smaller clusters
  replicas: 1
kubeProxyReplacement:
  # Let Cilium replace kube-proxy for better performance
  true
```

```bash
# Install Cilium using the values file
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --values cilium-values.yaml
```

## Step 3: Verify the Installation

After Cilium is installed, nodes should transition to Ready and system pods should start running.

```bash
# Wait for Cilium pods to be ready
kubectl -n kube-system rollout status daemonset/cilium --timeout=300s

# Check that all nodes are now Ready
kubectl get nodes

# Verify Cilium status
kubectl -n kube-system exec ds/cilium -- cilium status --brief

# Check that all system pods are running
kubectl get pods -n kube-system
```

Run the Cilium connectivity test to validate that networking is fully functional:

```bash
# Install the Cilium CLI for testing
# (On macOS)
brew install cilium-cli

# Run the connectivity test
cilium connectivity test
```

The connectivity test creates test pods and validates pod-to-pod, pod-to-service, and pod-to-external connectivity. It takes a few minutes to complete.

## Step 4: Configure Network Policies with Cilium

One of the biggest advantages of Cilium over the built-in Azure CNI is its network policy engine. Cilium supports both standard Kubernetes NetworkPolicies and its own CiliumNetworkPolicy CRD, which offers layer 7 (HTTP) filtering.

Here is a standard Kubernetes NetworkPolicy:

```yaml
# network-policy.yaml
# Standard Kubernetes NetworkPolicy - deny all ingress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

And here is a Cilium-specific policy that filters HTTP traffic:

```yaml
# cilium-http-policy.yaml
# CiliumNetworkPolicy with L7 HTTP filtering
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-http-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        # Only allow GET and POST to specific paths
        - method: GET
          path: "/api/v1/.*"
        - method: POST
          path: "/api/v1/orders"
```

This level of control is not possible with the built-in Azure CNI network policies.

## Step 5: Enable Hubble Observability

If you enabled Hubble in the Cilium values, you can now access network flow data for troubleshooting and monitoring.

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Open http://localhost:12000 in your browser to see the Hubble UI

# Use the Hubble CLI for command-line flow observation
# Install Hubble CLI
brew install hubble

# Port-forward the Hubble relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Observe real-time network flows
hubble observe --namespace production

# Filter for dropped traffic (useful for debugging network policies)
hubble observe --namespace production --verdict DROPPED
```

## Alternative: Installing Calico

If you prefer Calico over Cilium, the process is similar. Create the cluster the same way with `--network-plugin none`, then install Calico.

```bash
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Create the Calico installation configuration
kubectl apply -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    bgp: Disabled
    ipPools:
    - cidr: 10.244.0.0/16
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
EOF

# Wait for Calico to be ready
kubectl rollout status daemonset/calico-node -n calico-system --timeout=300s
```

## Upgrading Your CNI

One important consideration with BYOCNI is that you are responsible for CNI upgrades. AKS will not automatically update your CNI plugin during cluster upgrades.

```bash
# Upgrade Cilium using Helm
helm upgrade cilium cilium/cilium \
  --version 1.16.0 \
  --namespace kube-system \
  --values cilium-values.yaml

# Monitor the upgrade
kubectl -n kube-system rollout status daemonset/cilium
```

Always test CNI upgrades in a staging cluster first. A broken CNI means complete loss of pod networking.

## Troubleshooting BYOCNI Issues

Common problems and their solutions:

**Nodes stuck in NotReady after CNI install**: Check the CNI DaemonSet logs. The CNI binary might not be installed correctly on the nodes.

```bash
# Check Cilium agent logs for errors
kubectl -n kube-system logs ds/cilium --tail=50

# Check if the CNI binary is installed on nodes
kubectl debug node/<node-name> -it --image=busybox -- ls /host/opt/cni/bin/
```

**Pods cannot resolve DNS**: Make sure CoreDNS pods are running. They depend on the CNI being functional.

```bash
# Check CoreDNS status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS from a pod
kubectl run dns-test --rm -it --image=busybox -- nslookup kubernetes.default
```

**Pod-to-pod connectivity issues**: Verify that the tunnel protocol (VXLAN or Geneve) is not blocked by Azure NSG rules.

```bash
# Check Cilium connectivity status
kubectl -n kube-system exec ds/cilium -- cilium status
kubectl -n kube-system exec ds/cilium -- cilium node list
```

## Considerations Before Choosing BYOCNI

BYOCNI gives you flexibility but adds operational responsibility. You need to handle CNI upgrades, monitor CNI health, and troubleshoot networking issues that Microsoft support may not be able to help with (since it is not their software). If you are comfortable with that tradeoff, BYOCNI with Cilium is arguably the best networking option for AKS. If you want a fully managed experience, stick with Azure CNI or Azure CNI Overlay.

The decision ultimately comes down to whether the advanced features (eBPF-based networking, L7 policies, Hubble observability, kube-proxy replacement) justify the extra operational work. For most production clusters running complex microservice architectures, they absolutely do.
