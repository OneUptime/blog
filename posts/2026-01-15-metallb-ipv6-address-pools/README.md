# How to Set Up MetalLB with IPv6 Address Pools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Kubernetes, MetalLB, Load Balancing, Networking, DevOps

Description: A comprehensive guide to configuring MetalLB load balancer with IPv6 address pools in Kubernetes for modern dual-stack and IPv6-only networking environments.

---

The IPv4 address exhaustion is no longer a distant warning-it is reality. With IANA pools depleted and regional registries rationing their last /24 blocks, organizations are finally treating IPv6 as a first-class citizen. If you run Kubernetes on bare metal or in environments without cloud-native load balancers, MetalLB is likely your go-to solution for exposing services. This guide walks through configuring MetalLB with IPv6 address pools, covering everything from basic setup to production-hardened configurations.

## Why IPv6 Matters for Kubernetes

Before diving into configuration, let us address why you should care about IPv6 in your Kubernetes clusters:

| Concern | IPv4 Reality | IPv6 Solution |
| --- | --- | --- |
| **Address Availability** | NAT everywhere, CGNAT breaking end-to-end connectivity | 340 undecillion addresses, no NAT needed |
| **Performance** | Extra hops through NAT devices add latency | Direct end-to-end connections |
| **Security** | NAT provides false sense of security | IPsec built into the protocol |
| **Mobile/IoT** | Device proliferation strains limited pools | Every device gets a globally unique address |
| **Cloud Costs** | Public IPv4 addresses now cost $0.005/hour on AWS | IPv6 addresses are free on most providers |

MetalLB supports IPv6 natively, and with proper configuration, you can run dual-stack (IPv4 + IPv6) or IPv6-only clusters.

## Prerequisites

Before configuring MetalLB with IPv6, ensure your environment meets these requirements:

```bash
# Check if your cluster supports IPv6
# Your CNI must support IPv6 (Calico, Cilium, Flannel with IPv6 config)
kubectl get nodes -o wide

# Verify IPv6 is enabled on your nodes
# Run this on each worker node
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should return 0 (IPv6 enabled)

# Check if your kernel supports IPv6
# Minimum kernel version 4.19+ recommended
uname -r

# Verify your network infrastructure supports IPv6
# Your upstream router/switch must handle IPv6 traffic
ip -6 addr show
```

Your environment should have:

- Kubernetes 1.20+ (for stable dual-stack support)
- MetalLB 0.13+ (for CRD-based configuration)
- IPv6-capable CNI (Calico, Cilium, or Flannel with IPv6)
- IPv6 connectivity from your nodes to upstream network
- An IPv6 address range allocated for LoadBalancer services

## Understanding MetalLB Modes

MetalLB operates in two modes, both supporting IPv6:

### Layer 2 Mode (ARP/NDP)

In Layer 2 mode, MetalLB responds to ARP (IPv4) or NDP (IPv6) requests for service IPs. One node becomes the "leader" for each IP and attracts all traffic for that service.

```yaml
# Layer 2 mode characteristics for IPv6:
# - Uses Neighbor Discovery Protocol (NDP) instead of ARP
# - Single node handles all traffic for a service IP
# - Failover occurs when leader node fails (10-30 seconds)
# - Simple setup, no router configuration needed
# - Limited to single network segment (same L2 domain)
```

### BGP Mode

In BGP mode, MetalLB peers with your network routers and announces service IPs via BGP. Traffic is distributed across multiple nodes using ECMP (Equal-Cost Multi-Path).

```yaml
# BGP mode characteristics for IPv6:
# - True load balancing across nodes via ECMP
# - Fast failover (BGP hold timers, typically 3-9 seconds)
# - Works across L3 boundaries (routed networks)
# - Requires BGP-capable routers and peering configuration
# - More complex setup but better for production
```

## Installing MetalLB

Let us start with a fresh MetalLB installation using the recommended method:

```bash
# Create the metallb-system namespace
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml

# Verify the installation
kubectl get pods -n metallb-system

# Expected output:
# NAME                          READY   STATUS    RESTARTS   AGE
# controller-5f784dd8f9-xxxxx   1/1     Running   0          30s
# speaker-xxxxx                 1/1     Running   0          30s
# speaker-yyyyy                 1/1     Running   0          30s
# speaker-zzzzz                 1/1     Running   0          30s

# Wait for all pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s
```

## Configuring IPv6 Address Pools

