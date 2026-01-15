# How to Deploy an IPv6-Only Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Kubernetes, Networking, DevOps, Containers, Infrastructure

Description: A comprehensive guide to deploying production-ready IPv6-only Kubernetes clusters using kubeadm, including CNI configuration, service networking, and troubleshooting strategies.

---

IPv4 addresses are running out. ARIN, RIPE, and other regional registries have exhausted their pools, and organizations are paying premium prices for legacy allocations. Meanwhile, IPv6 offers a practically unlimited address space (340 undecillion addresses) and eliminates the NAT complexity that plagues modern cloud architectures. Running an IPv6-only Kubernetes cluster is not just forward-thinking; it is becoming a practical necessity for organizations scaling globally.

This guide walks you through deploying a production-ready IPv6-only Kubernetes cluster from scratch using kubeadm.

## Why IPv6-Only?

Before diving into the technical details, understand why you might choose IPv6-only over dual-stack or IPv4-only:

**Simplified networking:** No more NAT traversal headaches. Every pod gets a globally unique address (or at least a unique address within your network), eliminating the complexity of SNAT/DNAT rules.

**Larger address space:** With IPv6, you can assign unique addresses to every pod across thousands of clusters without worrying about CIDR conflicts or IP exhaustion.

**Cloud cost savings:** Some cloud providers charge for IPv4 addresses. AWS, for example, started charging $0.005 per hour per public IPv4 address in 2024. IPv6 addresses remain free.

**Future-proofing:** Major cloud providers, CDNs, and ISPs have embraced IPv6. Building IPv6-native now avoids painful migrations later.

**Compliance requirements:** Some government and enterprise contracts mandate IPv6 support.

## Prerequisites

Before starting, ensure you have the following:

### Hardware/Infrastructure Requirements

- At least 3 nodes (1 control plane, 2 workers) with IPv6 connectivity
- Each node needs a routable IPv6 address (either public or ULA)
- IPv6 forwarding enabled on all nodes
- No NAT64 or DNS64 between nodes

### Software Requirements

- Ubuntu 22.04 LTS or later (this guide uses Ubuntu 24.04)
- containerd 1.7+ as the container runtime
- kubeadm, kubelet, and kubectl v1.29+
- A CNI plugin that supports IPv6 (Calico, Cilium, or Flannel)

### Network Planning

Plan your IPv6 address allocation before starting. You will need:

| Purpose | Example CIDR | Notes |
| --- | --- | --- |
| Node network | 2001:db8:1::/64 | Addresses for node interfaces |
| Pod network | 2001:db8:42::/48 | Large block for pod IPs |
| Service network | 2001:db8:43::/112 | ClusterIP range (65,536 addresses) |

For production environments, replace 2001:db8::/32 (documentation prefix) with your actual allocated IPv6 prefix.

## Preparing the Nodes

Run these steps on all nodes (control plane and workers).

### Step 1: Enable IPv6 Forwarding

Kubernetes requires IPv6 forwarding to route traffic between pods. Enable it persistently.

```bash
# Create sysctl configuration for IPv6 networking
cat <<EOF | sudo tee /etc/sysctl.d/99-kubernetes-ipv6.conf
# Enable IPv6 forwarding for Kubernetes pod networking
net.ipv6.conf.all.forwarding = 1

# Enable IPv6 on all interfaces
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.default.disable_ipv6 = 0

# Accept Router Advertisements even when forwarding is enabled
# Required for some network configurations
net.ipv6.conf.all.accept_ra = 2
net.ipv6.conf.default.accept_ra = 2

# Disable IPv4 (optional - only for pure IPv6-only clusters)
net.ipv4.conf.all.disable_ipv4 = 1
net.ipv4.conf.default.disable_ipv4 = 1
EOF

# Apply the settings immediately
sudo sysctl --system
```

### Step 2: Configure Static IPv6 Addresses

If your nodes do not receive IPv6 addresses via SLAAC or DHCPv6, configure them statically using netplan.

