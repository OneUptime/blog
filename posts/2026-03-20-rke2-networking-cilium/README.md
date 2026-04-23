# How to Configure RKE2 Networking with Cilium - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Cilium, eBPF, CNI, Networking, Rancher

Description: Learn how to configure Cilium as the CNI plugin for RKE2, leveraging eBPF for high-performance, secure Kubernetes networking.

Cilium is a modern CNI plugin that uses Linux eBPF (extended Berkeley Packet Filter) technology to provide high-performance networking, security, and observability for Kubernetes. It can replace kube-proxy's iptables/IPVS service handling with eBPF programs for load balancing, and uses eBPF for network policy enforcement. This guide covers deploying and configuring Cilium as the CNI in RKE2.

## Prerequisites

- Linux kernel 5.10+ or an equivalent supported distribution kernel
- RKE2 v1.21+ (check the rke2-cilium chart values bundled with your RKE2 release)
- Minimum 4 GB RAM per RKE2 node (8 GB recommended)
- Understanding of eBPF concepts

## Step 1: Install RKE2 with Cilium

```yaml
# /etc/rancher/rke2/config.yaml - Configure Cilium as CNI

cni: cilium

# Since Cilium handles kube-proxy functionality via eBPF,
# you can optionally disable kube-proxy. If you do, create the
# HelmChartConfig in Step 2 before starting RKE2.
disable-kube-proxy: true

# Pod and service CIDRs
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
```

```bash
# Install RKE2 with Cilium configuration
# Make sure config.yaml is in place before starting RKE2
curl -sfL https://get.rke2.io | sudo sh -
sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Monitor Cilium deployment
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin
kubectl get pods -n kube-system | grep cilium
```

## Step 2: Customize Cilium with HelmChartConfig

RKE2 deploys Cilium via Helm. Customize it using HelmChartConfig; when `disable-kube-proxy` is enabled, place this file before the first RKE2 start:

```yaml
# /var/lib/rancher/rke2/server/manifests/rke2-cilium-config.yaml - Advanced Cilium configuration
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-cilium
  namespace: kube-system
spec:
  valuesContent: |-
    # Enable kube-proxy replacement via eBPF
    kubeProxyReplacement: true

    # Kubernetes service host for kube-proxy replacement
    k8sServiceHost: "localhost"
    k8sServicePort: "6443"

    # Enable Hubble for observability
    hubble:
      enabled: true
      relay:
        enabled: true
      ui:
        enabled: true

    # Enable native routing (no overlay when the network routes PodCIDRs)
    routingMode: "native"
    ipv4NativeRoutingCIDR: "10.0.0.0/8"

    # Auto-direct node routes for nodes on the same L2 segment
    autoDirectNodeRoutes: true

    # Load balancing algorithm
    loadBalancer:
      algorithm: "maglev"  # Options: random, maglev
      mode: "dsr"          # Direct Server Return for better performance
      dsrDispatch: "opt"   # Use geneve if your network drops IP options

    # MTU (auto-detected if not set)
    # mtu: 1500

    # Enable Prometheus metrics
    prometheus:
      enabled: true
      port: 9962

    # Enable operator Prometheus metrics
    operator:
      prometheus:
        enabled: true
```

## Step 3: Install Hubble CLI

Hubble provides deep visibility into network flows:

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}

sha256sum --check hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum
sudo tar -C /usr/local/bin -xzvf hubble-linux-${HUBBLE_ARCH}.tar.gz
rm hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}

# Verify Hubble installation
hubble version

# Access Hubble Relay (forward port from Hubble relay)
kubectl port-forward service/hubble-relay \
  -n kube-system 4245:80 &

# Observe network flows
hubble observe --all-namespaces

# Observe flows for a specific pod
hubble observe --pod my-app/my-pod --follow

# Observe HTTP traffic
hubble observe --protocol http --follow
```

## Step 4: Configure Cilium Network Policies

Cilium supports standard Kubernetes NetworkPolicy plus its own CiliumNetworkPolicy:

```yaml
# cilium-network-policy.yaml - Cilium-specific L7 policies
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: l7-policy
  namespace: my-app
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
      # Cilium L7 HTTP policy
      rules:
        http:
        # Only allow GET requests to /api/
        - method: "GET"
          path: "/api/"
        # Allow POST requests to /api/data
        - method: "POST"
          path: "/api/data"
```

## Step 5: Configure Cilium for Cluster Mesh

Connect multiple Kubernetes clusters with Cilium Cluster Mesh:

```bash
# Each cluster must be installed with a unique Cilium cluster.name and cluster.id

# Enable cluster mesh on the first cluster
cilium clustermesh enable \
  --context cluster1-context \
  --service-type LoadBalancer

# Enable cluster mesh on the second cluster
cilium clustermesh enable \
  --context cluster2-context \
  --service-type LoadBalancer

# Wait for the cluster mesh components
cilium clustermesh status --context cluster1-context --wait
cilium clustermesh status --context cluster2-context --wait

# Connect the two clusters
cilium clustermesh connect \
  --context cluster1-context \
  --destination-context cluster2-context

# Verify cluster mesh status
cilium clustermesh status --context cluster1-context --wait
```

## Step 6: Monitor Cilium Health

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar -C /usr/local/bin -xzvf cilium-linux-${CLI_ARCH}.tar.gz
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Check overall Cilium status
cilium status

# Check connectivity between pods
cilium connectivity test

# Check Cilium agents on each node
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Check Cilium configuration
kubectl exec -n kube-system \
  $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -n 1) \
  -- cilium-dbg status

# View eBPF load balancer entries
kubectl exec -n kube-system \
  $(kubectl get pods -n kube-system -l k8s-app=cilium -o name | head -n 1) \
  -- cilium-dbg service list
```

## Conclusion

Cilium brings eBPF-powered networking to RKE2 and can improve performance by replacing kube-proxy's iptables/IPVS service handling with an eBPF datapath when kube-proxy replacement is enabled. The Hubble observability platform provides deep visibility into network flows that traditional CNI plugins cannot match. For organizations running latency-sensitive workloads or requiring L7 network policies, Cilium's capabilities make it an excellent choice over Canal or Calico. The tradeoff is a higher minimum kernel version requirement and more complex initial configuration.