MetalLB uses Custom Resource Definitions (CRDs) for configuration since version 0.13. Here is how to set up IPv6 address pools:

### Basic IPv6 Address Pool (Layer 2)

```yaml
# ipv6-pool-basic.yaml
# This configuration creates a simple IPv6 address pool for Layer 2 mode
# Replace the address range with your allocated IPv6 prefix

apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-pool
  namespace: metallb-system
  labels:
    # Labels help with organization and selection
    environment: production
    protocol: ipv6
spec:
  # Define the IPv6 address range
  # This example uses a /120 prefix (256 addresses)
  # Adjust based on your allocation
  addresses:
    - 2001:db8:1234:5678::100-2001:db8:1234:5678::1ff

  # autoAssign controls whether this pool is used automatically
  # Set to false if you want explicit pool selection per service
  autoAssign: true

  # avoidBuggyIPs skips addresses ending in .0 or .255 for IPv4
  # Not applicable to IPv6 but included for completeness
  avoidBuggyIPs: false

---
# L2Advertisement tells MetalLB to announce these IPs via NDP
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: ipv6-l2-advertisement
  namespace: metallb-system
spec:
  # Reference the IPv6 pool created above
  ipAddressPools:
    - ipv6-pool

  # Optional: limit advertisement to specific interfaces
  # Useful in multi-homed setups
  # interfaces:
  #   - eth0

  # Optional: limit to specific nodes using nodeSelectors
  # nodeSelectors:
  #   - matchLabels:
  #       node-role.kubernetes.io/worker: "true"
```

Apply the configuration:

```bash
# Apply the IPv6 pool configuration
kubectl apply -f ipv6-pool-basic.yaml

# Verify the pool was created
kubectl get ipaddresspools -n metallb-system

# Expected output:
# NAME        AUTO ASSIGN   AVOID BUGGY IPS   ADDRESSES
# ipv6-pool   true          false             ["2001:db8:1234:5678::100-2001:db8:1234:5678::1ff"]

# Verify the L2 advertisement
kubectl get l2advertisements -n metallb-system

# Expected output:
# NAME                      IPADDRESSPOOLS   IPADDRESSPOOL SELECTORS   INTERFACES
# ipv6-l2-advertisement     ["ipv6-pool"]
```

### Dual-Stack Configuration (IPv4 + IPv6)

Most production environments need both IPv4 and IPv6. Here is a complete dual-stack configuration:

```yaml
# dual-stack-pools.yaml
# Complete dual-stack MetalLB configuration
# Provides both IPv4 and IPv6 address pools

apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv4-pool
  namespace: metallb-system
  labels:
    environment: production
    protocol: ipv4
spec:
  addresses:
    # IPv4 address range for LoadBalancer services
    # Adjust to your network allocation
    - 192.168.100.100-192.168.100.150
  autoAssign: true
  avoidBuggyIPs: true

---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-pool
  namespace: metallb-system
  labels:
    environment: production
    protocol: ipv6
spec:
  addresses:
    # IPv6 address range for LoadBalancer services
    # This /120 gives you 256 addresses
    - 2001:db8:1234:5678::100-2001:db8:1234:5678::1ff
  autoAssign: true
  avoidBuggyIPs: false

---
# Combined pool for dual-stack services
# Services can request IPs from both pools simultaneously
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: dual-stack-pool
  namespace: metallb-system
  labels:
    environment: production
    protocol: dual-stack
spec:
  addresses:
    # Include both IPv4 and IPv6 ranges
    - 192.168.100.200-192.168.100.250
    - 2001:db8:1234:5678::200-2001:db8:1234:5678::2ff
  autoAssign: false  # Require explicit selection

---
# L2 Advertisement for all pools
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: dual-stack-l2-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - ipv4-pool
    - ipv6-pool
    - dual-stack-pool
```

### IPv6 BGP Configuration

For production environments requiring true load balancing and fast failover, BGP mode is recommended:

```yaml
# ipv6-bgp-config.yaml
# Production BGP configuration for IPv6
# Requires BGP-capable routers (e.g., FRR, Bird, Cisco, Juniper)

apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-bgp-pool
  namespace: metallb-system
  labels:
    environment: production
    mode: bgp
spec:
  addresses:
    # Use a dedicated /64 or smaller prefix for BGP announcements
    # This prefix should be routable in your network
    - 2001:db8:abcd:ef00::/120
  autoAssign: true

---
# BGP Peer configuration for IPv6
# Configure one BGPPeer per router you peer with
apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: router1-ipv6
  namespace: metallb-system
spec:
  # Your router's IPv6 address
  peerAddress: 2001:db8:1234:5678::1

  # Your router's AS number
  peerASN: 64512

  # MetalLB's AS number (use private AS range 64512-65534)
  myASN: 64513

  # Optional: source address for BGP session
  # sourceAddress: 2001:db8:1234:5678::10

  # Optional: BGP hold time in seconds
  # Lower values = faster failover but more CPU on router
  holdTime: 90s

  # Optional: keepalive interval
  keepaliveTime: 30s

  # Optional: password for BGP session (MD5)
  # password: "your-bgp-password"

  # Optional: limit peering to specific nodes
  # nodeSelectors:
  #   - matchLabels:
  #       bgp-peer: "enabled"

---
# Second BGP peer for redundancy
apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: router2-ipv6
  namespace: metallb-system
spec:
  peerAddress: 2001:db8:1234:5678::2
  peerASN: 64512
  myASN: 64513
  holdTime: 90s
  keepaliveTime: 30s

---
# BGP Advertisement configuration
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: ipv6-bgp-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - ipv6-bgp-pool

  # Optional: aggregate routes to reduce BGP table size
  # aggregationLength: 120

  # Optional: set BGP communities for traffic engineering
  communities:
    - 64512:100

  # Optional: set local preference (higher = preferred)
  localPref: 100

  # Optional: peer-specific advertisements
  # peers:
  #   - router1-ipv6
  #   - router2-ipv6
```

### Router Configuration Example (FRRouting)

If you are using FRRouting (FRR) on your router, here is a matching configuration:

```bash
# /etc/frr/frr.conf
# FRRouting configuration for MetalLB BGP peering

frr version 8.5
frr defaults traditional
hostname router1
log syslog informational
service integrated-vtysh-config

# Enable IPv6 forwarding
ipv6 forwarding

# BGP configuration
router bgp 64512
 bgp router-id 10.0.0.1

 # IPv6 neighbor configuration for each MetalLB speaker
 # Replace with your actual node IPv6 addresses
 neighbor 2001:db8:1234:5678::10 remote-as 64513
 neighbor 2001:db8:1234:5678::11 remote-as 64513
 neighbor 2001:db8:1234:5678::12 remote-as 64513

 # Enable IPv6 address family
 address-family ipv6 unicast
  # Activate neighbors for IPv6
  neighbor 2001:db8:1234:5678::10 activate
  neighbor 2001:db8:1234:5678::11 activate
  neighbor 2001:db8:1234:5678::12 activate

  # Accept routes from MetalLB
  neighbor 2001:db8:1234:5678::10 soft-reconfiguration inbound
  neighbor 2001:db8:1234:5678::11 soft-reconfiguration inbound
  neighbor 2001:db8:1234:5678::12 soft-reconfiguration inbound

  # Enable ECMP for load balancing
  maximum-paths 3
 exit-address-family

# Save the configuration
# vtysh -c "write memory"
```

## Creating Services with IPv6

Now let us create services that use our IPv6 address pools:

### Basic IPv6-Only Service

```yaml
# ipv6-service.yaml
# A service that only gets an IPv6 address

apiVersion: v1
kind: Service
metadata:
  name: my-app-ipv6
  namespace: default
  annotations:
    # Explicitly select the IPv6 pool
    metallb.universe.tf/address-pool: ipv6-pool
spec:
  type: LoadBalancer

  # For IPv6-only, use SingleStack with IPv6
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6

  selector:
    app: my-app
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8443
```

### Dual-Stack Service

```yaml
# dual-stack-service.yaml
# A service that gets both IPv4 and IPv6 addresses

apiVersion: v1
kind: Service
metadata:
  name: my-app-dual-stack
  namespace: default
  annotations:
    # Use the dual-stack pool
    metallb.universe.tf/address-pool: dual-stack-pool
spec:
  type: LoadBalancer

  # RequireDualStack ensures both IPv4 and IPv6 are assigned
  # PreferDualStack would allow single-stack if dual not available
  ipFamilyPolicy: RequireDualStack

  # Order matters: first family is primary
  # Clients will prefer IPv6 if both are available
  ipFamilies:
    - IPv6
    - IPv4

  selector:
    app: my-app
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

### Service with Specific IPv6 Address

```yaml
# specific-ip-service.yaml
# Request a specific IPv6 address from the pool