```yaml
# /etc/netplan/01-ipv6-config.yaml
# Static IPv6 configuration for Kubernetes node
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      # Disable IPv4 for pure IPv6-only deployment
      dhcp4: false
      # Enable IPv6 configuration
      dhcp6: false
      addresses:
        # Replace with your actual IPv6 address and prefix
        - "2001:db8:1::10/64"
      routes:
        # Default route via IPv6 gateway
        - to: "::/0"
          via: "2001:db8:1::1"
      nameservers:
        # Google and Cloudflare public IPv6 DNS servers
        addresses:
          - "2001:4860:4860::8888"
          - "2606:4700:4700::1111"
```

Apply the netplan configuration.

```bash
# Apply network configuration
sudo netplan apply

# Verify IPv6 connectivity
ping6 -c 3 2001:4860:4860::8888
```

### Step 3: Install Container Runtime (containerd)

Install and configure containerd with IPv6 support.

```bash
# Install containerd from Ubuntu repositories
sudo apt-get update
sudo apt-get install -y containerd

# Create default containerd configuration
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable systemd cgroup driver (required for Kubernetes 1.22+)
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Restart containerd to apply changes
sudo systemctl restart containerd
sudo systemctl enable containerd
```

### Step 4: Install Kubernetes Components

Add the Kubernetes repository and install kubeadm, kubelet, and kubectl.

```bash
# Install required packages for HTTPS repositories
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

# Add Kubernetes GPG key
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Add Kubernetes repository
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install Kubernetes components
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl

# Prevent automatic updates that could break the cluster
sudo apt-mark hold kubelet kubeadm kubectl
```

### Step 5: Load Required Kernel Modules

Load the kernel modules required for Kubernetes networking.

```bash
# Create module loading configuration
cat <<EOF | sudo tee /etc/modules-load.d/kubernetes.conf
# Required for Kubernetes networking
overlay
br_netfilter
ip6_tables
ip6table_filter
ip6table_mangle
EOF

# Load modules immediately
sudo modprobe overlay
sudo modprobe br_netfilter
sudo modprobe ip6_tables
sudo modprobe ip6table_filter
sudo modprobe ip6table_mangle

# Verify modules are loaded
lsmod | grep -E "overlay|br_netfilter|ip6"
```

## Initializing the Control Plane

With all nodes prepared, initialize the Kubernetes control plane on your designated control plane node.

### Step 1: Create kubeadm Configuration

Create a kubeadm configuration file that specifies IPv6-only networking.

```yaml
# kubeadm-config-ipv6.yaml
# Configuration for IPv6-only Kubernetes cluster initialization
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  # Control plane node's IPv6 address
  advertiseAddress: "2001:db8:1::10"
  bindPort: 6443
nodeRegistration:
  # Use containerd as the container runtime
  criSocket: unix:///var/run/containerd/containerd.sock
  # Taint control plane to prevent workload scheduling (optional)
  taints:
    - key: "node-role.kubernetes.io/control-plane"
      effect: "NoSchedule"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
# Kubernetes version to deploy
kubernetesVersion: "v1.29.0"
# Cluster name for identification
clusterName: "ipv6-cluster"
networking:
  # IPv6 pod network CIDR - must be large enough for all pods
  podSubnet: "2001:db8:42::/48"
  # IPv6 service network CIDR - /112 provides 65,536 ClusterIPs
  serviceSubnet: "2001:db8:43::/112"
  # Internal DNS domain
  dnsDomain: "cluster.local"
# API server configuration
apiServer:
  extraArgs:
    # Bind to IPv6 address
    bind-address: "::"
    # Advertise the control plane's IPv6 address
    advertise-address: "2001:db8:1::10"
# Controller manager configuration
controllerManager:
  extraArgs:
    # Bind to IPv6
    bind-address: "::"
    # Allocate node CIDRs from the pod subnet
    allocate-node-cidrs: "true"
    # Size of CIDR allocated to each node
    node-cidr-mask-size: "64"
# Scheduler configuration
scheduler:
  extraArgs:
    # Bind to IPv6
    bind-address: "::"
# etcd configuration
etcd:
  local:
    extraArgs:
      # Listen on IPv6 for client connections
      listen-client-urls: "https://[::1]:2379,https://[2001:db8:1::10]:2379"
      # Advertise IPv6 address to clients
      advertise-client-urls: "https://[2001:db8:1::10]:2379"
      # Listen on IPv6 for peer connections
      listen-peer-urls: "https://[2001:db8:1::10]:2380"
      # Advertise peer URL
      initial-advertise-peer-urls: "https://[2001:db8:1::10]:2380"
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Use systemd as cgroup driver (matches containerd)
cgroupDriver: systemd
# Bind healthz endpoint to IPv6
healthzBindAddress: "::1"
# Cluster DNS service IPv6 address
clusterDNS:
  - "2001:db8:43::a"
```

