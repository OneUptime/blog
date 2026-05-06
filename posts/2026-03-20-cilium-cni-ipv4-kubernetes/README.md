# How to Install Cilium CNI with IPv4 Networking in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, Kubernetes, IPv4, CNI, eBPF, Networking

Description: Install Cilium CNI in a Kubernetes cluster using Helm or the Cilium CLI with IPv4 networking, eBPF acceleration, and observability features enabled.

Cilium is a CNI plugin powered by eBPF that provides high-performance networking, network policies, and deep observability. It can replace kube-proxy and supports advanced features like transparent encryption and Hubble monitoring.

## Prerequisites

```bash
# Cilium requires Linux kernel 5.10+ (or an equivalent supported kernel such as 4.18 on RHEL 8.10)

uname -r

# Initialize cluster WITHOUT kube-proxy only if you plan to enable kube-proxy replacement
sudo kubeadm init \
  --pod-network-cidr=10.0.0.0/16 \
  --skip-phases=addon/kube-proxy
# If you are keeping kube-proxy, use standard kubeadm init instead
```

## Method 1: Install with Cilium CLI (Simplest)

```bash
# Install the Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Install Cilium with default settings
cilium install --version 1.19.3

# With custom IPv4 CIDR
cilium install --version 1.19.3 --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="10.0.0.0/16" \
  --set ipam.operator.clusterPoolIPv4MaskSize=24
```

## Method 2: Install with Helm

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with IPv4 configuration
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="10.0.0.0/16" \
  --set ipam.operator.clusterPoolIPv4MaskSize=24

# If you initialized kubeadm without kube-proxy, add kube-proxy replacement settings
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set ipam.mode=cluster-pool \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="10.0.0.0/16" \
  --set ipam.operator.clusterPoolIPv4MaskSize=24 \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<API_SERVER_IP> \
  --set k8sServicePort=6443
```

## Verifying the Installation

```bash
# Check Cilium status
cilium status --wait

# Expected:
#     /¯¯\
#  /¯¯\__/¯¯\    Cilium:         OK
#  \__/¯¯\__/    Operator:       OK
#  /¯¯\__/¯¯\    Hubble:         disabled
#  \__/¯¯\__/    ClusterMesh:    disabled

# View Cilium pods
kubectl get pods -n kube-system -l k8s-app=cilium

# Run the Cilium connectivity test
cilium connectivity test
```

## Enabling Hubble for Observability

```bash
# Enable Hubble (network observability)
cilium hubble enable

# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-${HUBBLE_ARCH}.tar.gz /usr/local/bin
rm hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}

# Port-forward to access Hubble
cilium hubble port-forward &

# Observe live network flows
hubble observe
```

## Verifying IPv4 Pod Addresses

```bash
# Deploy a test pod and verify it gets a Cilium-assigned IPv4
kubectl run cilium-test --image=alpine --restart=Never -- sleep 3600
kubectl get pod cilium-test -o wide
# If you used the custom pool above, the pod IP should be in the 10.0.0.0/16 range

# Check Cilium endpoint info
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list
```

## Checking Cilium IP Pool

```bash
# View CiliumNode objects showing IP allocation per node
kubectl get ciliumnodes -o yaml | grep -A10 ipam
```

Cilium's eBPF-based dataplane provides high-performance networking, network policy enforcement, and observability for production Kubernetes clusters.
