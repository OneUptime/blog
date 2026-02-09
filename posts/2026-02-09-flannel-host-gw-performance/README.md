# How to Implement Flannel with host-gw Backend for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Networking, Performance, CNI

Description: Learn how to configure Flannel with the host-gw backend for high-performance pod networking by leveraging direct Layer 3 routing without overlay encapsulation overhead.

---

Flannel's host-gw (host gateway) backend provides a simpler, faster alternative to the default VXLAN overlay by using direct Layer 3 routing between nodes. Instead of encapsulating packets in VXLAN headers, host-gw programs routes on each node that send pod traffic directly to destination nodes via the underlying network. This eliminates encapsulation overhead, resulting in better throughput and lower latency at the cost of requiring Layer 2 connectivity between nodes.

The host-gw backend is ideal for on-premises clusters where all nodes are on the same network segment or in cloud environments using flat networking. It delivers near-native network performance while maintaining Flannel's simplicity and ease of deployment. The main limitation is that nodes must be able to route to each other directly at Layer 2, making it unsuitable for clusters spanning multiple subnets without additional BGP configuration.

## Installing Flannel with host-gw Backend

Install Flannel using the host-gw backend:

```bash
# Download Flannel manifest
curl -LO https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Edit the ConfigMap to use host-gw
kubectl get configmap kube-flannel-cfg -n kube-flannel -o yaml
```

Modify the net-conf.json section:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "host-gw"
      }
    }
```

Apply the configuration:

```bash
kubectl apply -f kube-flannel.yml

# Verify Flannel is running
kubectl get pods -n kube-flannel

# Check Flannel logs
kubectl logs -n kube-flannel ds/kube-flannel-ds
```

## Understanding host-gw Routing

Host-gw creates direct routes to pod CIDRs on other nodes:

```bash
# View routes on a node
ip route show

# Example output:
# 10.244.0.0/24 dev cni0 proto kernel scope link src 10.244.0.1
# 10.244.1.0/24 via 192.168.1.11 dev eth0
# 10.244.2.0/24 via 192.168.1.12 dev eth0
# 10.244.3.0/24 via 192.168.1.13 dev eth0

# Local pod CIDR (10.244.0.0/24) routes through cni0 bridge
# Remote pod CIDRs route through other nodes' IPs
```

Each node maintains routes to every other node's pod CIDR. Flannel watches the Kubernetes API for node changes and updates routes automatically.

## Comparing host-gw vs VXLAN

Performance comparison:

```bash
# Test with iperf3 between pods on different nodes

# VXLAN mode (default):
# Bitrate: ~8 Gbits/sec
# CPU usage: ~40% on sender, ~50% on receiver
# Latency: ~0.5ms

# host-gw mode:
# Bitrate: ~9.5 Gbits/sec (20% faster)
# CPU usage: ~25% on sender, ~30% on receiver (25% less)
# Latency: ~0.3ms (40% lower)

# host-gw eliminates VXLAN encapsulation overhead:
# - No UDP encapsulation/decapsulation
# - No VXLAN header processing
# - Direct routing at Layer 3
```

Packet size comparison:

```bash
# VXLAN adds 50 bytes overhead:
# - Outer IP header: 20 bytes
# - UDP header: 8 bytes
# - VXLAN header: 8 bytes
# - Outer Ethernet: 14 bytes

# host-gw has no encapsulation:
# - Original packet sent directly
# - MTU can be standard 1500 bytes
```

## Configuring host-gw for Specific Networks

Customize Flannel configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "SubnetLen": 24,
      "SubnetMin": "10.244.10.0",
      "SubnetMax": "10.244.99.0",
      "Backend": {
        "Type": "host-gw"
      }
    }
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true,
            "ipMasq": false
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
```

Key configuration options:

- `Network`: Overall pod CIDR range
- `SubnetLen`: Subnet size allocated per node
- `SubnetMin/Max`: Range of subnets to allocate
- `hairpinMode`: Allow pods to reach their own ClusterIP
- `isDefaultGateway`: Bridge acts as default gateway
- `ipMasq`: Enable IP masquerading for external traffic

## Network Requirements for host-gw

Host-gw requires Layer 2 connectivity between nodes:

```bash
# Verify nodes can reach each other directly
# From node1:
ping -c 3 192.168.1.11  # node2
ping -c 3 192.168.1.12  # node3

# Check ARP table shows direct MAC addresses
ip neigh show

# Example output showing Layer 2 reachability:
# 192.168.1.11 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE
# 192.168.1.12 dev eth0 lladdr 00:1a:2b:3c:4d:5f REACHABLE

# If nodes are on different subnets, host-gw won't work
# Use VXLAN or configure routing between subnets
```

## Monitoring Flannel host-gw

Check Flannel status:

```bash
# View Flannel subnet allocation
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Example output:
# node1    10.244.0.0/24
# node2    10.244.1.0/24
# node3    10.244.2.0/24

# Check routes on each node
for node in node1 node2 node3; do
  echo "=== Routes on $node ==="
  ssh $node "ip route show | grep 10.244"
done

# Verify Flannel is updating routes
kubectl logs -n kube-flannel ds/kube-flannel-ds --tail=50 | grep -i route
```

## Troubleshooting host-gw Issues

### Problem: Pods can't communicate across nodes

