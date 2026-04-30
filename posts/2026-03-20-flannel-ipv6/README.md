# How to Configure Flannel CNI for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Flannel, CNI, VXLAN, Dual-Stack, Networking

Description: Configure Flannel CNI for dual-stack IPv6 Kubernetes clusters, set up the IPv6 network and backend in Flannel's configuration, and verify pod IPv6 address assignment with Flannel networking.

## Introduction

Flannel is a simple CNI plugin that provides overlay networking for Kubernetes pods. Flannel supports dual-stack networking through the `IPv6Network` and `EnableIPv6` configuration options when the Kubernetes cluster and nodes are already configured for dual-stack. In this configuration, Flannel uses VXLAN encapsulation to carry IPv6 traffic between nodes. While simpler than Calico or Cilium, Flannel's dual-stack support is functional for many use cases.

## Install Flannel with IPv6 Support

```bash
# Download Flannel manifest

curl -LO https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Apply initial Flannel installation
kubectl apply -f kube-flannel.yml

# Now patch the ConfigMap for dual-stack
kubectl -n kube-flannel get configmap kube-flannel-cfg -o yaml
```

## Configure Flannel for Dual-Stack

```yaml
# kube-flannel-cfg-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true
          }
        },
        {
          "type": "portmap",
          "capabilities": {
            "portMappings": true
          }
        }
      ]
    }
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "IPv6Network": "fd00:10:244::/56",
      "EnableIPv6": true,
      "Backend": {
        "Type": "vxlan",
        "VNI": 1,
        "Port": 4789
      }
    }
```

```bash
# Apply the updated ConfigMap
kubectl apply -f kube-flannel-cfg-patch.yaml

# Restart Flannel daemonset to pick up changes
kubectl -n kube-flannel rollout restart daemonset/kube-flannel-ds

# Wait for Flannel to be ready
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds

# Verify Flannel pods are running
kubectl -n kube-flannel get pods
```

## Flannel IPv6 Troubleshooting

```bash
# Check Flannel logs for IPv6 configuration
kubectl -n kube-flannel logs daemonset/kube-flannel-ds -c kube-flannel | grep -i ipv6

# Verify Flannel daemon is managing IPv6 routes
# On a worker node:
sudo cat /run/flannel/subnet.env
# FLANNEL_NETWORK=10.244.0.0/16
# FLANNEL_SUBNET=10.244.x.1/24
# FLANNEL_IPV6_NETWORK=fd00:10:244::/56   <-- should exist
# FLANNEL_IPV6_SUBNET=fd00:10:244:x::1/64 <-- per-node IPv6 subnet

# Check IPv6 routes added by Flannel
ip -6 route show | grep fd00

# Check VXLAN interface for IPv6
ip -6 addr show flannel.1
```

## Verify Pod IPv6 with Flannel

```bash
# Deploy test pods
kubectl run pod1 --image=alpine --command -- sleep 3600
kubectl run pod2 --image=alpine --command -- sleep 3600

# Check pod IPs (both IPv4 and IPv6)
kubectl get pod pod1 pod2 -o jsonpath='{range .items[*]}{.metadata.name}:{range .status.podIPs[*]} {.ip}{end}{"\n"}{end}'

# Expected output:
# pod1: 10.244.0.5 fd00:10:244::5
# pod2: 10.244.1.3 fd00:10:244:1::3

# Test IPv6 connectivity between pods
POD2_IPV6=$(kubectl get pod pod2 -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}' | grep ':')
kubectl exec pod1 -- ping6 -c 3 "$POD2_IPV6"

# Check network interface inside pod
kubectl exec pod1 -- ip -6 addr show eth0
```

## Flannel vs Other CNI Plugins for IPv6

```text
Flannel IPv6 Limitations:
  - No network policy support (use with NetworkPolicy provider)
  - Dual-stack support is limited to VXLAN, WireGuard, and host-gw on Linux
  - Limited metrics and observability
  - No eBPF acceleration

When to use Flannel for IPv6:
  - Simple clusters without network policy needs
  - Testing and development environments
  - When simplicity is preferred over features

Alternatives with richer IPv6 support:
  - Calico: NetworkPolicy, BGP routing, better performance
  - Cilium: eBPF, Hubble observability, full kube-proxy replacement
```

## Conclusion

Configure Flannel for dual-stack Kubernetes by adding `"IPv6Network"` and `"EnableIPv6": true` to the `net-conf.json` in the `kube-flannel-cfg` ConfigMap, then restarting the Flannel DaemonSet. This assumes Kubernetes itself is already configured for dual-stack Pod and Service CIDRs and that the nodes have IPv4 and IPv6 connectivity. Flannel assigns IPv6 subnets per node based on the configured IPv6Network, visible in `/run/flannel/subnet.env`. Verify pod IPv6 addresses with `kubectl get pod <pod-name> -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}'`. Note that Flannel does not support native NetworkPolicy - use Calico or Cilium if network policy enforcement is required.