apiVersion: v1
kind: Service
metadata:
  name: my-app-specific-ip
  namespace: default
spec:
  type: LoadBalancer

  # Request specific IPs
  # These must be within your configured address pools
  loadBalancerIP: "2001:db8:1234:5678::150"

  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6

  selector:
    app: my-app
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

### Verify Service IPv6 Assignment

```bash
# Check if the service got an IPv6 address
kubectl get svc my-app-ipv6 -o wide

# Expected output:
# NAME          TYPE           CLUSTER-IP        EXTERNAL-IP                   PORT(S)
# my-app-ipv6   LoadBalancer   fd00::1234:5678   2001:db8:1234:5678::100       80:31234/TCP

# Get detailed service information
kubectl describe svc my-app-ipv6

# Check MetalLB events
kubectl get events -n metallb-system --sort-by='.lastTimestamp'

# Verify the IP is being advertised (Layer 2)
# Run this on a node to see NDP entries
ip -6 neigh show

# For BGP mode, check routing table on your router
# vtysh -c "show ipv6 route"
```

## Advanced Configurations

### Multiple Address Pools with Selectors

```yaml
# multi-pool-config.yaml
# Different pools for different environments/namespaces

apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-ipv6
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:prod::100-2001:db8:prod::1ff
  autoAssign: false

---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: staging-ipv6
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:stage::100-2001:db8:stage::1ff
  autoAssign: false

---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: development-ipv6
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:dev::100-2001:db8:dev::1ff
  autoAssign: true  # Default for dev services

---
# L2 advertisements with namespace selectors
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: production-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-ipv6
  # Only advertise to services in production namespace
  # that have the correct annotation

---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: staging-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - staging-ipv6

---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: development-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - development-ipv6
```

### Interface-Specific Advertisements

```yaml
# interface-specific.yaml
# Advertise different pools on different network interfaces
# Useful for multi-homed nodes with separate networks

apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: public-ipv6-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - public-ipv6-pool
  # Only announce on the public-facing interface
  interfaces:
    - eth0
    - ens192

---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: internal-ipv6-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - internal-ipv6-pool
  # Only announce on the internal network interface
  interfaces:
    - eth1
    - ens224
```

### Node-Specific BGP Peering

```yaml
# node-specific-bgp.yaml
# Different BGP peers for different node groups
# Useful for rack-aware or zone-aware deployments

apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: rack1-router-ipv6
  namespace: metallb-system
spec:
  peerAddress: 2001:db8:rack1::1
  peerASN: 64512
  myASN: 64513
  # Only nodes in rack1 peer with this router
  nodeSelectors:
    - matchLabels:
        topology.kubernetes.io/rack: "rack1"

---
apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: rack2-router-ipv6
  namespace: metallb-system
spec:
  peerAddress: 2001:db8:rack2::1
  peerASN: 64512
  myASN: 64513
  nodeSelectors:
    - matchLabels:
        topology.kubernetes.io/rack: "rack2"
```

## Troubleshooting IPv6 MetalLB

### Common Issues and Solutions

```bash
# Issue 1: Service stuck in Pending state
# Check if addresses are available in the pool
kubectl get ipaddresspools -n metallb-system -o yaml

# Check MetalLB controller logs
kubectl logs -n metallb-system -l component=controller --tail=100

# Check for events
kubectl describe svc <service-name>

# Issue 2: IPv6 address assigned but not reachable
# Verify NDP is working (Layer 2 mode)
# Run on client machine:
ping6 2001:db8:1234:5678::100

# Check if the speaker is advertising
kubectl logs -n metallb-system -l component=speaker --tail=100

# Verify the speaker has correct interface configuration
kubectl exec -n metallb-system <speaker-pod> -- ip -6 addr show

# Issue 3: BGP session not establishing
# Check BGP peer status
kubectl get bgppeers -n metallb-system -o yaml

# Check speaker logs for BGP errors
kubectl logs -n metallb-system -l component=speaker | grep -i bgp

# Verify connectivity to router
kubectl exec -n metallb-system <speaker-pod> -- ping6 -c 3 2001:db8:1234:5678::1

# Issue 4: Dual-stack service only gets one IP family
# Ensure cluster supports dual-stack
kubectl get nodes -o jsonpath='{.items[*].status.addresses}'

# Verify service spec
kubectl get svc <service-name> -o yaml | grep -A5 ipFamilies
```

