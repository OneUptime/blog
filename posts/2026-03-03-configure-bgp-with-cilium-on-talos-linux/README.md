# How to Configure BGP with Cilium on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cilium, BGP, Kubernetes, Networking

Description: Learn how to configure BGP peering with Cilium on Talos Linux to advertise service and pod IPs to your network infrastructure.

---

When you run a bare-metal or on-premises Kubernetes cluster, getting external traffic to your services is a challenge. Unlike cloud environments where load balancers are a click away, bare-metal clusters need a way to advertise their service IPs to the rest of the network. BGP (Border Gateway Protocol) solves this by allowing your Kubernetes nodes to announce routes to your network routers. Cilium on Talos Linux has native BGP support that makes this integration straightforward.

## Why BGP with Kubernetes

In a typical bare-metal Kubernetes setup without BGP, you might use NodePort services, which pin you to specific ports on specific nodes. Or you might use an external load balancer like HAProxy in front of your cluster. Both approaches have limitations.

With BGP, your Kubernetes cluster announces service IP addresses directly to your network routers. The routers then know how to reach those IPs by forwarding traffic to the correct nodes. This gives you:

- True LoadBalancer service type support on bare metal
- ECMP (Equal-Cost Multi-Path) load balancing across multiple nodes
- Automatic failover when a node goes down
- Clean integration with existing network infrastructure

## Prerequisites

- A Talos Linux cluster with Cilium v1.18+ installed (this guide uses the BGPv2 API)
- A network router that supports BGP (most enterprise routers do)
- An IP address range for LoadBalancer services (not overlapping with your existing network)
- Basic understanding of BGP concepts (AS numbers, peering)

## Step 1: Enable Cilium BGP Control Plane

First, enable the BGP control plane in Cilium:

```bash
# Upgrade Cilium with BGP enabled

helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set bgpControlPlane.enabled=true
```

Wait for Cilium to restart with BGP support:

```bash
# Verify the rollout
kubectl rollout status daemonset/cilium -n kube-system

# Check that BGP is enabled
kubectl exec -n kube-system ds/cilium -- cilium status | grep BGP
```

## Step 2: Create an IP Pool for LoadBalancer Services

Define the IP range that Cilium will assign to LoadBalancer services:

```yaml
# ip-pool.yaml
apiVersion: cilium.io/v2
kind: CiliumLoadBalancerIPPool
metadata:
  name: external-pool
spec:
  blocks:
  - start: "192.168.10.100"
    stop: "192.168.10.200"
  # Optionally restrict to specific services
  # serviceSelector:
  #   matchLabels:
  #     pool: external
```

```bash
kubectl apply -f ip-pool.yaml
```

## Step 3: Configure BGP Peering

Current Cilium releases use the BGPv2 API, which splits the legacy `CiliumBGPPeeringPolicy` into three resources: `CiliumBGPClusterConfig` selects nodes and defines BGP sessions, `CiliumBGPPeerConfig` holds reusable peer timers and advertisement selectors, and `CiliumBGPAdvertisement` defines which prefixes are advertised. (The older `CiliumBGPPeeringPolicy` was deprecated in Cilium 1.18 and removed in 1.19.)

```yaml
# bgp-peering.yaml
apiVersion: cilium.io/v2
kind: CiliumBGPClusterConfig
metadata:
  name: bgp-peering
spec:
  # Apply to nodes with this label
  nodeSelector:
    matchLabels:
      bgp-policy: active
  bgpInstances:
  - name: instance-65000
    localASN: 65000
    peers:
    - name: upstream-router
      peerASN: 65001
      peerAddress: "192.168.1.1"
      peerConfigRef:
        name: upstream-peer-config
---
apiVersion: cilium.io/v2
kind: CiliumBGPPeerConfig
metadata:
  name: upstream-peer-config
spec:
  timers:
    holdTimeSeconds: 90
    keepAliveTimeSeconds: 30
    connectRetryTimeSeconds: 120
  gracefulRestart:
    enabled: true
    restartTimeSeconds: 120
  families:
  - afi: ipv4
    safi: unicast
    advertisements:
      matchLabels:
        advertise: bgp
---
apiVersion: cilium.io/v2
kind: CiliumBGPAdvertisement
metadata:
  name: service-advertisements
  labels:
    advertise: bgp
spec:
  advertisements:
  - advertisementType: "Service"
    service:
      addresses:
      - LoadBalancerIP
    selector:
      matchExpressions:
      - key: somekey
        operator: NotIn
        values:
        - never-select-me
```

The key fields are:

- **localASN** - The BGP Autonomous System Number for your cluster
- **peerAddress** - The IP address of your network router
- **peerASN** - The router's AS number
- **CiliumBGPAdvertisement.spec.advertisements[].selector** - Which services to advertise (the example above selects all services)

