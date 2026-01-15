# How to Configure BGP for IPv6 with MetalLB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, BGP, MetalLB, Kubernetes, Networking, Load Balancing

Description: A comprehensive guide to configuring MetalLB with BGP for IPv6 address advertisement in Kubernetes clusters, covering dual-stack deployments, router peering, and production-ready configurations.

---

IPv6 adoption is no longer optional. With IPv4 address exhaustion accelerating and major cloud providers charging premiums for public IPv4 addresses, running dual-stack or IPv6-only Kubernetes clusters has become a practical necessity. MetalLB, the go-to bare-metal load balancer for Kubernetes, supports BGP-based IPv6 address advertisement, but configuring it correctly requires understanding both protocols deeply.

This guide walks you through setting up MetalLB with BGP for IPv6, from basic concepts to production-hardened configurations.

## Why BGP for IPv6 in Kubernetes?

MetalLB offers two modes for advertising LoadBalancer IPs: Layer 2 (ARP/NDP) and BGP. For IPv6, BGP provides significant advantages:

| Aspect | Layer 2 (NDP) | BGP |
| --- | --- | --- |
| **Failover speed** | Seconds to minutes (depends on NDP cache) | Sub-second with BFD |
| **Traffic distribution** | Single node receives all traffic | ECMP across multiple nodes |
| **Scalability** | Limited by broadcast domain | Scales to thousands of nodes |
| **Network integration** | Requires same L2 segment | Works across routed networks |
| **Router compatibility** | Any IPv6 router | Requires BGP-capable router |

BGP is the protocol that runs the internet. When you peer MetalLB with your upstream routers via BGP, your Kubernetes services become first-class citizens in your network topology. Traffic can be load-balanced across multiple nodes using Equal-Cost Multi-Path (ECMP), and failover happens at network speed rather than waiting for neighbor discovery caches to expire.

## Prerequisites

Before configuring MetalLB with BGP for IPv6, ensure you have:

1. **A Kubernetes cluster with IPv6 enabled** (dual-stack or IPv6-only)
2. **MetalLB v0.13.0 or later** (CRD-based configuration)
3. **A BGP-capable router** (physical router, virtual appliance, or software router like FRRouting)
4. **An IPv6 address pool** for LoadBalancer services
5. **Network connectivity** between Kubernetes nodes and the BGP peer

### Verifying IPv6 Cluster Configuration

First, confirm your cluster supports IPv6:

```bash
# Check node addresses
kubectl get nodes -o wide

# Verify pods have IPv6 addresses
kubectl get pods -A -o wide

# Check service CIDR includes IPv6
kubectl cluster-info dump | grep -i "service-cluster-ip-range"
```

For dual-stack clusters, you should see both IPv4 and IPv6 addresses assigned to nodes and pods.

## Installing MetalLB

Install MetalLB using the official manifests:

```bash
# Install MetalLB v0.14.9 (latest stable as of writing)
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml

# Wait for MetalLB pods to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=120s
```

Verify the installation:

```bash
kubectl get pods -n metallb-system
```

Expected output:

```
NAME                          READY   STATUS    RESTARTS   AGE
controller-5f7b9b6b4f-xxxxx   1/1     Running   0          2m
speaker-xxxxx                 1/1     Running   0          2m
speaker-yyyyy                 1/1     Running   0          2m
speaker-zzzzz                 1/1     Running   0          2m
```

## Basic IPv6 BGP Configuration

MetalLB uses Custom Resource Definitions (CRDs) for configuration. Here is a minimal setup for IPv6 BGP:

### Step 1: Define the IPv6 Address Pool

```yaml
# ipv6-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-pool
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:1000::/120
  autoAssign: true
```

This allocates a /120 prefix (256 addresses) for LoadBalancer services. Adjust the prefix based on your allocation from your Regional Internet Registry (RIR) or your organization's IPv6 plan.

### Step 2: Configure the BGP Peer

```yaml
# bgp-peer-ipv6.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: upstream-router-ipv6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  password: "your-bgp-password"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
```

