# How to Configure MetalLB BGP Mode with Multiple Upstream Routers for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MetalLB, BGP, Kubernetes, Networking, LoadBalancer

Description: Configure MetalLB in BGP mode with multiple upstream routers for high availability load balancing in bare metal Kubernetes clusters with redundancy and failover capabilities.

---

Running Kubernetes on bare metal requires a load balancer solution that works without cloud provider integration. MetalLB provides LoadBalancer services for bare metal clusters, and BGP mode enables dynamic routing with multiple upstream routers for high availability and redundancy.

This guide shows you how to configure MetalLB with multiple BGP peers, implement failover strategies, tune BGP parameters for optimal performance, and troubleshoot common routing issues.

## Understanding MetalLB BGP Architecture

MetalLB in BGP mode advertises service IP addresses to upstream routers using the Border Gateway Protocol. When configured with multiple routers, MetalLB establishes BGP sessions with each peer, enabling redundancy and load distribution.

Key concepts:
- **BGP Peer**: Upstream router that MetalLB connects to
- **ASN**: Autonomous System Number identifying your network
- **Advertisement**: Route announcements for service IPs
- **ECMP**: Equal Cost Multi-Path routing for load distribution

## Installing MetalLB

Install MetalLB using manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```

Or with Helm:

```bash
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb --namespace metallb-system --create-namespace
```

Verify installation:

```bash
kubectl get pods -n metallb-system
kubectl get crd | grep metallb
```

## Configuring IP Address Pools

Define IP address pools for LoadBalancer services:

```yaml
# ipaddresspool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.240-192.168.1.250
  autoAssign: true
  avoidBuggyIPs: true

---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: development-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.2.240-192.168.2.250
  autoAssign: false
```

Apply the configuration:

```bash
kubectl apply -f ipaddresspool.yaml
```

## Setting Up Multiple BGP Peers

Configure BGP peers for redundancy:

```yaml
# bgp-peers.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.1
  holdTime: 90s
  keepaliveTime: 30s
  sourceAddress: 192.168.1.10

---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-2
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.2
  holdTime: 90s
  keepaliveTime: 30s
  sourceAddress: 192.168.1.10

---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-3
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.3
  holdTime: 90s
  keepaliveTime: 30s
  sourceAddress: 192.168.1.10
  password: "bgp-shared-secret"
```

Apply BGP configuration:

```bash
kubectl apply -f bgp-peers.yaml
```

## Configuring BGP Advertisements

Control how services are advertised:

```yaml
# bgp-advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: production-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
  aggregationLength: 32
  localPref: 100
  communities:
  - 64500:100

---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: development-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - development-pool
  aggregationLength: 24
  localPref: 50
  communities:
  - 64500:50
  peers:
  - router-1
  - router-2
```

## Implementing Node-Specific Peering

Configure different BGP peers per node:

```yaml
# node-specific-peers.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: node-1-router
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.1
  nodeSelectors:
  - matchLabels:
      kubernetes.io/hostname: node-1

---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: node-2-router
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.2
  nodeSelectors:
  - matchLabels:
      kubernetes.io/hostname: node-2

---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: node-3-router
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.3
  nodeSelectors:
  - matchLabels:
      kubernetes.io/hostname: node-3
```

## Configuring ECMP Load Balancing

Enable Equal Cost Multi-Path routing:

```yaml
# ecmp-config.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: ecmp-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
  aggregationLength: 32
  localPref: 100

  # Advertise to all peers with same preference
  # This enables ECMP on upstream routers
```

On your routers, enable ECMP:

```bash
# Cisco IOS
router bgp 64501
  address-family ipv4
    maximum-paths 4
    maximum-paths ibgp 4

# FRRouting
router bgp 64501
  address-family ipv4 unicast
    maximum-paths 4
```

## Implementing Graceful Shutdown

Configure graceful BGP session shutdown:

```yaml
# graceful-shutdown.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.1

  # BGP Graceful Restart
  bfdProfile: default
  gracefulRestart:
    enabled: true
    restartTime: 120s
```

## Setting Up BFD for Fast Failover

Configure Bidirectional Forwarding Detection:

```yaml
# bfd-profile.yaml
apiVersion: metallb.io/v1beta1
kind: BFDProfile
metadata:
  name: fast-failover
  namespace: metallb-system
spec:
  receiveInterval: 300
  transmitInterval: 300
  detectMultiplier: 3
  echoMode: false
  minimumTtl: 254

---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1-bfd
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 192.168.1.1
  bfdProfile: fast-failover
