# How to Set Up MetalLB with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MetalLB, Load Balancing, Bare Metal, Kubernetes, Networking

Description: Step-by-step guide to installing and configuring MetalLB on Talos Linux for bare metal Kubernetes load balancing in both Layer 2 and BGP modes.

---

MetalLB solves one of the biggest pain points of running Kubernetes on bare metal: LoadBalancer services. On cloud providers, creating a Service with `type: LoadBalancer` automatically provisions a cloud load balancer. On bare metal, that same service just sits in a "Pending" state forever because there is no cloud provider to create a load balancer for you. MetalLB fills that gap by assigning real IP addresses to LoadBalancer services and making them accessible from outside the cluster.

This guide walks through setting up MetalLB on a Talos Linux cluster in both Layer 2 and BGP modes.

## How MetalLB Works

MetalLB consists of two main components:

- **Controller**: A deployment that watches for LoadBalancer services and assigns IP addresses from configured pools
- **Speaker**: A DaemonSet that runs on every node and handles the actual network advertisement of assigned IPs

MetalLB supports two advertisement modes:

- **Layer 2 mode**: Uses ARP (IPv4) or NDP (IPv6) to announce service IPs on the local network. Simple to set up, but all traffic for a service goes through a single node.
- **BGP mode**: Announces service IPs via BGP to your network routers. More complex to set up, but provides true load balancing across nodes.

## Prerequisites

- A running Talos Linux cluster
- kubectl and Helm configured
- For L2 mode: available IP addresses on your node network
- For BGP mode: a BGP-capable router and an ASN assignment

## Talos Linux Configuration for MetalLB

Talos Linux requires some specific configuration to work well with MetalLB. In particular, you need to enable strict ARP mode for kube-proxy if you are using it:

```yaml
# Talos machine config for MetalLB compatibility
cluster:
  proxy:
    extraArgs:
      ipvs-strict-arp: "true"    # Required for MetalLB L2 mode with IPVS
```

If you are using Cilium as a kube-proxy replacement, you do not need this setting.

Apply the config:

```bash
# Apply to all control plane nodes
talosctl -n <cp-ip> apply-config --file controlplane.yaml
```

## Installing MetalLB

### Method 1: Using Manifests

```bash
# Install MetalLB using the official manifests
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml

# Wait for all MetalLB pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=120s
```

### Method 2: Using Helm

```bash
# Add MetalLB Helm repo
helm repo add metallb https://metallb.github.io/metallb
helm repo update

# Install MetalLB
helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace
```

Verify the installation:

```bash
# Check all MetalLB components
kubectl get pods -n metallb-system

# You should see one controller pod and one speaker pod per node
kubectl get daemonset -n metallb-system
kubectl get deployment -n metallb-system
```

## Configuring Layer 2 Mode

Layer 2 mode is the simplest to set up and works in any network environment. Create an IP address pool and an L2 advertisement:

```yaml
# metallb-l2-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250  # Range of IPs for services
    # You can also use CIDR notation:
    # - 192.168.1.200/28
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
```

```bash
# Apply the configuration
kubectl apply -f metallb-l2-config.yaml

# Verify the pool was created
kubectl get ipaddresspool -n metallb-system
```

### Testing Layer 2 Mode

Create a test service to verify MetalLB is working:

```bash
# Create a test deployment and LoadBalancer service
kubectl create deployment test-lb --image=nginx --replicas=2
kubectl expose deployment test-lb --port=80 --type=LoadBalancer

# Check that an external IP was assigned
kubectl get svc test-lb
# Should show an EXTERNAL-IP from your pool

# Test access
curl http://192.168.1.200
```

## Configuring BGP Mode

BGP mode provides better load distribution than L2 mode because your router can spread traffic across multiple nodes. However, it requires a BGP-capable router.

```yaml
# metallb-bgp-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.10.10.0/24    # IP range to announce via BGP
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-peer
  namespace: metallb-system
spec:
  myASN: 64500         # ASN for your cluster
  peerASN: 64501        # ASN of your router
  peerAddress: 192.168.1.1  # Router IP
  # Optional: restrict to specific nodes
  # nodeSelectors:
  #   - matchLabels:
  #       node-role.kubernetes.io/worker: ""
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: default-bgp
  namespace: metallb-system
spec:
  ipAddressPools:
    - bgp-pool
  # Optional: aggregate routes
  # aggregationLength: 24
```