### Step 2: Initialize the Cluster

Run kubeadm init with the configuration file.

```bash
# Initialize the Kubernetes control plane with IPv6 configuration
sudo kubeadm init --config=kubeadm-config-ipv6.yaml --upload-certs

# The output will include a join command for worker nodes
# Save this command for later use
```

### Step 3: Configure kubectl Access

Set up kubectl access for the current user.

```bash
# Create kubectl configuration directory
mkdir -p $HOME/.kube

# Copy admin configuration
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# Set correct ownership
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verify cluster access
kubectl cluster-info
```

Expected output showing IPv6 addresses:

```
Kubernetes control plane is running at https://[2001:db8:1::10]:6443
CoreDNS is running at https://[2001:db8:1::10]:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

## Installing a CNI Plugin for IPv6

Kubernetes requires a CNI (Container Network Interface) plugin to provide pod networking. For IPv6-only clusters, we recommend Calico or Cilium.

### Option A: Calico for IPv6

Calico is a mature CNI with excellent IPv6 support.

```bash
# Download Calico operator manifest
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

Create a Calico installation manifest for IPv6-only.

```yaml
# calico-ipv6-installation.yaml
# Calico CNI configuration for IPv6-only Kubernetes cluster
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use Calico CNI plugin
  cni:
    type: Calico
  # Calico networking configuration
  calicoNetwork:
    # IPv6 pool configuration
    ipPools:
      # IPv6 pod network pool
      - name: default-ipv6-ippool
        # Must match podSubnet from kubeadm config
        cidr: "2001:db8:42::/48"
        # Size of per-node allocation
        blockSize: 64
        # Enable NAT for outgoing traffic (if needed for internet access)
        natOutgoing: Disabled
        # Encapsulation mode - None for native IPv6 routing
        encapsulation: None
        # Assign addresses to pods
        nodeSelector: all()
    # Node address autodetection for IPv6
    nodeAddressAutodetectionV6:
      # Detect IPv6 address from first valid interface
      firstFound: true
    # Enable BGP for route distribution (optional, for large clusters)
    bgp: Disabled
---
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

Apply the Calico configuration.

```bash
# Apply Calico installation manifest
kubectl apply -f calico-ipv6-installation.yaml

# Wait for Calico pods to become ready
kubectl wait --for=condition=Ready pods -l k8s-app=calico-node -n calico-system --timeout=300s

# Verify Calico is running
kubectl get pods -n calico-system
```

### Option B: Cilium for IPv6

Cilium offers advanced networking features with eBPF-based dataplane.

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz
```

Create a Cilium configuration for IPv6-only.