```

## Monitoring BGP Sessions

Check BGP session status:

```bash
# View MetalLB controller logs
kubectl logs -n metallb-system -l component=controller

# Check BGP peer status
kubectl get bgppeers -n metallb-system

# View BGP advertisements
kubectl get bgpadvertisements -n metallb-system

# Check service IP assignments
kubectl get svc -A -o wide | grep LoadBalancer
```

Create a monitoring script:

```bash
#!/bin/bash
# monitor-metallb-bgp.sh

echo "MetalLB BGP Status"
echo "=================="

# Check BGP peers
echo "BGP Peers:"
kubectl get bgppeers -n metallb-system -o custom-columns=NAME:.metadata.name,ASN:.spec.myASN,PEER:.spec.peerAddress

echo ""
echo "Active LoadBalancer Services:"
kubectl get svc -A --field-selector spec.type=LoadBalancer -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,EXTERNAL-IP:.status.loadBalancer.ingress[0].ip

echo ""
echo "IP Address Pool Usage:"
kubectl get ipaddresspools -n metallb-system -o yaml | grep -A 2 "addresses:"

# Check for BGP session issues
echo ""
echo "Recent BGP Events:"
kubectl get events -n metallb-system --sort-by='.lastTimestamp' | grep -i bgp | tail -10
```

## Troubleshooting BGP Issues

Common problems and solutions:

```bash
# BGP session not establishing
kubectl logs -n metallb-system -l component=controller | grep -i "bgp"

# Check if router is reachable
kubectl exec -n metallb-system deploy/controller -- ping -c 3 192.168.1.1

# Verify BGP configuration
kubectl describe bgppeer -n metallb-system router-1

# Check for route advertisements
kubectl exec -n metallb-system deploy/controller -- vtysh -c "show ip bgp"

# Verify service announcements
kubectl logs -n metallb-system -l component=speaker | grep "announcing"
```

## Implementing Route Filtering

Filter which services are advertised to specific peers:

```yaml
# route-filtering.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: filtered-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
  peers:
  - router-1
  - router-2
  communities:
  - 64500:100
  localPref: 150

  # Only advertise specific services
  serviceSelectors:
  - matchLabels:
      metallb-advertise: "true"
```

Apply label to services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: critical-service
  labels:
    metallb-advertise: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.240
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: critical-app
```

## Advanced BGP Configuration

Implement AS path prepending:

```yaml
# as-path-prepending.yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: prepend-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
  - production-pool
  peers:
  - router-3
  localPref: 50

  # Make this path less preferred
  asPrepend:
    count: 2
    asn: 64500
```

Configure route maps on routers:

```bash
# Cisco IOS
route-map METALLB-IN permit 10
  match community 64500:100
  set local-preference 150

router bgp 64501
  neighbor 192.168.1.10 remote-as 64500
  neighbor 192.168.1.10 route-map METALLB-IN in
```

## Load Balancing Strategies

Configure different load balancing modes:

```yaml
# Service with specific node assignment
apiVersion: v1
kind: Service
metadata:
  name: pinned-service
  annotations:
    metallb.universe.tf/address-pool: production-pool
    metallb.universe.tf/loadBalancerIPs: 192.168.1.241
    metallb.universe.tf/allow-shared-ip: "shared-key"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
  selector:
    app: myapp
```

## High Availability Testing

Test failover scenarios:

```bash
#!/bin/bash
# test-bgp-failover.sh

SERVICE_IP="192.168.1.240"
TEST_INTERVAL=1

echo "Starting BGP failover test for $SERVICE_IP"

# Monitor connectivity
while true; do
    if curl -s --max-time 2 http://$SERVICE_IP > /dev/null; then
        echo "$(date): Service reachable"
    else
        echo "$(date): Service UNREACHABLE"
    fi
    sleep $TEST_INTERVAL
done &
MONITOR_PID=$!

# Simulate router failure
echo "Simulating router-1 failure..."
kubectl patch bgppeer router-1 -n metallb-system --type=json -p='[{"op": "replace", "path": "/spec/peerAddress", "value": "192.168.1.99"}]'

sleep 30

# Restore router
echo "Restoring router-1..."
kubectl patch bgppeer router-1 -n metallb-system --type=json -p='[{"op": "replace", "path": "/spec/peerAddress", "value": "192.168.1.1"}]'

sleep 30
kill $MONITOR_PID

echo "Failover test complete"
```

MetalLB with multiple BGP peers provides production-grade load balancing for bare metal Kubernetes clusters. Configure redundant peering, tune BGP parameters for your network topology, and implement proper monitoring for reliable service availability.
