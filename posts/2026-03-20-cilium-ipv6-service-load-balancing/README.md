# How to Cilium IPv6 Service Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, IPv6, Kubernetes, LoadBalancer, eBPF, Kube-proxy Replacement, BGP

Description: Configure Cilium's eBPF-based load balancer for Kubernetes services with IPv6 ClusterIPs and external load balancer IPs.

## Introduction

Configure Cilium's eBPF-based load balancer for Kubernetes services with IPv6 ClusterIPs and external load balancer IPs. This guide covers the essential configuration, manifests, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Ensure IPv6 is enabled and functional on the nodes

ip -6 addr show
ping -6 -c 3 ::1

# This guide assumes Cilium was installed with:
#   ipv6.enabled=true
#   kubeProxyReplacement=true
#   bgpControlPlane.enabled=true

# Verify kube-proxy replacement is active
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement
```

## Step 2: Core Implementation

```yaml
# service-ipv6.yaml
apiVersion: v1
kind: Service
metadata:
  name: echo-ipv6
  namespace: default
  labels:
    bgp: blue
  annotations:
    lbipam.cilium.io/ips: "fd00:10:100::10"
spec:
  type: LoadBalancer
  loadBalancerClass: io.cilium/bgp-control-plane
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  selector:
    app: echo
  ports:
    - name: http
      port: 80
      targetPort: 80
```

## Step 3: Configuration

```yaml
# cilium-ipv6-bgp.yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: ipv6-pool
spec:
  blocks:
    - cidr: "fd00:10:100::/120"
  serviceSelector:
    matchLabels:
      bgp: blue
---
apiVersion: cilium.io/v2
kind: CiliumBGPPeerConfig
metadata:
  name: cilium-peer
spec:
  families:
    - afi: ipv6
      safi: unicast
      advertisements:
        matchLabels:
          advertise: "bgp"
---
apiVersion: cilium.io/v2
kind: CiliumBGPClusterConfig
metadata:
  name: cilium-bgp
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  bgpInstances:
    - name: "instance-65001"
      localASN: 65001
      peers:
        - name: "peer-65010-router"
          peerASN: 65010
          peerAddress: fd00:10:0:0::1
          peerConfigRef:
            name: "cilium-peer"
---
apiVersion: cilium.io/v2
kind: CiliumBGPAdvertisement
metadata:
  name: ipv6-service-advertisements
  labels:
    advertise: "bgp"
spec:
  advertisements:
    - advertisementType: "Service"
      service:
        addresses:
          - LoadBalancerIP
      selector:
        matchLabels:
          bgp: blue
```

## Step 4: Apply and Verify

```bash
# Apply the Cilium resources and the Service manifest
kubectl apply -f cilium-ipv6-bgp.yaml
kubectl apply -f service-ipv6.yaml

# Verify the Service received an IPv6 ClusterIP and LoadBalancer IP
kubectl get ippools
kubectl get svc echo-ipv6 -o wide
kubectl get svc echo-ipv6 -o jsonpath='{.spec.clusterIPs}{"\n"}{.status.loadBalancer.ingress[*].ip}{"\n"}'

# Test connectivity once the Service has ready backends and the VIP is routed
curl -6 http://[fd00:10:100::10]/
```

## Step 5: Monitoring

```bash
# Confirm the LB IPAM request was satisfied
kubectl get svc echo-ipv6 -o jsonpath='{.status.conditions}{"\n"}'

# Confirm BGP sessions are established
kubectl -n kube-system exec ds/cilium -- cilium-dbg bgp peers

# Confirm the IPv6 service VIP is being advertised
kubectl -n kube-system exec ds/cilium -- cilium-dbg bgp routes advertised ipv6 unicast

# Monitor IP pool usage
kubectl describe ippools/ipv6-pool
```

## Conclusion

Cilium IPv6 Service Load Balancing requires Cilium to run with IPv6 enabled, kube-proxy replacement enabled, and a load balancer IP advertisement mechanism such as the BGP Control Plane. Use Kubernetes Service `ipFamilyPolicy` and `ipFamilies` together with Cilium LB IPAM to allocate IPv6 ClusterIPs and LoadBalancer IPs. Monitor the allocated VIPs, BGP session state, and pool usage with OneUptime to detect reachability issues early.