```yaml
# cilium-ipv6-values.yaml
# Helm values for Cilium CNI with IPv6-only configuration
ipv4:
  # Disable IPv4 for pure IPv6-only cluster
  enabled: false
ipv6:
  # Enable IPv6 networking
  enabled: true
ipam:
  # Use Kubernetes-native IPAM
  mode: kubernetes
  operator:
    # IPv6 pod CIDR - must match kubeadm podSubnet
    clusterPoolIPv6PodCIDRList:
      - "2001:db8:42::/48"
    # Per-node mask size
    clusterPoolIPv6MaskSize: 64
# Tunnel mode configuration
tunnel: disabled
# Enable native routing for IPv6
nativeRoutingCIDR: "2001:db8:42::/48"
# Auto-detect node IPv6 address
autoDirectNodeRoutes: true
# Kubernetes service configuration
kubeProxyReplacement: true
k8sServiceHost: "2001:db8:1::10"
k8sServicePort: 6443
# Operator configuration
operator:
  replicas: 1
# Enable Hubble for observability (optional)
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

Install Cilium using Helm or the CLI.

```bash
# Install Cilium with IPv6 configuration
cilium install --version 1.15.0 --helm-set-file values.yaml=cilium-ipv6-values.yaml

# Wait for Cilium to be ready
cilium status --wait

# Verify Cilium connectivity
cilium connectivity test
```

### Option C: Flannel for IPv6

Flannel is simpler but has fewer features. Use it for basic setups.

```yaml
# flannel-ipv6.yaml
# Flannel CNI configuration for IPv6-only cluster
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-flannel
  labels:
    pod-security.kubernetes.io/enforce: privileged
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "EnableIPv4": false,
      "EnableIPv6": true,
      "IPv6Network": "2001:db8:42::/48",
      "IPv6Backend": {
        "Type": "vxlan",
        "VNI": 1,
        "DirectRouting": true
      }
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-flannel-ds
  namespace: kube-flannel
spec:
  selector:
    matchLabels:
      app: flannel
  template:
    metadata:
      labels:
        app: flannel
    spec:
      hostNetwork: true
      priorityClassName: system-node-critical
      tolerations:
        - operator: Exists
      containers:
        - name: kube-flannel
          image: docker.io/flannel/flannel:v0.24.0
          command:
            - /opt/bin/flanneld
          args:
            - --ip-masq
            - --kube-subnet-mgr
            # Enable IPv6 mode
            - --iface-can-reach=2001:db8:1::1
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          volumeMounts:
            - name: run
              mountPath: /run/flannel
            - name: flannel-cfg
              mountPath: /etc/kube-flannel/
          securityContext:
            privileged: true
            capabilities:
              add: ["NET_ADMIN", "NET_RAW"]
      volumes:
        - name: run
          hostPath:
            path: /run/flannel
        - name: flannel-cfg
          configMap:
            name: kube-flannel-cfg
```

## Joining Worker Nodes

After the CNI is installed and running, join the worker nodes to the cluster.

### Step 1: Get the Join Command

On the control plane node, generate a new join command if needed.

```bash
# Generate a new join token (valid for 24 hours)
kubeadm token create --print-join-command
```

### Step 2: Create Worker Node Configuration

On each worker node, create a kubeadm configuration for IPv6.

```yaml
# kubeadm-join-ipv6.yaml
# Worker node join configuration for IPv6-only cluster
apiVersion: kubeadm.k8s.io/v1beta3
kind: JoinConfiguration
discovery:
  bootstrapToken:
    # Replace with your actual control plane IPv6 address
    apiServerEndpoint: "[2001:db8:1::10]:6443"
    # Replace with your actual token
    token: "abcdef.0123456789abcdef"
    caCertHashes:
      # Replace with your actual CA certificate hash
      - "sha256:your-ca-cert-hash-here"
nodeRegistration:
  # Use containerd runtime
  criSocket: unix:///var/run/containerd/containerd.sock
  # Worker node's IPv6 address
  kubeletExtraArgs:
    node-ip: "2001:db8:1::11"
```

### Step 3: Join the Worker Nodes

Run the join command on each worker node.

```bash
# Join the cluster using the configuration file
sudo kubeadm join --config=kubeadm-join-ipv6.yaml