### Step 3: Create the BGP Advertisement

```yaml
# bgp-advertisement-ipv6.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: ipv6-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - ipv6-pool
  aggregationLength: 120
  aggregationLengthV6: 120
  localPref: 100
  communities:
    - 64512:100
```

Apply all configurations:

```bash
kubectl apply -f ipv6-pool.yaml
kubectl apply -f bgp-peer-ipv6.yaml
kubectl apply -f bgp-advertisement-ipv6.yaml
```

## Dual-Stack Configuration

Most production environments run dual-stack, serving both IPv4 and IPv6 clients. Here is a complete dual-stack MetalLB configuration:

### Combined Address Pools

```yaml
# dual-stack-pools.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool-v4
  namespace: metallb-system
spec:
  addresses:
    - 203.0.113.0/28
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool-v6
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:1000::/120
  autoAssign: true
---
# Combined pool for dual-stack services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: dual-stack-pool
  namespace: metallb-system
spec:
  addresses:
    - 203.0.113.0/28
    - 2001:db8:1000::/120
  autoAssign: true
```

### Dual-Stack BGP Peers

```yaml
# dual-stack-peers.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: upstream-router-v4
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 10.0.0.1
  password: "bgp-secret-v4"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: upstream-router-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  password: "bgp-secret-v6"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
```

### Dual-Stack Advertisements

```yaml
# dual-stack-advertisements.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: dual-stack-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - dual-stack-pool
  aggregationLength: 28
  aggregationLengthV6: 120
  localPref: 100
```

## Advanced BGP Configuration

### Node Selectors for BGP Speakers

In large clusters, you may want only specific nodes to participate in BGP peering:

```yaml
# selective-bgp-peer.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: edge-router-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  nodeSelectors:
    - matchLabels:
        node-role.kubernetes.io/bgp-speaker: "true"
    - matchExpressions:
        - key: topology.kubernetes.io/zone
          operator: In
          values:
            - zone-a
            - zone-b
```

Label your BGP speaker nodes:

```bash
kubectl label node worker-1 node-role.kubernetes.io/bgp-speaker=true
kubectl label node worker-2 node-role.kubernetes.io/bgp-speaker=true
kubectl label node worker-3 node-role.kubernetes.io/bgp-speaker=true
```

### BFD (Bidirectional Forwarding Detection)

BFD provides sub-second failure detection for BGP sessions. Configure a BFD profile:

```yaml
# bfd-profile.yaml
apiVersion: metallb.io/v1beta1
kind: BFDProfile
metadata:
  name: production-bfd
  namespace: metallb-system
spec:
  receiveInterval: 300
  transmitInterval: 300
  detectMultiplier: 3
  echoMode: false
  passiveMode: false
  minimumTtl: 254
```

This configuration detects failures within 900ms (3 x 300ms). Reference this profile in your BGPPeer:

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: upstream-router-v6-bfd
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  bfdProfile: production-bfd
```

### BGP Communities

Use BGP communities to signal routing preferences to upstream routers:

```yaml
# bgp-communities.yaml
apiVersion: metallb.io/v1beta1
kind: Community
metadata:
  name: routing-communities
  namespace: metallb-system
spec:
  communities:
    - name: no-export
      value: 65535:65281
    - name: no-advertise
      value: 65535:65282
    - name: local-pref-high
      value: 64512:100
    - name: local-pref-low
      value: 64512:50
    - name: blackhole
      value: 64513:666
```

Reference communities in your advertisement:

```yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: production-advertisement-v6
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool-v6
  communities:
    - no-export
    - local-pref-high
```

### Multiple Upstream Routers

For redundancy, peer with multiple routers:

```yaml
# multi-router-peers.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-a-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  bfdProfile: production-bfd
  password: "secret-router-a"
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-b-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64514
  peerAddress: 2001:db8:100::2
  bfdProfile: production-bfd
  password: "secret-router-b"