```bash
# Check if routes exist
ip route show | grep 10.244

# If routes missing, check Flannel pod
kubectl get pods -n kube-flannel
kubectl logs -n kube-flannel ds/kube-flannel-ds

# Verify node IPs in Kubernetes
kubectl get nodes -o wide

# Test direct node connectivity
ping -c 3 <other-node-ip>

# Check if reverse path filtering interferes
sysctl net.ipv4.conf.all.rp_filter
# Set to 0 or 2 for host-gw to work
sysctl -w net.ipv4.conf.all.rp_filter=2
```

### Problem: Routes not updating

```bash
# Check Flannel configuration
kubectl get configmap kube-flannel-cfg -n kube-flannel -o yaml

# Verify subnet.env file
cat /run/flannel/subnet.env

# Example:
# FLANNEL_NETWORK=10.244.0.0/16
# FLANNEL_SUBNET=10.244.0.1/24
# FLANNEL_MTU=1450
# FLANNEL_IPMASQ=true

# Restart Flannel if needed
kubectl delete pods -n kube-flannel -l app=flannel
```

### Problem: Packet loss or performance issues

```bash
# Check MTU settings
ip link show | grep mtu

# Verify MTU matches across all nodes
# Should be same as physical network (usually 1500)

# Test with different packet sizes
ping -c 5 -M do -s 1400 <destination-pod-ip>
ping -c 5 -M do -s 1450 <destination-pod-ip>

# Check for packet fragmentation
netstat -s | grep fragment

# Adjust MTU if needed
ip link set dev eth0 mtu 1500
ip link set dev cni0 mtu 1450
```

## Optimizing host-gw Performance

Tune kernel network parameters:

```bash
# Increase receive buffer
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.rmem_default=134217728

# Increase send buffer
sysctl -w net.core.wmem_max=134217728
sysctl -w net.core.wmem_default=134217728

# Enable TCP BBR congestion control
modprobe tcp_bbr
sysctl -w net.ipv4.tcp_congestion_control=bbr

# Increase connection tracking table
sysctl -w net.netfilter.nf_conntrack_max=1000000

# Enable TCP fast open
sysctl -w net.ipv4.tcp_fastopen=3

# Optimize routing cache
sysctl -w net.ipv4.route.max_size=1048576

# Make changes permanent
cat >> /etc/sysctl.conf <<EOF
net.core.rmem_max=134217728
net.core.rmem_default=134217728
net.core.wmem_max=134217728
net.core.wmem_default=134217728
net.ipv4.tcp_congestion_control=bbr
net.netfilter.nf_conntrack_max=1000000
net.ipv4.tcp_fastopen=3
net.ipv4.route.max_size=1048576
EOF
```

## Hybrid Backend Configuration

Use host-gw where possible, VXLAN elsewhere:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-flannel-cfg
  namespace: kube-flannel
data:
  net-conf.json: |
    {
      "Network": "10.244.0.0/16",
      "Backend": {
        "Type": "vxlan",
        "Directrouting": true
      }
    }
```

With `Directrouting: true`, Flannel uses:
- host-gw for nodes on same subnet (fast)
- VXLAN for nodes on different subnets (compatible)

## Performance Testing

Benchmark Flannel performance:

```bash
# Deploy iperf3 server pod
kubectl run iperf3-server --image=networkstatic/iperf3 -- iperf3 -s

# Get server pod IP
SERVER_IP=$(kubectl get pod iperf3-server -o jsonpath='{.status.podIP}')

# Run client test from different node
kubectl run -it --rm iperf3-client --image=networkstatic/iperf3 --overrides='
{
  "spec": {
    "nodeName": "node2"
  }
}' -- iperf3 -c $SERVER_IP -t 30

# Test with multiple streams
kubectl run -it --rm iperf3-client --image=networkstatic/iperf3 -- iperf3 -c $SERVER_IP -P 10 -t 30

# UDP test
kubectl run -it --rm iperf3-client --image=networkstatic/iperf3 -- iperf3 -c $SERVER_IP -u -b 1G -t 30
```

## Migrating from VXLAN to host-gw

Switch existing cluster to host-gw:

```bash
# Edit Flannel ConfigMap
kubectl edit configmap kube-flannel-cfg -n kube-flannel

# Change Backend.Type from "vxlan" to "host-gw"

# Restart Flannel daemonset
kubectl rollout restart daemonset/kube-flannel-ds -n kube-flannel

# Verify new backend
kubectl logs -n kube-flannel ds/kube-flannel-ds | grep -i "host-gw"

# Check routes updated
ip route show | grep 10.244

# Old VXLAN interfaces should disappear
ip link show | grep flannel
```

## Best Practices

1. **Verify Layer 2 connectivity**: Essential for host-gw to work
2. **Use matching MTU**: Set consistent MTU across all nodes
3. **Monitor route count**: Scales with node count
4. **Enable directrouting for hybrid**: Best of both worlds
5. **Tune kernel parameters**: Optimize for your workload
6. **Test performance**: Measure improvement over VXLAN
7. **Document topology**: Record network layout and connectivity

Flannel with host-gw backend delivers excellent performance for clusters with Layer 2 node connectivity. By eliminating overlay encapsulation, it provides near-native network speed while maintaining Flannel's simplicity and reliability.