# Or use the direct join command from kubeadm token create
sudo kubeadm join [2001:db8:1::10]:6443 \
  --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:your-ca-cert-hash-here
```

### Step 4: Verify Node Registration

On the control plane node, verify all nodes have joined.

```bash
# List all nodes with their IPv6 addresses
kubectl get nodes -o wide

# Expected output showing IPv6 internal addresses
NAME           STATUS   ROLES           AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION
control-plane  Ready    control-plane   10m   v1.29.0   2001:db8:1::10    <none>        Ubuntu 24.04 LTS     6.5.0-generic
worker-1       Ready    <none>          5m    v1.29.0   2001:db8:1::11    <none>        Ubuntu 24.04 LTS     6.5.0-generic
worker-2       Ready    <none>          5m    v1.29.0   2001:db8:1::12    <none>        Ubuntu 24.04 LTS     6.5.0-generic
```

## Configuring CoreDNS for IPv6

CoreDNS is deployed automatically by kubeadm, but verify it is configured correctly for IPv6.

### Verify CoreDNS Configuration

Check the CoreDNS deployment and service.

```bash
# Check CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Verify CoreDNS service has IPv6 ClusterIP
kubectl get svc -n kube-system kube-dns

# Expected output showing IPv6 ClusterIP
NAME       TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)
kube-dns   ClusterIP   2001:db8:43::a   <none>        53/UDP,53/TCP,9153/TCP
```

### Update CoreDNS ConfigMap (if needed)

If CoreDNS is not resolving correctly, update its ConfigMap.

```yaml
# coredns-configmap-ipv6.yaml
# CoreDNS configuration optimized for IPv6-only cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        ready
        # Kubernetes cluster DNS
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        # Forward external queries to IPv6 DNS servers
        forward . 2001:4860:4860::8888 2606:4700:4700::1111 {
           max_concurrent 1000
        }
        # Caching for performance
        cache 30
        # Enables query loop detection
        loop
        # Reloads Corefile on changes
        reload
        # Random load balancing of upstream servers
        loadbalance
    }
```

Apply and restart CoreDNS if you made changes.

```bash
# Apply the updated ConfigMap
kubectl apply -f coredns-configmap-ipv6.yaml

# Restart CoreDNS to pick up changes
kubectl rollout restart deployment/coredns -n kube-system
```

## Deploying Services with IPv6

Now that the cluster is running, deploy workloads and services.

### Deploy a Test Application

Create a simple nginx deployment to verify networking.

```yaml
# nginx-ipv6-deployment.yaml
# Test deployment for IPv6-only cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ipv6
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-ipv6
  template:
    metadata:
      labels:
        app: nginx-ipv6
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
              name: http
          # Resource limits for production
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
# ClusterIP service - IPv6 address automatically assigned
apiVersion: v1
kind: Service
metadata:
  name: nginx-ipv6-clusterip
  namespace: default
spec:
  selector:
    app: nginx-ipv6
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  # Single-stack IPv6 service
  ipFamilies:
    - IPv6
  ipFamilyPolicy: SingleStack
  type: ClusterIP
---
# NodePort service for external access
apiVersion: v1
kind: Service
metadata:
  name: nginx-ipv6-nodeport
  namespace: default
spec:
  selector:
    app: nginx-ipv6
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
      protocol: TCP
  ipFamilies:
    - IPv6
  ipFamilyPolicy: SingleStack
  type: NodePort
```

Apply and verify the deployment.

```bash
# Deploy the test application
kubectl apply -f nginx-ipv6-deployment.yaml

# Wait for pods to be ready
kubectl wait --for=condition=Ready pods -l app=nginx-ipv6 --timeout=120s

# Check pod IPv6 addresses
kubectl get pods -l app=nginx-ipv6 -o wide

