# How to Set Up Dual-Stack (IPv4/IPv6) Networking in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Dual-Stack, IPv4, IPv6, Networking, Kubernetes

Description: Complete guide to configuring dual-stack IPv4 and IPv6 networking in Talos Linux for both node-level and Kubernetes cluster networking.

---

Dual-stack networking lets your Talos Linux nodes and Kubernetes pods communicate over both IPv4 and IPv6 simultaneously. This is becoming increasingly important as organizations transition from IPv4 to IPv6 but still need backward compatibility. Instead of picking one protocol or the other, dual-stack gives you both, which means your services can be reached over either protocol.

In this guide, we will set up dual-stack networking on Talos Linux from scratch, covering host-level configuration, Kubernetes cluster settings, and CNI plugin configuration.

## What is Dual-Stack Networking?

Dual-stack means every network interface, every pod, and every Kubernetes service gets both an IPv4 address and an IPv6 address. Traffic is routed over whichever protocol the client prefers or the destination requires. This is different from running IPv6-only or IPv4-only, where you are limited to a single protocol.

In a Kubernetes context, dual-stack means:

- Each node has both IPv4 and IPv6 addresses
- Each pod gets both an IPv4 and an IPv6 address
- Services can have both ClusterIP types (IPv4 and IPv6)
- Ingress can serve traffic over both protocols

## Prerequisites

Before setting up dual-stack, make sure your environment meets these requirements:

- Talos Linux v1.5 or later
- Kubernetes 1.23 or later (dual-stack is GA since 1.23)
- A CNI plugin that supports dual-stack (Cilium, Calico, or recent Flannel)
- Your underlying network infrastructure supports both IPv4 and IPv6
- Available IPv4 and IPv6 address ranges for nodes, pods, and services

## Step 1: Configure Node-Level Dual-Stack

Start by giving each node both an IPv4 and IPv6 address in the machine configuration:

```yaml
# Dual-stack node network configuration
machine:
  network:
    hostname: cp-01
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24        # IPv4 address
          - 2001:db8:1::10/64      # IPv6 address
        routes:
          - network: 0.0.0.0/0      # IPv4 default route
            gateway: 192.168.1.1
          - network: ::/0            # IPv6 default route
            gateway: 2001:db8:1::1
    nameservers:
      - 8.8.8.8                     # IPv4 DNS
      - 2001:4860:4860::8888        # IPv6 DNS
```

Apply and verify:

```bash
# Apply the dual-stack machine config
talosctl -n 192.168.1.10 apply-config --file machine-config.yaml

# Verify both addresses are assigned
talosctl -n 192.168.1.10 get addresses

# Check both routes exist
talosctl -n 192.168.1.10 get routes
```

You should see both an IPv4 and an IPv6 address on the same interface, with default routes for both protocols.

## Step 2: Configure Kubernetes Cluster for Dual-Stack

The cluster configuration needs dual-stack pod and service CIDRs:

```yaml
# Dual-stack cluster configuration
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16               # IPv4 pod CIDR
      - fd00:10:244::/48             # IPv6 pod CIDR
    serviceSubnets:
      - 10.96.0.0/12                 # IPv4 service CIDR
      - fd00:10:96::/112             # IPv6 service CIDR
    cni:
      name: custom                   # Use custom CNI for dual-stack
```

The order of the CIDRs matters. The first entry is the primary protocol. If you list IPv4 first, pods will prefer IPv4. If you list IPv6 first, pods will prefer IPv6.

## Step 3: Disable the Default CNI

Since Flannel's dual-stack support has historically been limited, most dual-stack setups use Cilium or Calico. Disable the default CNI:

```yaml
# Disable the default Flannel CNI
cluster:
  network:
    cni:
      name: none    # We will install our own CNI
```

## Step 4: Install a Dual-Stack CNI

### Option A: Cilium with Dual-Stack

Cilium has excellent dual-stack support. Install it with the appropriate settings:

```bash
# Install Cilium CLI
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with dual-stack enabled
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipv4.enabled=true \
  --set ipv6.enabled=true \
  --set ipam.mode=kubernetes \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="10.244.0.0/16" \
  --set ipam.operator.clusterPoolIPv4MaskSize=24 \
  --set ipam.operator.clusterPoolIPv6PodCIDRList="fd00:10:244::/48" \
  --set ipam.operator.clusterPoolIPv6MaskSize=120
```

