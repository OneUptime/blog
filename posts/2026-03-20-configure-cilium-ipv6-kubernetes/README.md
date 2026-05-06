# How to Configure Cilium for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, IPv6, Kubernetes, CNI, eBPF, Dual-Stack, NetworkPolicy

Description: Configure Cilium CNI for IPv6 and dual-stack Kubernetes clusters, including IPAM, network policies, and load balancing with eBPF.

## Introduction

Cilium is an eBPF-based CNI plugin for Kubernetes that provides high-performance networking, security, and observability. It supports IPv6, dual-stack, and IPv6-only clusters when Kubernetes is configured for those address families, with native eBPF datapath acceleration.

## Step 1: Install Cilium with IPv6 Support

```bash
# Install Cilium CLI

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all \
    https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}

# Install Cilium with dual-stack enabled
cilium install \
    --set ipv4.enabled=true \
    --set ipv6.enabled=true \
    --set ipam.mode=cluster-pool \
    --set ipam.operator.clusterPoolIPv4PodCIDRList='{10.0.0.0/8}' \
    --set ipam.operator.clusterPoolIPv6PodCIDRList='{fd00:10::/104}'
```

## Step 2: Helm Configuration for Dual-Stack

```yaml
# cilium-values.yaml
ipv4:
  enabled: true

ipv6:
  enabled: true

ipam:
  mode: "cluster-pool"
  operator:
    clusterPoolIPv4PodCIDRList: ["10.0.0.0/8"]
    clusterPoolIPv6PodCIDRList: ["fd00:10::/104"]

# Enable dual-stack
enableIPv6Masquerade: true

# BPF-based IPv6 masquerade
bpf:
  masquerade: true

# kube-proxy replacement with IPv6
kubeProxyReplacement: true
k8sServiceHost: "<api-server-ip-or-hostname>"
k8sServicePort: 6443
routingMode: native

loadBalancer:
  mode: dsr     # Direct Server Return for IPv6
  dsrDispatch: opt
  algorithm: maglev
```

```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
    --namespace kube-system \
    -f cilium-values.yaml
```

## Step 3: Verify IPv6 is Working

```bash
# Check Cilium status
cilium status --wait

# Verify Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Check that pods get IPv4 and IPv6 addresses
kubectl get pods -o custom-columns='NAME:.metadata.name,IPS:.status.podIPs[*].ip'

# Test IPv6 connectivity between pods
kubectl exec -it <pod> -- ping -6 -c 3 <another-pod-ipv6>

# Cilium connectivity test for IPv6
cilium connectivity test --ip-families ipv6
```

## Step 4: IPv6 Network Policy

```yaml
# netpolicy-ipv6.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ipv6-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: web
  ingress:
    # Allow from IPv6 subnet
    - fromCIDR:
        - "2001:db8:100::/48"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP

    # Allow from pods in same namespace
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: default
```

```bash
kubectl apply -f netpolicy-ipv6.yaml

# Verify policy
kubectl get ciliumnetworkpolicy allow-ipv6-ingress -n default -o yaml
```

## Step 5: Hubble Observability for IPv6

```bash
# Enable Hubble
cilium hubble enable

# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
    https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-${HUBBLE_ARCH}.tar.gz /usr/local/bin
rm hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}

# Observe IPv6 flows
hubble observe --ipv6 --follow

# Filter IPv6 traffic to specific pod
hubble observe \
    --pod default/web-pod \
    --ipv6 \
    --follow
```

## Step 6: IPv6-Only Cluster

```yaml
# cilium-ipv6-only.yaml
ipv4:
  enabled: false
ipv6:
  enabled: true

ipam:
  mode: cluster-pool
  operator:
    clusterPoolIPv6PodCIDRList: ["fd00:10::/104"]

enableIPv6Masquerade: true
```

## Conclusion

Cilium's eBPF datapath provides native IPv6 support with eBPF-based policy enforcement and service load balancing. Enable dual-stack with `ipv4.enabled=true` and `ipv6.enabled=true`, then configure IPv4 and IPv6 pod CIDR pools in IPAM settings. CiliumNetworkPolicy supports IPv6 CIDR-based rules. Use Hubble to observe IPv6 traffic flows and detect policy violations. Monitor Cilium agent health with OneUptime to alert on eBPF program load failures.