# Expected output showing IPv6 pod addresses
NAME                          READY   STATUS    IP                    NODE
nginx-ipv6-7d9b8c5f6-abc12    1/1     Running   2001:db8:42:1::5      worker-1
nginx-ipv6-7d9b8c5f6-def34    1/1     Running   2001:db8:42:2::3      worker-2
nginx-ipv6-7d9b8c5f6-ghi56    1/1     Running   2001:db8:42:1::6      worker-1

# Verify service IPv6 addresses
kubectl get svc nginx-ipv6-clusterip nginx-ipv6-nodeport

# Expected output
NAME                    TYPE        CLUSTER-IP           PORT(S)
nginx-ipv6-clusterip    ClusterIP   2001:db8:43::1a2b    80/TCP
nginx-ipv6-nodeport     NodePort    2001:db8:43::3c4d    80:30080/TCP
```

### Test Pod-to-Pod Communication

Verify pods can communicate using IPv6.

```bash
# Create a test pod for connectivity checks
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -6 -s http://[2001:db8:43::1a2b]

# Test using service DNS name
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -6 -s http://nginx-ipv6-clusterip.default.svc.cluster.local
```

### Configuring Ingress for IPv6

Deploy an Ingress controller that supports IPv6.

```yaml
# nginx-ingress-ipv6.yaml
# NGINX Ingress Controller configuration for IPv6-only cluster
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ingress-nginx
  template:
    metadata:
      labels:
        app: ingress-nginx
    spec:
      containers:
        - name: controller
          image: registry.k8s.io/ingress-nginx/controller:v1.9.0
          args:
            - /nginx-ingress-controller
            - --publish-service=$(POD_NAMESPACE)/ingress-nginx-controller
            - --election-id=ingress-nginx-leader
            - --controller-class=k8s.io/ingress-nginx
            - --configmap=$(POD_NAMESPACE)/ingress-nginx-controller
            # Enable IPv6 processing
            - --enable-ipv6
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          ports:
            - name: http
              containerPort: 80
            - name: https
              containerPort: 443
---
# Ingress service with IPv6
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  # Request IPv6 only
  ipFamilies:
    - IPv6
  ipFamilyPolicy: SingleStack
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
  selector:
    app: ingress-nginx
```

Create an Ingress resource.

```yaml
# nginx-ingress-resource.yaml
# Ingress resource for the nginx-ipv6 application
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ipv6-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
    - host: nginx.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-ipv6-clusterip
                port:
                  number: 80
```

## Verification and Testing

After deploying the cluster, run comprehensive tests to verify IPv6 connectivity.

### Cluster Health Checks

```bash
# Check all system pods are running
kubectl get pods -n kube-system

# Verify node connectivity
kubectl get nodes -o wide

# Check component status
kubectl get componentstatuses 2>/dev/null || kubectl get --raw='/readyz?verbose'

# Verify CNI is functioning
kubectl get pods -A -o wide | grep -E "calico|cilium|flannel"
```

### DNS Resolution Tests

```bash
# Test internal DNS resolution
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local

# Test external DNS resolution (requires IPv6 upstream DNS)
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- \
  nslookup google.com

# Verify CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

### Network Connectivity Tests

Create a comprehensive network test pod.

```yaml
# network-test-pod.yaml
# Network diagnostic pod for IPv6-only cluster testing
apiVersion: v1
kind: Pod
metadata:
  name: network-test
  namespace: default
spec:
  containers:
    - name: network-test
      image: nicolaka/netshoot:latest
      command:
        - sleep
        - "3600"
      securityContext:
        capabilities:
          add:
            - NET_ADMIN
            - NET_RAW
```

Run network tests from the diagnostic pod.

```bash
# Deploy the test pod
kubectl apply -f network-test-pod.yaml
kubectl wait --for=condition=Ready pod/network-test

# Test pod-to-pod connectivity
kubectl exec network-test -- ping6 -c 3 2001:db8:42:1::5

# Test service connectivity
kubectl exec network-test -- curl -6 -s http://nginx-ipv6-clusterip

# Test external connectivity (if your network allows it)
kubectl exec network-test -- curl -6 -s https://ipv6.google.com

# Check routing table inside pod
kubectl exec network-test -- ip -6 route show

# Verify IPv6 addresses
kubectl exec network-test -- ip -6 addr show
```