```bash
kubectl apply -f bgp-peering.yaml
```

## Step 4: Label Nodes for BGP

Apply the label that matches the `CiliumBGPClusterConfig` nodeSelector:

```bash
# Label the nodes that should participate in BGP
kubectl label nodes talos-worker-1 bgp-policy=active
kubectl label nodes talos-worker-2 bgp-policy=active
kubectl label nodes talos-worker-3 bgp-policy=active
```

On Talos Linux, you should also add these labels to your machine config for persistence:

```yaml
# talos-bgp-patch.yaml
machine:
  nodeLabels:
    bgp-policy: active
```

```bash
talosctl apply-config --nodes 192.168.1.20 --patch @talos-bgp-patch.yaml
```

## Step 5: Configure Your Network Router

On your router, configure a BGP peer pointing at each Kubernetes node. The exact syntax depends on your router vendor. Here is an example for a FRR (Free Range Routing) based router:

```text
! FRR configuration example
router bgp 65001
 bgp router-id 192.168.1.1
 neighbor 192.168.1.20 remote-as 65000
 neighbor 192.168.1.21 remote-as 65000
 neighbor 192.168.1.22 remote-as 65000
 !
 address-family ipv4 unicast
  neighbor 192.168.1.20 activate
  neighbor 192.168.1.21 activate
  neighbor 192.168.1.22 activate
  maximum-paths 3
 exit-address-family
```

The `maximum-paths 3` setting enables ECMP, so traffic is distributed across all nodes that advertise the route.

## Step 6: Test the Setup

Create a LoadBalancer service and verify it gets an external IP:

```yaml
# test-lb-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-lb
spec:
  type: LoadBalancer
  selector:
    app: nginx-test
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f test-lb-service.yaml

# Check the service got an external IP from the pool
kubectl get svc nginx-lb

# NAME       TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)        AGE
# nginx-lb   LoadBalancer   10.96.1.234   192.168.10.100   80:31234/TCP   30s
```

Verify BGP is advertising the route:

```bash
# Check BGP session status from Cilium
kubectl exec -n kube-system ds/cilium -- cilium bgp peers

# The output shows peering status and advertised routes
# State should be "established"
```

Test connectivity from outside the cluster:

```bash
# From a machine on the same network as the router
curl http://192.168.10.100

# You should get the nginx welcome page
```

## Advanced Configuration

### Advertising Pod CIDRs

If you want external systems to reach pods directly by their IP, add a `PodCIDR` advertisement:

```yaml
apiVersion: cilium.io/v2
kind: CiliumBGPAdvertisement
metadata:
  name: podcidr-advertisements
  labels:
    advertise: bgp
spec:
  advertisements:
  - advertisementType: "PodCIDR"
```

### Multiple BGP Peers

For redundancy, add additional peers to the BGP instance:

```yaml
bgpInstances:
- name: instance-65000
  localASN: 65000
  peers:
  - name: router-1
    peerASN: 65001
    peerAddress: "192.168.1.1"
    peerConfigRef:
      name: upstream-peer-config
  - name: router-2
    peerASN: 65001
    peerAddress: "192.168.1.2"
    peerConfigRef:
      name: upstream-peer-config
```

### Service Selection

Control which services are advertised by adjusting the selector on the advertisement:

```yaml
# Only advertise services with a specific label
selector:
  matchLabels:
    bgp-advertise: "true"
```

Then label the services you want advertised:

```bash
kubectl label svc nginx-lb bgp-advertise=true
```

## Troubleshooting

```bash
# Check BGP peer status
kubectl exec -n kube-system ds/cilium -- cilium bgp peers

# Check advertised routes
kubectl exec -n kube-system ds/cilium -- cilium bgp routes advertised ipv4 unicast

# Check received routes
kubectl exec -n kube-system ds/cilium -- cilium bgp routes received ipv4 unicast

# View Cilium agent logs for BGP messages
kubectl logs -n kube-system -l k8s-app=cilium --tail=100 | grep -i bgp

# Verify BGP resources and IP pool allocation
kubectl get ciliumbgpclusterconfigs
kubectl get ciliumbgppeerconfigs
kubectl get ciliumbgpadvertisements
kubectl get ciliumloadbalancerippools
```

Common issues:

- **Peer not establishing** - Check firewall rules for TCP port 179 (BGP)
- **Routes not appearing** - Verify the `CiliumBGPAdvertisement` selector matches your services and that the advertisement label is selected by the peer config's `families[].advertisements`
- **ECMP not working** - Ensure your router is configured for multi-path

## Summary

Configuring BGP with Cilium on Talos Linux gives your bare-metal cluster proper LoadBalancer service support. Define an IP pool, set up BGP peering with your network routers, and services automatically get external IPs that are reachable from your network. The setup integrates cleanly with existing network infrastructure and provides the automatic failover and load distribution that production environments need.