```

## Router-Side Configuration

MetalLB only handles the Kubernetes side. You need to configure your upstream routers to accept BGP sessions. Here are examples for common router platforms:

### FRRouting (FRR) Configuration

FRRouting is popular for software-defined networking and is often used in bare-metal environments:

```
! /etc/frr/frr.conf
frr version 8.4
frr defaults traditional
hostname border-router
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config

! BGP Configuration
router bgp 64513
 bgp router-id 10.0.0.1
 no bgp default ipv4-unicast
 neighbor K8S_NODES peer-group
 neighbor K8S_NODES remote-as 64512
 neighbor K8S_NODES password your-bgp-password
 neighbor K8S_NODES ebgp-multihop 2

 ! IPv6 neighbors (Kubernetes nodes)
 neighbor 2001:db8:100::10 peer-group K8S_NODES
 neighbor 2001:db8:100::11 peer-group K8S_NODES
 neighbor 2001:db8:100::12 peer-group K8S_NODES

 address-family ipv6 unicast
  redistribute connected
  neighbor K8S_NODES activate
  neighbor K8S_NODES soft-reconfiguration inbound
  neighbor K8S_NODES route-map K8S-IN in
  neighbor K8S_NODES route-map K8S-OUT out
  maximum-paths 8
 exit-address-family

! Route maps for filtering
route-map K8S-IN permit 10
 match ipv6 address prefix-list K8S-PREFIXES
 set local-preference 100

route-map K8S-OUT deny 10

! Prefix list - only accept the allocated range
ipv6 prefix-list K8S-PREFIXES seq 10 permit 2001:db8:1000::/120 le 128

! BFD Configuration
bfd
 peer 2001:db8:100::10
  receive-interval 300
  transmit-interval 300
  detect-multiplier 3
 peer 2001:db8:100::11
  receive-interval 300
  transmit-interval 300
  detect-multiplier 3
 peer 2001:db8:100::12
  receive-interval 300
  transmit-interval 300
  detect-multiplier 3
```

### Cisco IOS-XE Configuration

```
! BGP Configuration for IPv6 with MetalLB
router bgp 64513
 bgp router-id 10.0.0.1
 bgp log-neighbor-changes
 no bgp default ipv4-unicast

 neighbor 2001:db8:100::10 remote-as 64512
 neighbor 2001:db8:100::10 password your-bgp-password
 neighbor 2001:db8:100::10 fall-over bfd
 neighbor 2001:db8:100::11 remote-as 64512
 neighbor 2001:db8:100::11 password your-bgp-password
 neighbor 2001:db8:100::11 fall-over bfd
 neighbor 2001:db8:100::12 remote-as 64512
 neighbor 2001:db8:100::12 password your-bgp-password
 neighbor 2001:db8:100::12 fall-over bfd

 address-family ipv6 unicast
  neighbor 2001:db8:100::10 activate
  neighbor 2001:db8:100::10 prefix-list K8S-ALLOWED in
  neighbor 2001:db8:100::10 prefix-list DENY-ALL out
  neighbor 2001:db8:100::11 activate
  neighbor 2001:db8:100::11 prefix-list K8S-ALLOWED in
  neighbor 2001:db8:100::11 prefix-list DENY-ALL out
  neighbor 2001:db8:100::12 activate
  neighbor 2001:db8:100::12 prefix-list K8S-ALLOWED in
  neighbor 2001:db8:100::12 prefix-list DENY-ALL out
  maximum-paths 8
 exit-address-family

! Prefix lists
ipv6 prefix-list K8S-ALLOWED seq 10 permit 2001:db8:1000::/120 le 128
ipv6 prefix-list DENY-ALL seq 10 deny ::/0 le 128

! BFD Configuration
bfd-template single-hop K8S-BFD
 interval min-tx 300 min-rx 300 multiplier 3

interface GigabitEthernet0/0
 bfd template K8S-BFD
```

### Juniper JunOS Configuration

```
# BGP Configuration for IPv6 with MetalLB
set routing-options router-id 10.0.0.1
set routing-options autonomous-system 64513