### API Server IPv6 Verification

```bash
# Check API server is listening on IPv6
kubectl get endpoints kubernetes -o yaml

# Verify API server binding
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l component=kube-apiserver -o name | head -1) \
  -- netstat -tlnp 2>/dev/null | grep 6443

# Test API server connectivity from pod
kubectl exec network-test -- curl -6 -sk https://[2001:db8:43::1]:443/healthz
```

## Troubleshooting Common Issues

### Issue: Pods Stuck in ContainerCreating

This usually indicates CNI problems.

```bash
# Check CNI pod logs
kubectl logs -n kube-system -l k8s-app=calico-node --tail=100

# Verify CNI configuration on node
sudo ls -la /etc/cni/net.d/

# Check kubelet logs for CNI errors
sudo journalctl -u kubelet | grep -i cni

# Restart CNI pods if needed
kubectl delete pods -n kube-system -l k8s-app=calico-node
```

### Issue: DNS Resolution Failing

```bash
# Check CoreDNS is running and has endpoints
kubectl get endpoints kube-dns -n kube-system

# Verify CoreDNS pod logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS directly from a pod
kubectl exec network-test -- dig @2001:db8:43::a kubernetes.default.svc.cluster.local AAAA

# Check /etc/resolv.conf in pods
kubectl exec network-test -- cat /etc/resolv.conf
```

### Issue: Services Not Accessible

```bash
# Verify service has endpoints
kubectl get endpoints nginx-ipv6-clusterip

# Check kube-proxy logs for IPv6 issues
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=100

# Verify iptables/ip6tables rules
sudo ip6tables -t nat -L -n -v | grep -i cluster

# If using Cilium, check BPF maps
cilium bpf lb list
```

### Issue: Node Cannot Join Cluster

```bash
# Check kubelet service status
sudo systemctl status kubelet

# View kubelet logs for connection errors
sudo journalctl -u kubelet -f

# Verify IPv6 connectivity to control plane
ping6 -c 3 2001:db8:1::10

# Check firewall rules
sudo ip6tables -L -n | grep 6443

# Verify the join token is valid
kubeadm token list
```

### Issue: External Traffic Not Reaching Cluster

```bash
# Verify NodePort service is bound to IPv6
sudo netstat -tlnp | grep 30080

# Check node firewall allows traffic
sudo ip6tables -L INPUT -n | grep 30080

# Test from external host
curl -6 -s http://[2001:db8:1::10]:30080

# Verify kube-proxy mode
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode
```

## Best Practices for IPv6-Only Kubernetes

### Network Planning

1. **Use a large pod CIDR:** A /48 allows you to allocate /64 per node, supporting millions of pods.
2. **Reserve address ranges:** Keep separate blocks for future clusters, load balancers, and infrastructure.
3. **Document your allocations:** Maintain an IPv6 address plan document and update it with every change.

### Security Considerations

```yaml
# network-policy-ipv6.yaml
# Default deny network policy for IPv6-only cluster
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow DNS egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Monitoring and Observability

Deploy monitoring that understands IPv6.

```yaml
# prometheus-ipv6-service.yaml
# Prometheus service configured for IPv6-only cluster
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
spec:
  selector:
    app: prometheus
  ports:
    - port: 9090
      targetPort: 9090
  ipFamilies:
    - IPv6
  ipFamilyPolicy: SingleStack
  type: ClusterIP
```

### High Availability

For production clusters, run multiple control plane nodes.

```yaml
# kubeadm-ha-config.yaml
# High availability configuration for IPv6-only cluster
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
controlPlaneEndpoint: "[2001:db8:1::100]:6443"  # Load balancer VIP
networking:
  podSubnet: "2001:db8:42::/48"
  serviceSubnet: "2001:db8:43::/112"