### Verification Commands

```bash
# Comprehensive verification script
# Run these commands to verify your IPv6 MetalLB setup

echo "=== MetalLB Components ==="
kubectl get pods -n metallb-system -o wide

echo ""
echo "=== IP Address Pools ==="
kubectl get ipaddresspools -n metallb-system

echo ""
echo "=== L2 Advertisements ==="
kubectl get l2advertisements -n metallb-system

echo ""
echo "=== BGP Peers (if using BGP mode) ==="
kubectl get bgppeers -n metallb-system

echo ""
echo "=== BGP Advertisements (if using BGP mode) ==="
kubectl get bgpadvertisements -n metallb-system

echo ""
echo "=== LoadBalancer Services ==="
kubectl get svc --all-namespaces -o wide | grep LoadBalancer

echo ""
echo "=== Service External IPs ==="
kubectl get svc --all-namespaces -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.name}{"\t"}{.status.loadBalancer.ingress[*].ip}{"\n"}{end}'

echo ""
echo "=== MetalLB Events ==="
kubectl get events -n metallb-system --sort-by='.lastTimestamp' | tail -20
```

### Testing IPv6 Connectivity

```bash
# Test IPv6 connectivity to your service
# Replace with your actual service IPv6 address

# Basic connectivity test
ping6 -c 5 2001:db8:1234:5678::100

# TCP connectivity test
nc -6 -zv 2001:db8:1234:5678::100 80

# HTTP test with curl
curl -6 -v http://[2001:db8:1234:5678::100]/

# Test from within the cluster
kubectl run test-ipv6 --rm -it --image=busybox --restart=Never -- \
  wget -O- http://[2001:db8:1234:5678::100]/

# Traceroute to verify path
traceroute6 2001:db8:1234:5678::100
```

## Security Considerations

### Network Policies for IPv6 Services

```yaml
# ipv6-network-policy.yaml
# Restrict access to IPv6 LoadBalancer services

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-ingress
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
  ingress:
    # Allow traffic from specific IPv6 ranges
    - from:
        - ipBlock:
            cidr: 2001:db8:allowed::/48
        - ipBlock:
            cidr: 2001:db8:office::/64
      ports:
        - protocol: TCP
          port: 8080
```

### Securing BGP Sessions

```yaml
# secure-bgp-peer.yaml
# BGP peer with authentication and filtering

apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: secure-router-ipv6
  namespace: metallb-system
spec:
  peerAddress: 2001:db8:1234:5678::1
  peerASN: 64512
  myASN: 64513

  # MD5 authentication for BGP session
  # Store the password in a Kubernetes secret in production
  password: "StrongBGPPassword123!"

  # Limit which nodes can peer
  nodeSelectors:
    - matchLabels:
        bgp-enabled: "true"
        security-zone: "dmz"

  # BFD for faster failure detection (if supported)
  bfdProfile: production-bfd

---
# BFD Profile for fast failover
apiVersion: metallb.io/v1beta1
kind: BFDProfile
metadata:
  name: production-bfd
  namespace: metallb-system
spec:
  # BFD timers for fast detection
  receiveInterval: 300
  transmitInterval: 300
  detectMultiplier: 3
  # Minimum TTL for BFD packets
  minimumTtl: 254
```

## Monitoring MetalLB IPv6

### Prometheus Metrics

```yaml
# metallb-servicemonitor.yaml
# ServiceMonitor for Prometheus to scrape MetalLB metrics

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metallb
  namespace: metallb-system
  labels:
    app: metallb
spec:
  selector:
    matchLabels:
      app: metallb
  namespaceSelector:
    matchNames:
      - metallb-system
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Key Metrics to Monitor

```bash
# Important MetalLB metrics for IPv6

# Number of IPs allocated from each pool
metallb_allocator_addresses_in_use_total{pool="ipv6-pool"}

# BGP session state (1 = established)
metallb_bgp_session_up{peer="2001:db8:1234:5678::1"}

# Number of announced routes
metallb_bgp_announced_prefixes_total

# L2 leader status for services
metallb_layer2_leader{service="default/my-app-ipv6"}

