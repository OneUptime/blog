# How to Implement Calico with BGP for Pod Network Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Calico, BGP, Networking, Routing

Description: Learn how to configure Calico with Border Gateway Protocol for scalable pod network routing, enabling efficient cross-node communication and integration with physical network infrastructure.

---

Calico's BGP-based networking mode provides a pure Layer 3 approach to pod networking without requiring overlays. Instead of encapsulating packets in VXLAN or other tunnels, Calico programs routes directly on nodes and peers with network routers using BGP. This approach delivers better performance, simpler troubleshooting, and easier integration with existing network infrastructure.

BGP (Border Gateway Protocol) is the routing protocol that powers the internet, and Calico leverages it to distribute pod routes across your Kubernetes cluster. Each node runs a BIRD BGP daemon that advertises pod CIDRs to other nodes and optionally to upstream routers. This creates a routed fabric where packets flow directly between nodes without overlay encapsulation overhead.

## Installing Calico with BGP Mode

Install Calico using the manifest:

```bash
# Download Calico manifest
curl https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml -O

# Edit the manifest to configure BGP
# Set CALICO_IPV4POOL_IPIP to "Never" for pure BGP
# Set CALICO_IPV4POOL_VXLAN to "Never"

kubectl apply -f calico.yaml

# Verify Calico is running
kubectl get pods -n kube-system -l k8s-app=calico-node

# Check Calico version
kubectl exec -n kube-system calico-node-xxxxx -- calico-node --version
```

## Understanding Calico BGP Architecture

Calico's BGP setup includes:

- **calico-node**: Runs on each node, contains BIRD BGP daemon
- **felix**: Programs kernel routing tables and iptables rules
- **confd**: Watches etcd/Kubernetes and generates BIRD configuration
- **BGP peers**: Connections between nodes or to external routers

View BGP status:

```bash
# Check BGP peering status
kubectl exec -n kube-system calico-node-xxxxx -- calicoctl node status

# Output shows:
# IPv4 BGP status
# +--------------+-------------------+-------+----------+-------------+
# | PEER ADDRESS |     PEER TYPE     | STATE |  SINCE   |    INFO     |
# +--------------+-------------------+-------+----------+-------------+
# | 10.0.1.11    | node-to-node mesh | up    | 12:34:56 | Established |
# | 10.0.1.12    | node-to-node mesh | up    | 12:34:57 | Established |
# +--------------+-------------------+-------+----------+-------------+
```

## Configuring Node-to-Node Mesh

By default, Calico creates a full mesh where every node peers with every other node. This works well for clusters up to about 100 nodes:

```yaml
# Check default BGP configuration
kubectl get bgpconfiguration default -o yaml

apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Full mesh between all nodes
  nodeToNodeMeshEnabled: true
  # AS number for the cluster
  asNumber: 64512
  # Log level for BIRD
  logSeverityScreen: Info
  # Service cluster IPs to advertise
  serviceClusterIPs:
  - cidr: 10.96.0.0/12
  # Service external IPs to advertise
  serviceExternalIPs:
  - cidr: 10.97.0.0/16
```

View generated BIRD configuration:

```bash
# SSH to node and check BIRD config
kubectl exec -n kube-system calico-node-xxxxx -- cat /etc/calico/confd/config/bird.cfg

# Shows BGP configuration including peers and routes
```

## Configuring Route Reflectors

For larger clusters (100+ nodes), use BGP route reflectors to reduce the number of peering sessions:

```yaml
# Disable full mesh
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: false
  asNumber: 64512
---
# Label nodes as route reflectors
# kubectl label node node1 route-reflector=true
# kubectl label node node2 route-reflector=true

# Configure route reflector nodes
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: node1
spec:
  bgp:
    ipv4Address: 10.0.1.10/24
    routeReflectorClusterID: 224.0.0.1
---
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: node2
spec:
  bgp:
    ipv4Address: 10.0.1.11/24
    routeReflectorClusterID: 224.0.0.1
---
# Configure other nodes to peer with route reflectors
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-rr1
spec:
  peerIP: 10.0.1.10
  asNumber: 64512
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-rr2
spec:
  peerIP: 10.0.1.11
  asNumber: 64512
```

This creates a hub-and-spoke topology where client nodes peer only with route reflectors, and route reflectors peer with each other.

## Peering with External Routers

Integrate Calico with your data center network:

```yaml
# Peer all nodes with ToR (Top of Rack) switch
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch-1
spec:
  peerIP: 10.0.1.1
  asNumber: 65001
---
# Peer specific nodes with external router
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: external-router
spec:
  peerIP: 192.168.1.1
  asNumber: 65100
  nodeSelector: role == 'border'
---
# Configure node-specific peering
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: border-node1
  labels:
    role: border
spec:
  bgp:
    ipv4Address: 10.0.1.20/24
    asNumber: 64512
```

Configure your external router (example for Cisco IOS):

