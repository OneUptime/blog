# How to Set Up a Custom CNI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CNI, Networking, Cilium, Calico, Kubernetes

Description: Learn how to disable the default CNI in Talos Linux and deploy a custom container network interface plugin.

---

Talos Linux ships with Flannel as its default Container Network Interface (CNI) plugin. While Flannel is simple and reliable, many production environments need features like network policies, advanced load balancing, encryption, or better observability that only more feature-rich CNI plugins provide. Talos Linux fully supports running custom CNI plugins - you just need to disable the default one and deploy your preferred alternative.

This guide covers the process of configuring Talos Linux to use a custom CNI, with detailed examples for Cilium and Calico, the two most popular alternatives.

## Understanding CNI in Talos Linux

In Talos Linux, the CNI configuration is part of the cluster configuration. By default, Talos deploys Flannel as a set of manifests during cluster bootstrap. To use a different CNI, you tell Talos not to install Flannel, and then you deploy your chosen CNI yourself after the cluster is up.

The key setting is `cluster.network.cni`:

```yaml
# View the current CNI configuration
# Default Talos configuration uses Flannel
cluster:
  network:
    cni:
      name: flannel
```

## Disabling the Default CNI

To use a custom CNI, set the CNI name to `none` in your Talos configuration. This tells Talos not to install any CNI during bootstrap, leaving the responsibility to you:

```yaml
# custom-cni-base.yaml
# Disable the default CNI to use a custom one
cluster:
  network:
    cni:
      name: none
```

When generating a new cluster configuration:

```bash
# Generate a Talos config with no default CNI
talosctl gen config my-cluster https://api.mycluster.example.com:6443 \
  --config-patch @custom-cni-base.yaml
```

Or patch an existing configuration:

```bash
# Patch existing nodes to disable default CNI
talosctl apply-config --nodes 192.168.1.10 --patch @custom-cni-base.yaml
```

## Installing Cilium as the CNI

Cilium is an eBPF-based CNI that provides networking, security, and observability. It is one of the most feature-rich options available and works very well with Talos Linux.

### Step 1: Configure Talos for Cilium

```yaml
# talos-cilium-patch.yaml
# Talos configuration optimized for Cilium
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true  # Cilium replaces kube-proxy
machine:
  # Allow Cilium to manage networking
  network:
    kubespan:
      enabled: false
```

Apply to all nodes:

```bash
talosctl apply-config --nodes 192.168.1.10,192.168.1.20 --patch @talos-cilium-patch.yaml
```

### Step 2: Install Cilium

Use the Cilium CLI or Helm to install:

```bash
# Option 1: Using Cilium CLI
cilium install \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=192.168.1.10 \
  --set k8sServicePort=6443 \
  --set ipam.mode=kubernetes

# Option 2: Using Helm
helm repo add cilium https://helm.cilium.io/
helm repo update

helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=192.168.1.10 \
  --set k8sServicePort=6443 \
  --set ipam.mode=kubernetes \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup
```

### Step 3: Configure Cilium Values for Talos

For a more complete setup, use a values file:

```yaml
# cilium-values.yaml
# Cilium Helm values optimized for Talos Linux
kubeProxyReplacement: true
k8sServiceHost: 192.168.1.10
k8sServicePort: 6443

ipam:
  mode: kubernetes

# Enable Hubble for network observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true

# Talos-specific settings
cgroup:
  autoMount:
    enabled: false
  hostRoot: /sys/fs/cgroup

securityContext:
  capabilities:
    ciliumAgent:
      - CHOWN
      - KILL
      - NET_ADMIN
      - NET_RAW
      - IPC_LOCK
      - SYS_ADMIN
      - SYS_RESOURCE
      - DAC_OVERRIDE
      - FOWNER
      - SETGID
      - SETUID
    cleanCiliumState:
      - NET_ADMIN
      - SYS_ADMIN
      - SYS_RESOURCE

# Enable bandwidth manager
bandwidthManager:
  enabled: true

# Enable L7 policy
l7Proxy: true
```

## Installing Calico as the CNI

Calico is another popular CNI that provides networking and network policy enforcement. It supports both iptables and eBPF dataplanes.

### Step 1: Configure Talos for Calico

```yaml
# talos-calico-patch.yaml
# Talos configuration for Calico CNI
cluster:
  network:
    cni:
      name: none
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

### Step 2: Install Calico

```bash
# Install the Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Create the Calico custom resource
kubectl apply -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
    nodeAddressAutodetectionV4:
      firstFound: true
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
EOF
```

### Step 3: Verify Calico Installation

```bash
# Check Calico pods
kubectl get pods -n calico-system

# Verify Calico is managing network policies
kubectl get networkpolicies --all-namespaces

# Check Calico node status
kubectl get tigerastatus
```

## Verifying CNI Installation

Regardless of which CNI you chose, verify it is working:

```bash
# Check that all nodes are Ready
kubectl get nodes

# Check that CNI pods are running on every node
kubectl get pods -n kube-system -o wide | grep -E "cilium|calico"

# Test pod-to-pod connectivity
kubectl run test1 --image=busybox --restart=Never -- sleep 3600
kubectl run test2 --image=busybox --restart=Never -- sleep 3600

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/test1 pod/test2 --timeout=60s

# Test connectivity between pods
kubectl exec test1 -- ping -c 3 $(kubectl get pod test2 -o jsonpath='{.status.podIP}')

# Test DNS resolution
kubectl exec test1 -- nslookup kubernetes.default.svc.cluster.local

# Clean up test pods
kubectl delete pod test1 test2
```

## Applying Network Policies

One of the main reasons to use a custom CNI is network policy support. Here is an example policy:

```yaml
# default-deny-policy.yaml
# Default deny all ingress traffic in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
# Allow traffic only from specific pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

## Troubleshooting CNI Issues

If pods are stuck in `ContainerCreating` after deploying a custom CNI:

```bash
# Check CNI pod logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50

# Check for CNI binary on nodes
talosctl -n 192.168.1.20 ls /opt/cni/bin/

# Check kubelet logs for CNI errors
talosctl -n 192.168.1.20 logs kubelet | grep -i "cni\|network"

# Verify the pod CIDR is configured correctly
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
```

Setting up a custom CNI on Talos Linux is a two-step process: disable the default Flannel through Talos machine configuration, then deploy your chosen CNI as a Kubernetes workload. The Talos configuration ensures that no conflicting CNI is running, and the Kubernetes deployment gives you full control over the networking plugin's configuration and lifecycle.
