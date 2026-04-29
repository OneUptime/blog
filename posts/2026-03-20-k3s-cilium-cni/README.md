# How to Configure K3s with Cilium CNI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Cilium, eBPF, Networking, Security, CNI

Description: Learn how to replace K3s's default Flannel with Cilium CNI for advanced networking, observability, and security using eBPF.

## Introduction

Cilium is a powerful CNI (Container Network Interface) plugin that uses eBPF (extended Berkeley Packet Filter) to provide high-performance networking, advanced security, and deep observability for Kubernetes clusters. Unlike Flannel, Cilium offers rich Layer 7-aware Network Policies, transparent encryption, optional service mesh features, and Hubble for network observability. This guide covers replacing K3s's default Flannel with Cilium.

## Prerequisites

- Linux kernel 5.10+ (or an equivalent vendor kernel, such as 4.18 on RHEL 8.10)
- K3s cluster (fresh install recommended)
- Helm installed
- Basic understanding of Kubernetes networking

## Step 1: Verify Kernel Compatibility

```bash
# Check kernel version

uname -r

# Cilium requires Linux kernel 5.10+ or an equivalent vendor kernel

# Check whether the BPF filesystem is mounted
mount | grep /sys/fs/bpf

# Cilium can mount bpffs automatically, but mounting it persistently
# avoids disruption during agent restarts or upgrades
mount bpffs /sys/fs/bpf -t bpf
echo "bpffs /sys/fs/bpf bpf defaults 0 0" >> /etc/fstab

# Verify
mount | grep /sys/fs/bpf
```

## Step 2: Install K3s Without Default CNI

K3s must be installed without Flannel to use Cilium:

```bash
# Install K3s server without the default CNI
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="
    --flannel-backend=none
    --disable-network-policy
    --disable-kube-proxy
    --egress-selector-mode=cluster
  " \
  sh -

# Note: --disable-kube-proxy is optional
# If you disable kube-proxy on K3s, set egress-selector-mode=cluster
# so the apiserver can still reach service endpoints
```

Using a config file:

```yaml
# /etc/rancher/k3s/config.yaml
flannel-backend: "none"
disable-network-policy: true
disable-kube-proxy: true
egress-selector-mode: "cluster"
```

## Step 3: Install Cilium with Helm

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Use the K3s kubeconfig for kubectl and Cilium CLI commands
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Install Cilium with K3s-specific configuration
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set operator.replicas=1 \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<server-ip> \
  --set k8sServicePort=6443 \
  --set ipam.mode=kubernetes \
  --set cni.exclusive=false

# Wait for Cilium to be ready
kubectl rollout status daemonset/cilium -n kube-system --timeout=120s
```

### Install via K3s Auto-Deploy Manifests

```yaml
# /var/lib/rancher/k3s/server/manifests/cilium.yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: cilium
  namespace: kube-system
spec:
  repo: https://helm.cilium.io/
  chart: cilium
  version: "1.19.3"
  targetNamespace: kube-system
  valuesContent: |-
    operator:
      replicas: 1
    kubeProxyReplacement: true
    k8sServiceHost: "192.168.1.10"
    k8sServicePort: 6443
    ipam:
      mode: kubernetes
    hubble:
      enabled: true
      relay:
        enabled: true
      ui:
        enabled: true
    cni:
      exclusive: false
```

## Step 4: Install the Cilium CLI

```bash
# Download Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  "https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz"{,.sha256sum}
sha256sum --check "cilium-linux-${CLI_ARCH}.tar.gz.sha256sum"
tar xzvfC "cilium-linux-${CLI_ARCH}.tar.gz" /usr/local/bin

rm "cilium-linux-${CLI_ARCH}.tar.gz" "cilium-linux-${CLI_ARCH}.tar.gz.sha256sum"

# Verify Cilium installation
cilium status

# Run a connectivity test
cilium connectivity test --test-namespace cilium-test
```

## Step 5: Verify Cilium is Working

```bash
# Check Cilium pods
kubectl get pods -n kube-system | grep cilium

# Check Cilium status
cilium status --wait

# View Cilium endpoints (one per pod)
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list

# Check nodes are managed by Cilium
kubectl get nodes -o wide
kubectl get ciliumnodes
```

## Step 6: Enable Hubble Observability

Hubble is Cilium's observability platform for networking:

```bash
# Enable Hubble if not already enabled
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true

# Install Hubble CLI
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  "https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-${HUBBLE_ARCH}.tar.gz"{,.sha256sum}
sha256sum --check "hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum"
tar xzvfC "hubble-linux-${HUBBLE_ARCH}.tar.gz" /usr/local/bin
rm "hubble-linux-${HUBBLE_ARCH}.tar.gz" "hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum"

# Port-forward to Hubble Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Verify Hubble API access
hubble status

# Observe live traffic
hubble observe --follow

# Observe traffic for a specific pod
hubble observe --namespace default --pod my-app --follow
```

## Step 7: Advanced Network Policies with Cilium

Cilium extends Kubernetes NetworkPolicy with `CiliumNetworkPolicy`:

```yaml
# cilium-l7-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-v2-only
  namespace: production
spec:
  # Apply to API service pods
  endpointSelector:
    matchLabels:
      app: api-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          # Layer 7 HTTP policy
          rules:
            http:
              # Only allow GET requests to /api/v2/*
              - method: GET
                path: ^/api/v2/.*
              # Allow POST to specific endpoints
              - method: POST
                path: ^/api/v2/orders$
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

## Step 8: Transparent Encryption with Cilium

```bash
# Enable WireGuard-based transparent encryption
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set encryption.enabled=true \
  --set encryption.type=wireguard

# Verify encryption is active
cilium encryption status
```

## Step 9: Cilium Service Mesh (No Sidecar)

Cilium provides a sidecar-free service mesh:

```bash
# Install the Gateway API CRDs required by Cilium
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_gatewayclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_gateways.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_httproutes.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_referencegrants.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_grpcroutes.yaml

# Enable Cilium service mesh
# Requires LoadBalancer support for the default ingress and Gateway API services
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set ingressController.enabled=true \
  --set ingressController.default=true \
  --set ingressController.loadbalancerMode=dedicated \
  --set gatewayAPI.enabled=true
kubectl -n kube-system rollout restart deployment/cilium-operator
kubectl -n kube-system rollout restart ds/cilium

# Verify service mesh is running
cilium status
kubectl get gatewayclasses
```

## Conclusion

Cilium transforms K3s networking from basic Flannel VXLAN to a high-performance, eBPF-based network stack with rich security policies, observability, and optional service mesh capabilities. The trade-off for these capabilities is higher kernel requirements and increased complexity. For clusters that need advanced Layer 7 network policies, transparent encryption, or detailed network observability via Hubble, Cilium is an excellent choice that integrates well with K3s.