```cisco
router bgp 65001
 neighbor 10.0.1.10 remote-as 64512
 neighbor 10.0.1.11 remote-as 64512
 neighbor 10.0.1.12 remote-as 64512
 !
 address-family ipv4
  network 0.0.0.0 0.0.0.0
  neighbor 10.0.1.10 activate
  neighbor 10.0.1.11 activate
  neighbor 10.0.1.12 activate
  neighbor 10.0.1.10 route-map ALLOW-POD-ROUTES in
  neighbor 10.0.1.11 route-map ALLOW-POD-ROUTES in
  neighbor 10.0.1.12 route-map ALLOW-POD-ROUTES in
 exit-address-family
!
ip prefix-list POD-CIDRS permit 10.244.0.0/16 le 32
!
route-map ALLOW-POD-ROUTES permit 10
 match ip address prefix-list POD-CIDRS
```

## Configuring BGP Filters

Control which routes are advertised and accepted:

```yaml
# Export pod routes but filter specific CIDRs
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: export-pod-routes
spec:
  exportV4:
  - action: Accept
    matchOperator: In
    cidr: 10.244.0.0/16
  - action: Reject
    cidr: 0.0.0.0/0
---
# Import only specific routes from external peers
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: import-external
spec:
  importV4:
  - action: Accept
    matchOperator: In
    cidr: 192.168.0.0/16
  - action: Reject
    cidr: 0.0.0.0/0
---
# Apply filters to BGP peer
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: external-router-filtered
spec:
  peerIP: 192.168.1.1
  asNumber: 65100
  filters:
  - export-pod-routes
  - import-external
```

## Monitoring BGP Sessions

Check BGP status and routes:

```bash
# View BGP summary
kubectl exec -n kube-system calico-node-xxxxx -- calicoctl node status

# Show detailed BGP information
kubectl exec -n kube-system calico-node-xxxxx -- birdcl show protocols all

# View BGP routes
kubectl exec -n kube-system calico-node-xxxxx -- birdcl show route

# Check specific route
kubectl exec -n kube-system calico-node-xxxxx -- birdcl show route for 10.244.1.5

# View Linux routing table
kubectl exec -n kube-system calico-node-xxxxx -- ip route show

# Check BGP neighbor details
kubectl exec -n kube-system calico-node-xxxxx -- birdcl show protocols all node_10_0_1_11
```

## Troubleshooting BGP Issues

### Problem: BGP session not establishing

```bash
# Check BIRD is running
kubectl exec -n kube-system calico-node-xxxxx -- ps aux | grep bird

# View BIRD logs
kubectl logs -n kube-system calico-node-xxxxx -c calico-node | grep -i bgp

# Check connectivity to peer
kubectl exec -n kube-system calico-node-xxxxx -- ping -c 3 <peer-ip>

# Verify AS numbers match configuration
kubectl get bgpconfiguration default -o yaml
kubectl get bgppeer -A -o yaml

# Check for firewall rules blocking BGP (TCP 179)
kubectl exec -n kube-system calico-node-xxxxx -- netstat -an | grep 179
```

### Problem: Routes not propagating

```bash
# Verify routes are in BIRD
kubectl exec -n kube-system calico-node-xxxxx -- birdcl show route

# Check if routes are in kernel table
kubectl exec -n kube-system calico-node-xxxxx -- ip route show | grep 10.244

# Verify BGP export filters
kubectl get bgpfilter -o yaml

# Check node status
kubectl exec -n kube-system calico-node-xxxxx -- calicoctl node status
```

## Advanced BGP Configuration

### AS Path Prepending

Influence route selection by prepending AS path:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: external-router-prepend
spec:
  peerIP: 192.168.1.1
  asNumber: 65100
  # Prepend local AS twice to make routes less preferred
  asPathPrepend: 2
```

### BGP Communities

Tag routes with BGP communities:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  communities:
  - name: no-export
    value: "65535:65281"
  - name: internal-only
    value: "64512:100"
```

### IP Pool BGP Configuration

Configure per-pool BGP behavior:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: pool-bgp
spec:
  cidr: 10.244.0.0/16
  ipipMode: Never
  vxlanMode: Never
  natOutgoing: true
  # Disable BGP advertisement for this pool
  disableBGPExport: false
  # Node selector for pool assignment
  nodeSelector: "!node-role.kubernetes.io/master"
```

## Performance Optimization

Tune BGP for better performance:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  # Tune BGP timers (in seconds)
  bgpTimers:
    keepaliveInterval: 10
    holdTime: 30
  # Listen on specific address
  listenPort: 179
  # Bind to specific interface
  bindMode: NodeIP
```

Calico with BGP provides a scalable, performant networking solution that integrates seamlessly with traditional network infrastructure. By understanding BGP configuration and troubleshooting techniques, you can build robust Kubernetes networking that spans data centers and cloud environments.