set protocols bgp group K8S-METALLB type external
set protocols bgp group K8S-METALLB peer-as 64512
set protocols bgp group K8S-METALLB family inet6 unicast
set protocols bgp group K8S-METALLB authentication-key "your-bgp-password"
set protocols bgp group K8S-METALLB bfd-liveness-detection minimum-interval 300
set protocols bgp group K8S-METALLB bfd-liveness-detection multiplier 3
set protocols bgp group K8S-METALLB multipath
set protocols bgp group K8S-METALLB import K8S-IMPORT
set protocols bgp group K8S-METALLB export DENY-ALL
set protocols bgp group K8S-METALLB neighbor 2001:db8:100::10
set protocols bgp group K8S-METALLB neighbor 2001:db8:100::11
set protocols bgp group K8S-METALLB neighbor 2001:db8:100::12

# Policy configuration
set policy-options prefix-list K8S-PREFIXES 2001:db8:1000::/120
set policy-options policy-statement K8S-IMPORT term 1 from prefix-list K8S-PREFIXES
set policy-options policy-statement K8S-IMPORT term 1 then accept
set policy-options policy-statement K8S-IMPORT term 2 then reject
set policy-options policy-statement DENY-ALL then reject

# Enable ECMP
set routing-options forwarding-table export LOAD-BALANCE
set policy-options policy-statement LOAD-BALANCE then load-balance per-packet
```

## Creating Dual-Stack Services

Once MetalLB is configured, create services that receive both IPv4 and IPv6 addresses:

```yaml
# dual-stack-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
  annotations:
    metallb.universe.tf/address-pool: dual-stack-pool
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  ports:
    - port: 443
      targetPort: 8443
      protocol: TCP
      name: https
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http
  selector:
    app: my-app
```

For IPv6-only services:

```yaml
# ipv6-only-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-v6
  namespace: production
  annotations:
    metallb.universe.tf/address-pool: production-pool-v6
spec:
  type: LoadBalancer
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  ports:
    - port: 443
      targetPort: 8443
      protocol: TCP
  selector:
    app: my-app
```

## Verifying the Configuration

### Check BGP Session Status

```bash
# View MetalLB speaker logs
kubectl logs -n metallb-system -l component=speaker --tail=100

# Check BGP peer status (via speaker logs)
kubectl logs -n metallb-system -l component=speaker | grep -i "bgp\|session\|established"
```

### Verify IP Allocation

```bash
# List services with their external IPs
kubectl get svc -A -o wide | grep LoadBalancer

# Describe a specific service
kubectl describe svc my-app -n production
```

### Test Connectivity

```bash
# From outside the cluster, test IPv6 connectivity
ping6 2001:db8:1000::1

# Test TCP connectivity
nc -6 -zv 2001:db8:1000::1 443

# Verify from multiple paths (if using ECMP)
traceroute6 2001:db8:1000::1
```

### Check Route Advertisement

On your router, verify routes are being received:

```bash
# FRRouting
vtysh -c "show bgp ipv6 unicast"
vtysh -c "show bgp ipv6 unicast neighbors"
vtysh -c "show bfd peers"