# Address pool utilization
metallb_allocator_addresses_total{pool="ipv6-pool"}
```

### Grafana Dashboard Query Examples

```promql
# IPv6 Address Pool Utilization
sum(metallb_allocator_addresses_in_use_total{pool=~".*ipv6.*"})
  /
sum(metallb_allocator_addresses_total{pool=~".*ipv6.*"}) * 100

# BGP Session Health for IPv6 Peers
metallb_bgp_session_up{peer=~"2001:.*"}

# Services per IPv6 Pool
count by (pool) (metallb_allocator_addresses_in_use_total{pool=~".*ipv6.*"})

# L2 Failover Events (leader changes)
changes(metallb_layer2_leader[5m])
```

## Best Practices

### IPv6 Address Planning

```text
IPv6 Address Allocation Strategy for MetalLB:

1. Request at minimum a /64 from your ISP/RIR for services
2. Subdivide logically:

   2001:db8:1234:5678::/64 - Your allocation
   ├── 2001:db8:1234:5678:0000::/80 - Production services
   │   ├── 2001:db8:1234:5678:0000:0000::/96 - Web tier
   │   ├── 2001:db8:1234:5678:0000:0001::/96 - API tier
   │   └── 2001:db8:1234:5678:0000:0002::/96 - Database tier
   ├── 2001:db8:1234:5678:0001::/80 - Staging services
   ├── 2001:db8:1234:5678:0002::/80 - Development services
   └── 2001:db8:1234:5678:ffff::/80 - Reserved for future

3. Document your allocation in your IPAM system
4. Use meaningful address patterns where possible
```

### Configuration Checklist

```yaml
# Pre-deployment checklist for IPv6 MetalLB

# 1. Network Infrastructure
# [ ] Upstream router supports IPv6
# [ ] IPv6 prefix allocated and routable
# [ ] Firewall rules allow IPv6 traffic
# [ ] DNS AAAA records planned

# 2. Kubernetes Cluster
# [ ] Dual-stack enabled in kube-apiserver
# [ ] CNI configured for IPv6
# [ ] Node IPv6 addresses assigned
# [ ] CoreDNS handles IPv6 resolution

# 3. MetalLB Configuration
# [ ] Address pools defined with correct ranges
# [ ] L2 or BGP mode chosen based on requirements
# [ ] Advertisements configured
# [ ] BGP peers configured (if using BGP)

# 4. Security
# [ ] Network policies defined
# [ ] BGP authentication enabled (if using BGP)
# [ ] Firewall rules for service IPs

# 5. Monitoring
# [ ] Prometheus scraping MetalLB metrics
# [ ] Alerts configured for pool exhaustion
# [ ] BGP session monitoring (if applicable)
```

## Summary Table

| Configuration Aspect | Layer 2 Mode | BGP Mode |
| --- | --- | --- |
| **Protocol** | NDP (Neighbor Discovery) | BGP with IPv6 AFI |
| **Failover Time** | 10-30 seconds | 3-9 seconds (configurable) |
| **Load Balancing** | Single node per IP | True ECMP across nodes |
| **Network Requirement** | Same L2 domain | L3 routed, BGP-capable routers |
| **Complexity** | Low | Medium-High |
| **Best For** | Small clusters, simple networks | Production, multi-rack deployments |
| **IPv6 Prefix Size** | Any (/120 common) | /64 or smaller recommended |
| **Router Config Needed** | No | Yes (BGP peering) |

## Conclusion

Configuring MetalLB with IPv6 address pools prepares your Kubernetes infrastructure for the IPv6-native future. Whether you choose Layer 2 mode for simplicity or BGP mode for production-grade load balancing, MetalLB provides a solid foundation for exposing services over IPv6.

Key takeaways:

1. **Start with dual-stack** - Support both IPv4 and IPv6 during the transition period
2. **Plan your address space** - IPv6 gives you plenty of room; use it wisely
3. **Choose the right mode** - Layer 2 for simplicity, BGP for production
4. **Monitor everything** - Track pool utilization and BGP session health
5. **Test failover** - Verify your services remain available during node failures

With IPv4 addresses becoming scarcer and more expensive, investing in IPv6 infrastructure today pays dividends tomorrow. MetalLB makes this transition straightforward, giving you the flexibility to run modern, IPv6-enabled Kubernetes workloads on bare metal infrastructure.

For monitoring your MetalLB and Kubernetes infrastructure, consider using OneUptime to track service availability, set up alerts for pool exhaustion, and visualize BGP session health across your clusters.
