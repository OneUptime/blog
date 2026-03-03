# How to Understand VIP Failover Behavior in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Failover, High Availability, Kubernetes, Networking

Description: Deep dive into how Virtual IP failover works in Talos Linux including election mechanisms, timing, and what happens during control plane node failures.

---

Virtual IP (VIP) failover in Talos Linux is the mechanism that keeps your Kubernetes API server accessible when a control plane node goes down. Instead of relying on an external load balancer, Talos Linux can manage a floating IP address that automatically moves between your control plane nodes. Understanding how this failover works - the timing, the election process, and the edge cases - is important for building reliable clusters.

This guide explains the internals of VIP failover in Talos Linux and what you should expect during different failure scenarios.

## What is VIP in Talos Linux?

A Virtual IP (VIP) in Talos Linux is a shared IP address that is assigned to one control plane node at a time. This node becomes the "owner" of the VIP and responds to traffic sent to that address. If the owner node fails, another control plane node takes over the VIP.

The primary use case for VIP in Talos Linux is providing a stable endpoint for the Kubernetes API server. Instead of pointing your kubeconfig at a specific control plane node's IP (which would fail if that node goes down), you point it at the VIP, which always routes to a healthy control plane node.

## How VIP is Configured

VIP is configured in the machine config of your control plane nodes:

```yaml
# Control plane machine config with VIP
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vip:
          ip: 192.168.1.100    # The shared virtual IP
```

All control plane nodes should have the same VIP configuration but different primary addresses:

```yaml
# Node 1: 192.168.1.10, VIP: 192.168.1.100
# Node 2: 192.168.1.11, VIP: 192.168.1.100
# Node 3: 192.168.1.12, VIP: 192.168.1.100
```

## The Election Mechanism

Talos Linux uses etcd to coordinate VIP ownership. Here is how the election works:

1. All control plane nodes participate in a leader election via etcd
2. One node wins the election and becomes the VIP owner
3. The winning node adds the VIP address to its network interface
4. The winning node sends a gratuitous ARP announcement to inform the network
5. Other nodes monitor the election and stand ready to take over

The election is based on an etcd lease mechanism. The current VIP owner holds a lease in etcd, and as long as it keeps renewing the lease, it keeps the VIP.

```bash
# Check which node currently owns the VIP
talosctl -n 192.168.1.10 get addresses | grep 192.168.1.100
talosctl -n 192.168.1.11 get addresses | grep 192.168.1.100
talosctl -n 192.168.1.12 get addresses | grep 192.168.1.100

# The VIP will show up on only one node
```

## What Happens During a Node Failure

When the node currently holding the VIP fails, the following sequence occurs:

### Step 1: etcd Lease Expires

The failed node can no longer renew its etcd lease. The lease has a TTL (time-to-live), and once it expires, other nodes know the VIP is available.

The default lease TTL determines how long it takes before failover begins. This is typically a few seconds.

### Step 2: New Leader Election

Once the lease expires, the remaining control plane nodes compete for the VIP. The first node to successfully acquire the etcd lease becomes the new VIP owner.

### Step 3: VIP Assignment

The new owner adds the VIP address to its network interface:

```bash
# After failover, the VIP moves to a new node
# Before: VIP on node 192.168.1.10
# After:  VIP on node 192.168.1.11

talosctl -n 192.168.1.11 get addresses | grep 192.168.1.100
# Shows the VIP is now on node 11
```

### Step 4: Gratuitous ARP

The new owner sends a gratuitous ARP announcement to update the ARP caches of all devices on the network. This tells switches and routers that the VIP's MAC address has changed to the new owner's MAC address.

```bash
# Capture gratuitous ARP during failover
talosctl -n <observer-node> pcap --interface eth0 --bpf-filter "arp" --duration 60s -o failover-arp.pcap
```

### Step 5: Traffic Redirects

After the gratuitous ARP is processed by network devices, new connections to the VIP are routed to the new owner. Existing TCP connections to the old node will time out and need to be re-established.

## Failover Timing

The total failover time depends on several factors:

| Phase | Typical Duration |
|-------|-----------------|
| etcd lease expiry | 2-10 seconds |
| New leader election | < 1 second |
| VIP assignment | < 1 second |
| Gratuitous ARP propagation | < 1 second |
| **Total failover time** | **3-12 seconds** |

