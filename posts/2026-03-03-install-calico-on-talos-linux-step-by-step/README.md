# How to Install Calico on Talos Linux Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Calico, CNI, Kubernetes, Networking

Description: A detailed step-by-step guide to installing Project Calico as your CNI plugin on Talos Linux for Kubernetes networking and security.

---

Calico is one of the most widely deployed CNI plugins in the Kubernetes ecosystem. It provides networking and network policy enforcement, and it scales well from small clusters to massive deployments with thousands of nodes. On Talos Linux, installing Calico requires disabling the default Flannel CNI and configuring a few Talos-specific settings. This guide walks through the entire process.

## Why Calico on Talos Linux

Calico offers several features that make it a solid choice for production Kubernetes clusters:

- Pure Layer 3 networking with BGP for routing
- Rich network policy support beyond what Kubernetes natively provides
- eBPF data plane option for better performance
- IP-in-IP and VXLAN encapsulation modes for different network environments
- Good documentation and a large community

Paired with Talos Linux's immutable, secure OS design, Calico provides a robust networking foundation.

## Step 1: Prepare the Talos Configuration

Talos ships with Flannel as its default CNI. You need to disable it before installing Calico. Create a configuration patch:

```yaml
# calico-talos-patch.yaml
cluster:
  network:
    # Disable the default Flannel CNI
    cni:
      name: none
    # Set the pod CIDR (Calico needs to know this)
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

Apply this patch during cluster generation or to existing nodes:

```bash
# For new clusters, include it in config generation
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --config-patch @calico-talos-patch.yaml

# For existing clusters, apply to each node
talosctl apply-config --nodes 192.168.1.10 --patch @calico-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.11 --patch @calico-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.12 --patch @calico-talos-patch.yaml
talosctl apply-config --nodes 192.168.1.20 --patch @calico-talos-patch.yaml
```

## Step 2: Bootstrap the Cluster

If you are creating a new cluster, proceed with the standard Talos bootstrap process:

```bash
# Apply configs to control plane nodes
talosctl apply-config --insecure --nodes 192.168.1.10 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.11 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.1.12 --file controlplane.yaml

# Bootstrap the cluster
talosctl bootstrap --nodes 192.168.1.10

# Get the kubeconfig
talosctl kubeconfig --nodes 192.168.1.10
```

At this point, nodes will show as NotReady because there is no CNI installed. That is expected.

```bash
# Nodes will be NotReady until Calico is installed
kubectl get nodes
# NAME        STATUS     ROLES           AGE   VERSION
# cp1         NotReady   control-plane   2m    v1.29.0
# cp2         NotReady   control-plane   2m    v1.29.0
# cp3         NotReady   control-plane   2m    v1.29.0
```

## Step 3: Install Calico Using the Tigera Operator

The recommended way to install Calico is through the Tigera operator:

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for the operator to be ready
kubectl get pods -n tigera-operator --watch
```

Now create the Installation resource to tell the operator how to configure Calico:

```yaml
# calico-installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use the same pod CIDR as your cluster
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 10.244.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
    # Enable both IPv4 and optionally IPv6
    linuxDataplane: Iptables
    # Use VXLAN for encapsulation (works in most environments)
    # Other options: IPIP, IPIPCrossSubnet, VXLAN, VXLANCrossSubnet, None
  # Flex volume path for Talos Linux
  flexVolumePath: /var/lib/kubelet/volumeplugins
  # Node metrics port
  nodeMetricsPort: 9091
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

```bash
# Apply the installation configuration
kubectl apply -f calico-installation.yaml

# Watch the Calico components deploy
kubectl get pods -n calico-system --watch
```

## Step 4: Wait for Calico to Be Ready

Calico deploys several components. Wait for all of them to be running:

```bash
# Check all Calico pods
kubectl get pods -n calico-system

# Expected pods:
# calico-node-xxxxx (one per node - DaemonSet)
# calico-typha-xxxxx (scaling component)
# calico-kube-controllers-xxxxx
# csi-node-driver-xxxxx (one per node)

# Check the Calico API server
kubectl get pods -n calico-apiserver

# Verify nodes are now Ready
kubectl get nodes
# NAME        STATUS   ROLES           AGE   VERSION
# cp1         Ready    control-plane   5m    v1.29.0
# cp2         Ready    control-plane   5m    v1.29.0
# cp3         Ready    control-plane   5m    v1.29.0
```

## Step 5: Install calicoctl

calicoctl is the Calico CLI tool for managing network policies and configuration:

```bash
# Install calicoctl (macOS)
brew install calico

# Or download directly
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/

# Configure calicoctl to use the Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify Calico is healthy
calicoctl node status
```

## Step 6: Verify Networking

Test that pod-to-pod communication works:

```bash
# Create test pods on different nodes
kubectl run test-a --image=busybox:1.36 --restart=Never --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"worker-1"}}}' -- sleep 3600
kubectl run test-b --image=busybox:1.36 --restart=Never --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"worker-2"}}}' -- sleep 3600

# Wait for pods to be ready
kubectl wait --for=condition=Ready pod/test-a pod/test-b --timeout=60s

# Test connectivity
TESTB_IP=$(kubectl get pod test-b -o jsonpath='{.status.podIP}')
kubectl exec test-a -- ping -c 3 $TESTB_IP

# Test DNS
kubectl exec test-a -- nslookup kubernetes.default.svc.cluster.local

# Test service connectivity
kubectl exec test-a -- wget -qO- http://kubernetes.default.svc.cluster.local/healthz

# Clean up
kubectl delete pod test-a test-b
```

## Step 7: Configure Network Policies

One of Calico's strengths is its network policy support. Here is a basic example:

```yaml
# default-deny-policy.yaml
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
# allow-web-traffic.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from: []
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
```

Calico also supports its own extended network policy format for features beyond the Kubernetes standard:

```yaml
# calico-global-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-external-egress
spec:
  selector: app == 'restricted'
  types:
  - Egress
  egress:
  # Allow DNS
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 53
  # Allow internal cluster traffic
  - action: Allow
    destination:
      nets:
      - 10.244.0.0/16
      - 10.96.0.0/12
  # Deny everything else
  - action: Deny
```

## Troubleshooting

If Calico pods are not starting:

```bash
# Check Calico node logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100

# Check the Tigera operator logs
kubectl logs -n tigera-operator -l k8s-app=tigera-operator --tail=100

# Check IP pool configuration
calicoctl get ippools -o wide

# Check node status
calicoctl node status

# Check for BGP peering issues
calicoctl get bgpConfiguration -o yaml
```

Common issues on Talos Linux:

- **FlexVolume path** - Make sure `flexVolumePath` is set to `/var/lib/kubelet/volumeplugins`
- **Pod CIDR mismatch** - The IP pool CIDR must match your cluster's pod subnet
- **Encapsulation mode** - VXLAN works in most environments; use IPIP only if your network supports protocol 4

## Summary

Installing Calico on Talos Linux involves disabling the default CNI, installing the Tigera operator, and configuring the Installation resource with Talos-compatible settings. Once installed, Calico provides reliable Layer 3 networking with rich network policy support. The combination of Talos Linux's security-focused design and Calico's mature networking stack gives you a production-ready Kubernetes platform with strong network isolation capabilities.