# Cisco
show bgp ipv6 unicast
show bgp ipv6 unicast summary
show bfd neighbors
```

## Troubleshooting Common Issues

### BGP Session Not Establishing

**Symptoms:** MetalLB speaker logs show connection refused or timeout errors.

**Checklist:**

1. Verify network connectivity between nodes and router:
   ```bash
   kubectl exec -n metallb-system -it $(kubectl get pods -n metallb-system -l component=speaker -o jsonpath='{.items[0].metadata.name}') -- ping6 -c 3 2001:db8:100::1
   ```

2. Check firewall rules allow TCP port 179 (BGP):
   ```bash
   # On nodes
   ss -tlnp | grep 179

   # Check iptables/nftables
   iptables -L -n | grep 179
   ip6tables -L -n | grep 179
   ```

3. Verify ASN configuration matches on both sides

4. Check password matches exactly (case-sensitive)

### Routes Not Being Advertised

**Symptoms:** BGP session is established but routes are not appearing on the router.

**Checklist:**

1. Verify IPAddressPool is correctly configured:
   ```bash
   kubectl get ipaddresspools -n metallb-system -o yaml
   ```

2. Check BGPAdvertisement references the correct pool:
   ```bash
   kubectl get bgpadvertisements -n metallb-system -o yaml
   ```

3. Ensure services are allocated IPs from the pool:
   ```bash
   kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.name}{"\t"}{.status.loadBalancer.ingress[*].ip}{"\n"}{end}'
   ```

4. Check router-side prefix filters are not blocking the advertisements

### ECMP Not Working

**Symptoms:** Traffic goes to a single node despite multiple BGP speakers.

**Checklist:**

1. Verify multiple speakers are peering:
   ```bash
   kubectl get pods -n metallb-system -l component=speaker -o wide
   ```

2. On the router, check all paths are installed:
   ```bash
   # FRRouting
   vtysh -c "show ipv6 route 2001:db8:1000::/120"

   # Should show multiple next-hops
   ```

3. Ensure router is configured for ECMP (maximum-paths setting)

4. Some routers require explicit load-balancing configuration

### BFD Not Detecting Failures

**Symptoms:** Failover takes longer than expected (seconds instead of milliseconds).

**Checklist:**

1. Verify BFD profile is correctly referenced in BGPPeer:
   ```bash
   kubectl get bgppeers -n metallb-system -o yaml | grep bfdProfile
   ```

2. Check BFD is enabled on the router side

3. Verify UDP ports 3784 and 3785 are allowed through firewalls

4. BFD requires kernel support - check speaker pod logs for BFD errors

## Production Best Practices

### Security Hardening

1. **Always use MD5 authentication** for BGP sessions:
   ```yaml
   spec:
     password: "strong-random-password-here"
   ```

2. **Implement prefix filtering** on routers to only accept expected prefixes

3. **Use private ASNs** (64512-65534) for internal networks

4. **Enable BGP TTL Security Hack (GTSM)** where supported:
   ```yaml
   spec:
     ebgpMultiHop: true  # Set to actual hop count
   ```

### High Availability

1. **Deploy speakers on multiple nodes** across failure domains:
   ```bash
   kubectl label node worker-1 topology.kubernetes.io/zone=zone-a
   kubectl label node worker-2 topology.kubernetes.io/zone=zone-b
   kubectl label node worker-3 topology.kubernetes.io/zone=zone-c
   ```

2. **Peer with multiple routers** for redundancy

3. **Use BFD** for sub-second failure detection

4. **Configure appropriate hold times**:
   - Production: 90s hold, 30s keepalive
   - With BFD: Can use longer hold times as BFD handles fast detection

### Monitoring and Alerting

Integrate MetalLB with your observability stack:

```yaml
# prometheus-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metallb
  namespace: metallb-system
spec:
  selector:
    matchLabels:
      app: metallb
  endpoints:
    - port: monitoring
      interval: 30s
```

Key metrics to monitor:

- `metallb_bgp_session_up` - BGP session state
- `metallb_bgp_announced_prefixes_total` - Number of advertised prefixes
- `metallb_bgp_updates_total` - BGP update messages
- `metallb_allocator_addresses_in_use_total` - IP addresses in use

Set up alerts in OneUptime for:

- BGP session down for more than 60 seconds
- No prefixes being advertised
- IP address pool exhaustion (> 80% utilized)
- BFD session flapping

### Capacity Planning

1. **Size your IP pools appropriately:**
   - /120 = 256 addresses (typical for small-medium clusters)
   - /112 = 65,536 addresses (large clusters)
   - /64 = 18 quintillion addresses (if you really need it)

2. **Plan for growth** - changing IP pools in production is disruptive

3. **Document your allocation** in your IPAM system

## Complete Production Configuration

Here is a complete, production-ready MetalLB configuration for dual-stack BGP:

```yaml
# metallb-production-config.yaml
---
# BFD Profile for fast failover
apiVersion: metallb.io/v1beta1
kind: BFDProfile
metadata:
  name: production-bfd
  namespace: metallb-system