During this window, API server requests to the VIP will fail. Kubernetes clients (including kubelet) have built-in retry logic that handles this gracefully for most operations.

## Testing VIP Failover

You should regularly test failover to make sure it works. Here are some methods:

### Method 1: Controlled Node Shutdown

```bash
# Find which node has the VIP
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo -n "$node: "
  talosctl -n $node get addresses 2>/dev/null | grep "192.168.1.100" || echo "no VIP"
done

# Shut down the node that has the VIP
talosctl -n <vip-owner-ip> shutdown

# Watch the VIP move to another node
watch -n 1 "for node in 192.168.1.10 192.168.1.11 192.168.1.12; do echo -n \"\$node: \"; talosctl -n \$node get addresses 2>/dev/null | grep '192.168.1.100' || echo 'no VIP'; done"
```

### Method 2: Monitor During Failover

```bash
# Continuously ping the VIP to measure downtime
ping -i 0.5 192.168.1.100

# In another terminal, trigger the failover
talosctl -n <vip-owner-ip> reboot
```

Count the missed pings to determine the actual failover duration.

### Method 3: API Server Connectivity Test

```bash
# Continuously check API server connectivity through the VIP
while true; do
  echo -n "$(date '+%H:%M:%S') "
  kubectl --request-timeout=2s get nodes > /dev/null 2>&1 && echo "OK" || echo "FAIL"
  sleep 1
done
```

## Edge Cases and Failure Scenarios

### All Control Plane Nodes Down

If all control plane nodes go down, the VIP has nowhere to go. When nodes come back up, the VIP will be assigned to whichever node successfully bootstraps etcd first.

### Network Partition (Split Brain)

If a network partition separates control plane nodes, the etcd quorum determines which side gets the VIP. The side with the etcd majority keeps the VIP. The minority side loses the VIP because it cannot maintain the etcd lease without quorum.

```bash
# Check etcd health to diagnose partition issues
talosctl -n <node-ip> get etcdmembers
talosctl -n <node-ip> service etcd
```

### etcd Unhealthy but Node is Running

If etcd is unhealthy on the VIP owner but the node is otherwise running, the VIP may not fail over properly because the lease mechanism depends on etcd. This is a less common scenario but worth being aware of.

```bash
# Check etcd health
talosctl -n <node-ip> service etcd
talosctl -n <node-ip> logs etcd --tail=20
```

### VIP Owner Comes Back

When a previously failed node comes back online, it does not automatically reclaim the VIP. The VIP stays on its current owner. This is by design - unnecessary VIP movement would cause disruption.

## Monitoring VIP Status

Set up monitoring to track VIP health:

```bash
# Simple VIP health check script
#!/bin/bash
VIP="192.168.1.100"
while true; do
  if curl -sk --connect-timeout 2 "https://${VIP}:6443/healthz" | grep -q "ok"; then
    echo "$(date) VIP healthy on ${VIP}"
  else
    echo "$(date) WARNING: VIP not responding on ${VIP}"
  fi
  sleep 5
done
```

## Best Practices for VIP Failover

1. **Always use three or more control plane nodes**: With only two nodes, losing one means losing etcd quorum, and the VIP cannot fail over.

2. **Keep control plane nodes on the same Layer 2 segment**: The VIP relies on gratuitous ARP, which only works within a single broadcast domain.

3. **Test failover regularly**: Do not wait for a production incident to discover that failover is broken.

4. **Monitor VIP health**: Set up alerting on VIP reachability so you know immediately when there is a problem.

5. **Use the VIP in your kubeconfig**: Make sure your kubeconfig points to the VIP, not to a specific node IP.

```bash
# Verify your kubeconfig uses the VIP
kubectl config view | grep server
# Should show https://192.168.1.100:6443
```

6. **Do not rely on VIP alone for production**: For critical production environments, consider using VIP in combination with an external load balancer or DNS-based failover for an additional layer of redundancy.

## Conclusion

VIP failover in Talos Linux provides a simple and effective way to maintain Kubernetes API server availability without external load balancers. The etcd-based election mechanism is straightforward and reliable for environments where all control plane nodes share a Layer 2 network. Failover typically completes in under 12 seconds, which is fast enough for Kubernetes clients to handle transparently. The most important thing you can do is test failover in your specific environment, understand the timing, and set up monitoring so you know when failover events occur.