### Option B: Calico with Dual-Stack

Calico also supports dual-stack well:

```bash
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Create dual-stack installation config
cat <<'EOF' | kubectl apply -f -
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - cidr: 10.244.0.0/16
        encapsulation: VXLAN
      - cidr: fd00:10:244::/48
        encapsulation: VXLAN
EOF
```

## Step 5: Verify Dual-Stack is Working

After the CNI is installed and pods are running, verify dual-stack is functional:

```bash
# Check that nodes have both address families
kubectl get nodes -o wide

# Verify pods have dual-stack addresses
kubectl get pods -A -o wide

# Check a specific pod for dual-stack addresses
kubectl describe pod <pod-name> | grep -i "ip"

# Create a test deployment
kubectl create deployment test-ds --image=nginx --replicas=2

# Check that the test pods got both addresses
kubectl get pods -l app=test-ds -o jsonpath='{range .items[*]}{.status.podIPs}{"\n"}{end}'
```

The `podIPs` field should show both an IPv4 and an IPv6 address for each pod.

## Step 6: Create Dual-Stack Services

Kubernetes services in a dual-stack cluster can be configured with different IP family policies:

```yaml
# Dual-stack service - accessible on both IPv4 and IPv6
apiVersion: v1
kind: Service
metadata:
  name: my-service-dual
spec:
  selector:
    app: my-app
  ipFamilyPolicy: PreferDualStack  # Or RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
  ports:
    - port: 80
      targetPort: 8080
```

The three IP family policies are:

- **SingleStack**: Service gets only one IP family (the cluster default)
- **PreferDualStack**: Service gets both families if available, falls back to single
- **RequireDualStack**: Service must get both families or creation fails

```bash
# Verify a dual-stack service has both IPs
kubectl get svc my-service-dual -o jsonpath='{.spec.clusterIPs}'
```

## Step 7: Configure Ingress for Dual-Stack

Your ingress controller also needs to support dual-stack to serve traffic over both protocols:

```yaml
# Ingress controller service with dual-stack
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  ports:
    - name: http
      port: 80
    - name: https
      port: 443
```

## Troubleshooting Dual-Stack Issues

### Pods Only Getting One Address Family

If pods are only getting IPv4 or only IPv6 addresses, check the CNI configuration:

```bash
# For Cilium, verify dual-stack is enabled
kubectl get configmap -n kube-system cilium-config -o yaml | grep -i "ipv[46]"

# Check node allocations
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDRs}{"\n"}{end}'
```

Each node should have two pod CIDRs listed - one IPv4 and one IPv6.

### Service ClusterIP Not Allocated

If services are not getting dual-stack ClusterIPs, verify the kube-apiserver configuration:

```bash
# Check the service CIDR configuration
talosctl -n <node-ip> get machineconfig -o yaml | grep -A 5 serviceSubnet
```

Make sure both IPv4 and IPv6 service subnets are configured.

### Connectivity Between Dual-Stack Pods

If pods can communicate over one protocol but not the other, check routing:

```bash
# Verify IPv6 forwarding is enabled
talosctl -n <node-ip> read /proc/sys/net/ipv6/conf/all/forwarding

# Check CNI routes for both protocols
kubectl exec -n kube-system <cni-pod> -- ip -6 route show
kubectl exec -n kube-system <cni-pod> -- ip -4 route show
```

## Performance Considerations

Dual-stack adds some overhead compared to single-stack networking. Each pod needs two addresses, and the CNI needs to maintain routes for both address families. In practice, this overhead is minimal for most workloads, but keep it in mind for very large clusters.

```yaml
# Ensure sufficient address space for both families
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
```

## Conclusion

Setting up dual-stack networking on Talos Linux requires coordination across multiple layers, from node-level interface configuration to Kubernetes cluster settings to CNI plugin configuration. The key is making sure every layer is aware of and configured for both IPv4 and IPv6. Start with node-level dual-stack, then configure Kubernetes with dual CIDR ranges, install a dual-stack capable CNI like Cilium or Calico, and finally verify that pods and services are getting addresses in both address families. Once it is working, dual-stack gives your cluster the flexibility to serve traffic over either protocol without any application changes.