apiServer:
  certSANs:
    - "2001:db8:1::100"  # Load balancer VIP
    - "2001:db8:1::10"   # Control plane 1
    - "2001:db8:1::20"   # Control plane 2
    - "2001:db8:1::30"   # Control plane 3
```

### Backup and Disaster Recovery

Ensure your backup tools support IPv6.

```bash
# Backup etcd with IPv6 endpoints
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-snapshot.db \
  --endpoints=https://[2001:db8:1::10]:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
```

## Migration from Dual-Stack to IPv6-Only

If you have an existing dual-stack cluster, here is how to migrate.

### Step 1: Audit IPv4 Dependencies

```bash
# Find services still using IPv4
kubectl get svc -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.ipFamilies}{"\n"}{end}' | grep IPv4

# Check for hardcoded IPv4 addresses in ConfigMaps
kubectl get configmap -A -o yaml | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}"

# Review ingress configurations
kubectl get ingress -A -o yaml | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}"
```

### Step 2: Update Application Configurations

Ensure applications bind to IPv6 or dual-stack.

```yaml
# application-ipv6-binding.yaml
# Example application configured for IPv6
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          env:
            # Tell application to listen on IPv6
            - name: HOST
              value: "::"
            - name: BIND_ADDRESS
              value: "[::]:8080"
```

### Step 3: Gradual Service Migration

Migrate services one at a time.

```bash
# Update service to IPv6-only
kubectl patch svc my-service -p '{"spec":{"ipFamilies":["IPv6"],"ipFamilyPolicy":"SingleStack"}}'

# Verify the change
kubectl get svc my-service -o yaml | grep -A2 ipFamilies
```

## Summary Table

| Component | IPv6 Configuration | Notes |
| --- | --- | --- |
| **Node Addresses** | 2001:db8:1::/64 | Each node gets a unique /128 from this range |
| **Pod CIDR** | 2001:db8:42::/48 | Allows /64 per node for pod IPs |
| **Service CIDR** | 2001:db8:43::/112 | 65,536 ClusterIP addresses |
| **CoreDNS** | 2001:db8:43::a | First usable address in service range |
| **API Server** | [2001:db8:1::10]:6443 | Control plane endpoint |
| **CNI** | Calico/Cilium/Flannel | Must support IPv6-only mode |
| **Ingress** | LoadBalancer with IPv6 | Requires IPv6-capable load balancer |
| **etcd** | [2001:db8:1::10]:2379 | Uses IPv6 for peer and client traffic |

## Quick Reference Commands

```bash
# Check cluster IPv6 configuration
kubectl cluster-info dump | grep -E "cidr|subnet|IPv6"

# List all pod IPv6 addresses
kubectl get pods -A -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,IP:.status.podIP"

# Verify service IPv6 addresses
kubectl get svc -A -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type,CLUSTER-IP:.spec.clusterIP,FAMILIES:.spec.ipFamilies"

# Check node IPv6 addresses
kubectl get nodes -o custom-columns="NAME:.metadata.name,INTERNAL-IP:.status.addresses[?(@.type=='InternalIP')].address"

# Debug CNI configuration
kubectl get cm -n kube-system -o yaml | grep -A20 "cni-conf"

# Test IPv6 connectivity end-to-end
kubectl run e2e-test --image=busybox --rm -it --restart=Never -- wget -qO- http://[<service-ipv6>]
```

---

Running an IPv6-only Kubernetes cluster is no longer experimental. With proper planning, the right CNI plugin, and careful attention to service configuration, you can build a future-proof infrastructure that avoids IPv4 exhaustion issues entirely. Start with a test cluster, validate your applications work correctly with IPv6, and then migrate production workloads incrementally. The investment pays off in simplified networking, reduced NAT complexity, and readiness for the IPv6-dominant internet.
