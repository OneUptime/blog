# How to Configure RKE2 Networking with Canal - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Canal, CNI, Networking, Rancher

Description: Learn how to configure Canal CNI (the default RKE2 network plugin combining Flannel and Calico) for Kubernetes pod networking.

Canal is the default CNI (Container Network Interface) plugin in RKE2. It combines Flannel for pod networking with Calico for network policy enforcement, giving you both simple overlay networking and powerful network policy capabilities. This guide covers Canal configuration options in RKE2.

## Prerequisites

- RKE2 installed or being installed
- Understanding of Kubernetes networking basics
- Network access between all nodes

## What is Canal CNI?

Canal combines two powerful networking solutions:

- **Flannel**: Provides inter-node pod networking, using VXLAN by default
- **Calico**: Provides intra-node pod networking and network policy enforcement while Flannel handles routing

## Step 1: Configure Canal in RKE2

Canal is the default CNI, so minimal configuration is needed:

```yaml
# /etc/rancher/rke2/config.yaml

# Canal is the default - this is optional but explicit
cni: canal

# Pod network CIDR
cluster-cidr: 10.42.0.0/16

# Flannel backend options are configured with the rke2-canal HelmChartConfig
```

## Step 2: Configure Flannel Backend

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-canal-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-canal
  namespace: kube-system
spec:
  valuesContent: |-
    flannel:
      # Configure Flannel to use WireGuard for encrypted pod communication
      # Linux kernels older than 5.6 may require an additional WireGuard module
      backend: "wireguard"

      # Or use VXLAN (default, works on most kernels)
      # backend: "vxlan"

      # Or use host-gw for non-overlay networking (all nodes must be on same L2)
      # backend: "host-gw"
```

```bash
# Restart Canal after changing this HelmChartConfig on an existing cluster
kubectl rollout restart daemonset/rke2-canal -n kube-system
```

## Step 3: Configure Network Policies with Canal/Calico

Canal's Calico component provides Kubernetes network policy support:

```yaml
# Example NetworkPolicy using Calico-backed Canal
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: my-app
spec:
  podSelector:
    matchLabels:
      role: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
```

```bash
# Apply network policy
kubectl apply -f network-policy.yaml

# Verify network policy is enforced
kubectl get networkpolicy -n my-app

# Test connectivity (should be blocked without matching labels)
kubectl run test-pod --image=busybox -n my-app --rm -it --restart=Never -- \
  wget -qO- --timeout=5 http://backend-service:8080
```

## Step 4: Using GlobalNetworkPolicy (Calico-specific)

When using Canal, you can use Calico's GlobalNetworkPolicy for cluster-wide rules:

```yaml
# global-network-policy.yaml - Uses the Calico CRDs installed with RKE2 Canal
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-all-except-dns
spec:
  # Apply to all Calico endpoints in the cluster
  selector: all()
  types:
  - Ingress
  - Egress
  egress:
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  - action: Allow
    protocol: TCP
    destination:
      ports: [53]
  # Allow all within the cluster
  - action: Allow
    destination:
      selector: all()
  ingress:
  # Allow all within the cluster
  - action: Allow
    source:
      selector: all()
```

## Step 5: Configure Canal with Custom VXLAN Settings

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-canal-config.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-canal
  namespace: kube-system
spec:
  valuesContent: |-
    flannel:
      # VXLAN port (0 uses the default: 8472)
      backendPort: 0

      # VXLAN Network Identifier (Linux default: 1)
      # vni: 1

      # Use direct routes for same-subnet nodes
      # directRouting: false

      # MTU for outgoing VXLAN or WireGuard packets
      # Leave unset to use the external interface MTU
      # mtu: 1450

    calico:
      # MTU used by the Calico CNI veth interface
      vethuMTU: 1450
```

## Step 6: Monitor Canal Network Health

```bash
# Check Canal pods in kube-system
kubectl get pods -n kube-system | grep canal

# Check the Canal DaemonSet
kubectl describe daemonset rke2-canal -n kube-system

# View Canal configuration
kubectl get configmap rke2-canal-config -n kube-system -o yaml

# Check Flannel logs
kubectl logs -n kube-system \
  $(kubectl get pods -n kube-system -l k8s-app=canal -o name | head -1) \
  -c kube-flannel --tail=50

# Check Calico logs
kubectl logs -n kube-system \
  $(kubectl get pods -n kube-system -l k8s-app=canal -o name | head -1) \
  -c calico-node --tail=50

# Test pod connectivity
kubectl run ping-test --image=busybox --rm -it --restart=Never -- \
  ping -c 3 TARGET_POD_IP
```

## Step 7: Troubleshoot Canal Networking Issues

```bash
# Check if Flannel interfaces are created on nodes
ip link show | grep flannel

# Check the flannel subnet configuration
cat /run/flannel/subnet.env

# Check the PodCIDRs that Canal uses with host-local IPAM
kubectl get nodes \
  -o custom-columns=NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs

# Check node routing
ip route show | grep 10.42

# Verify pod IPs are in the expected range
kubectl get pods -A -o wide | awk '{print $7}' | sort | uniq
```

## Conclusion

Canal CNI provides RKE2 with a solid default networking solution that combines the simplicity of Flannel with the network policy capabilities of Calico. For most production deployments, the default Canal configuration works well. When you need network isolation between namespaces, Canal's network policy support via Calico provides the enforcement engine. For environments requiring encrypted pod-to-pod traffic, configuring the WireGuard backend provides native kernel-level encryption without the overhead of a service mesh.