```bash
kubectl apply -f metallb-bgp-config.yaml

# Verify BGP sessions are established
kubectl logs -n metallb-system -l component=speaker | grep -i "bgp\|session"
```

## Advanced Configuration

### Multiple IP Pools

You can create multiple pools for different purposes:

```yaml
# Multiple pools for different service tiers
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.220
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: staging-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.221-192.168.1.240
```

Request a specific pool in your service:

```yaml
# Service requesting a specific pool
apiVersion: v1
kind: Service
metadata:
  name: production-service
  annotations:
    metallb.universe.tf/address-pool: production-pool
spec:
  type: LoadBalancer
  ports:
    - port: 80
  selector:
    app: production-app
```

### Requesting a Specific IP

```yaml
# Service with a specific load balancer IP
apiVersion: v1
kind: Service
metadata:
  name: specific-ip-service
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.205    # Request this specific IP
  ports:
    - port: 80
  selector:
    app: my-app
```

### Sharing IPs Between Services

Multiple services can share the same external IP:

```yaml
# Two services sharing one IP
apiVersion: v1
kind: Service
metadata:
  name: http-service
  annotations:
    metallb.universe.tf/allow-shared-ip: shared-web
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
    - port: 80
  selector:
    app: web
---
apiVersion: v1
kind: Service
metadata:
  name: https-service
  annotations:
    metallb.universe.tf/allow-shared-ip: shared-web
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
    - port: 443
  selector:
    app: web
```

## Troubleshooting MetalLB on Talos Linux

### Service Stuck in Pending State

```bash
# Check MetalLB controller logs
kubectl logs -n metallb-system -l component=controller

# Verify IP address pool has available addresses
kubectl get ipaddresspool -n metallb-system -o yaml

# Check if the pool is exhausted
kubectl get svc --all-namespaces --field-selector spec.type=LoadBalancer
```

### External IP Not Reachable

```bash
# Check which node is announcing the IP (L2 mode)
kubectl logs -n metallb-system -l component=speaker | grep "announcing"

# Verify ARP is working
# From another machine on the same network:
arp -n | grep 192.168.1.200

# Check speaker logs for errors
kubectl logs -n metallb-system -l component=speaker --tail=50
```

### L2 Mode Failover Issues

In L2 mode, if the node announcing the IP goes down, another speaker should take over. If failover is not working:

```bash
# Check speaker health on all nodes
kubectl get pods -n metallb-system -l component=speaker -o wide

# Look for leader election issues
kubectl logs -n metallb-system -l component=speaker | grep -i "leader\|election\|failover"
```

### BGP Session Not Establishing

```bash
# Check BGP peer status
kubectl logs -n metallb-system -l component=speaker | grep -i "bgp"

# Verify network connectivity to the BGP peer
# The speaker pods need TCP port 179 access to the router
kubectl exec -n metallb-system $(kubectl get pods -n metallb-system -l component=speaker -o name | head -1) -- netstat -tn | grep 179
```

## Performance Considerations

**L2 Mode Limitations**: All traffic to a given service flows through a single node, creating a potential bottleneck. If you need higher throughput, either use BGP mode or run multiple instances of your service with different IPs.

**BGP Mode with ECMP**: When using BGP, configure your router for Equal-Cost Multi-Path (ECMP) routing to distribute traffic across all nodes advertising the service IP.

```yaml
# BGP with community for traffic engineering
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: high-priority
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool
  communities:
    - 64500:100    # Mark with BGP community
```

## Conclusion

MetalLB is essential for running production Kubernetes workloads on Talos Linux bare metal clusters. Layer 2 mode gets you up and running quickly with minimal network requirements, while BGP mode gives you proper load distribution and integration with your network infrastructure. Start with L2 mode to validate your setup, then consider moving to BGP when you need better performance or more sophisticated traffic engineering. The key thing to remember is that MetalLB needs available IP addresses on your network, so plan your IP allocation carefully before deployment.