spec:
  receiveInterval: 300
  transmitInterval: 300
  detectMultiplier: 3
  echoMode: false
  passiveMode: false
  minimumTtl: 254
---
# BGP Communities
apiVersion: metallb.io/v1beta1
kind: Community
metadata:
  name: production-communities
  namespace: metallb-system
spec:
  communities:
    - name: no-export
      value: 65535:65281
    - name: production
      value: 64512:100
    - name: staging
      value: 64512:200
---
# IPv4 Address Pool
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-v4
  namespace: metallb-system
spec:
  addresses:
    - 203.0.113.0/28
  autoAssign: true
---
# IPv6 Address Pool
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-v6
  namespace: metallb-system
spec:
  addresses:
    - 2001:db8:1000::/120
  autoAssign: true
---
# Primary Router - IPv4
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-primary-v4
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 10.0.0.1
  password: "primary-router-secret"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
  nodeSelectors:
    - matchLabels:
        node-role.kubernetes.io/bgp-speaker: "true"
---
# Primary Router - IPv6
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-primary-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 2001:db8:100::1
  password: "primary-router-secret-v6"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
  nodeSelectors:
    - matchLabels:
        node-role.kubernetes.io/bgp-speaker: "true"
---
# Secondary Router - IPv4
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-secondary-v4
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64514
  peerAddress: 10.0.0.2
  password: "secondary-router-secret"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
  nodeSelectors:
    - matchLabels:
        node-role.kubernetes.io/bgp-speaker: "true"
---
# Secondary Router - IPv6
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-secondary-v6
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64514
  peerAddress: 2001:db8:100::2
  password: "secondary-router-secret-v6"
  bfdProfile: production-bfd
  holdTime: 90s
  keepaliveTime: 30s
  nodeSelectors:
    - matchLabels:
        node-role.kubernetes.io/bgp-speaker: "true"
---
# IPv4 Advertisement
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: production-v4-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-v4
  aggregationLength: 28
  localPref: 100
  communities:
    - no-export
    - production
---
# IPv6 Advertisement
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: production-v6-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-v6
  aggregationLengthV6: 120
  localPref: 100
  communities:
    - no-export
    - production
```

Apply the complete configuration:

```bash
kubectl apply -f metallb-production-config.yaml
```

## Summary

Configuring MetalLB with BGP for IPv6 requires careful coordination between your Kubernetes cluster and upstream network infrastructure. Here is a quick reference for the key concepts:

| Component | Purpose | Key Configuration |
| --- | --- | --- |
| **IPAddressPool** | Defines available IPs for LoadBalancer services | IPv6 prefix (e.g., 2001:db8:1000::/120) |
| **BGPPeer** | Establishes BGP session with router | ASN, peer address, authentication, BFD profile |
| **BGPAdvertisement** | Controls how routes are announced | Pool selection, aggregation, communities, local preference |
| **BFDProfile** | Enables fast failure detection | Intervals (recommend 300ms), multiplier (3) |
| **Community** | Tags routes for policy decisions | Standard and extended communities |

**Key takeaways:**

1. **Start with dual-stack** - IPv6-only is possible but dual-stack provides flexibility
2. **Always use BFD** - Sub-second failover is worth the minimal overhead
3. **Authenticate BGP sessions** - MD5 passwords protect against route injection
4. **Filter prefixes on routers** - Only accept the ranges you allocate
5. **Monitor BGP sessions** - Integrate with OneUptime for alerting on session failures
6. **Plan your IP allocation** - Changing pools in production is disruptive
7. **Test failover regularly** - Kill nodes and verify traffic shifts correctly

With this configuration, your Kubernetes services can be reached over IPv6 with enterprise-grade reliability. The combination of BGP route advertisement, ECMP load distribution, and BFD-enabled fast failover gives you the networking foundation that production workloads demand.

For ongoing visibility into your MetalLB deployment and overall cluster health, consider setting up comprehensive monitoring with OneUptime. Track BGP session stability, IP pool utilization, and service availability from a single dashboard, and get alerted before your users notice any issues.
