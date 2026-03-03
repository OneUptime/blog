# How to Troubleshoot KubeSpan Connectivity Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Troubleshooting, WireGuard, Networking

Description: A practical troubleshooting guide for diagnosing and fixing KubeSpan connectivity issues in Talos Linux clusters, from firewall problems to endpoint misconfigurations.

---

KubeSpan in Talos Linux usually works seamlessly once configured, but when it does not, troubleshooting can be tricky because you cannot SSH into the nodes. This guide covers the most common KubeSpan issues, how to diagnose them, and how to fix them using `talosctl` and other available tools.

## First Steps: Gather Information

Before diving into specific problems, collect the basic KubeSpan state from affected nodes:

```bash
# Check KubeSpan identity
talosctl get kubespanidentity --nodes <node-ip>

# Check peer status (this is your primary diagnostic tool)
talosctl get kubespanpeerstatus --nodes <node-ip>

# Check discovered members
talosctl get discoveredmembers --nodes <node-ip>

# Check KubeSpan endpoints
talosctl get kubespanendpoint --nodes <node-ip>

# Check the KubeSpan interface
talosctl get links --nodes <node-ip> | grep kubespan
talosctl get addresses --nodes <node-ip> | grep kubespan
```

These commands give you the overall picture. Most issues fall into one of a few categories.

## Issue 1: Peers Stuck in "Unknown" State

If peers show as `unknown`, it means the node knows about the peer but has not been able to establish a WireGuard handshake.

```bash
# Check the peer status for details
talosctl get kubespanpeerstatus --nodes <node-ip> -o yaml
```

Common causes:

**Firewall blocking UDP 51820**: This is the most common issue. WireGuard uses UDP port 51820 by default. Check that this port is open between all nodes.

```bash
# Test UDP connectivity from another machine (not from Talos directly)
nc -zu <target-node-ip> 51820

# Check if the node is listening
talosctl get links --nodes <node-ip> | grep kubespan
```

**Discovery service unreachable**: If nodes cannot reach the discovery service, they will not learn about each other's endpoints.

```bash
# Check discovery status
talosctl get discoveredmembers --nodes <node-ip>

# If this returns nothing, the discovery service might be unreachable
# Check network connectivity to the discovery endpoint
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery
```

**Wrong endpoints advertised**: If a node is advertising an endpoint that other nodes cannot reach (like a private IP when they need the public IP), connections will fail.

```bash
# Check what endpoints are being advertised
talosctl get kubespanendpoint --nodes <node-ip> -o yaml
```

Fix endpoint issues with endpoint filters:

```yaml
# Only advertise public IPs
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "!10.0.0.0/8"
          - "!172.16.0.0/12"
          - "!192.168.0.0/16"
          - "0.0.0.0/0"
```

## Issue 2: Peers Flapping Between "Up" and "Down"

If peers repeatedly transition between up and down, it usually indicates an unstable network connection.

```bash
# Watch peer status changes in real time
talosctl get kubespanpeerstatus --nodes <node-ip> --watch

# Check controller logs for connection issues
talosctl logs controller-runtime --nodes <node-ip> | grep -i "kubespan\|wireguard" | tail -50
```

Common causes:

**MTU issues**: If the MTU is too high for the network path, large packets get dropped while small packets (like the WireGuard handshake) succeed. This creates a pattern where the connection establishes but then fails under load.

```yaml
# Lower the MTU
machine:
  network:
    kubespan:
      enabled: true
      mtu: 1380  # Try progressively lower values
```

**Aggressive NAT timeouts**: If nodes are behind NAT, the NAT mapping might expire before WireGuard sends its keepalive. WireGuard has a default keepalive interval of 25 seconds, which should be sufficient for most NATs, but some aggressive firewalls have shorter timeouts.

**Network congestion**: If the link between nodes is saturated, WireGuard handshakes may time out. Check the throughput between nodes and consider dedicated bandwidth for the cluster.

## Issue 3: KubeSpan Interface Not Created

If the `kubespan` interface does not exist at all, KubeSpan is either not enabled or failed to initialize.

```bash
# Check if KubeSpan is enabled in the machine config
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A5 kubespan

# Check controller logs for initialization errors
talosctl logs controller-runtime --nodes <node-ip> | grep -i kubespan | head -20
```

If KubeSpan is enabled but the interface is missing, check for:

```bash
# Kernel module issues
talosctl dmesg --nodes <node-ip> | grep -i wireguard

# Resource issues
talosctl get systemstat --nodes <node-ip>
```

## Issue 4: Traffic Not Flowing Through KubeSpan

Sometimes KubeSpan peers are "up" but actual traffic does not flow. This usually means routing is not set up correctly.

```bash
# Check routes related to KubeSpan
talosctl get routes --nodes <node-ip> | grep kubespan

# Check if advertiseKubernetesNetworks is set correctly
talosctl get machineconfig --nodes <node-ip> -o yaml | grep advertiseKubernetes
```

If you need pod-to-pod traffic to flow through KubeSpan (typical for multi-site clusters), make sure `advertiseKubernetesNetworks` is `true`:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
```

## Issue 5: One-Way Connectivity

If node A can reach node B through KubeSpan but node B cannot reach node A, the issue is almost always asymmetric NAT or firewall rules.

```bash
# Check peer status from both sides
talosctl get kubespanpeerstatus --nodes <node-a-ip>
talosctl get kubespanpeerstatus --nodes <node-b-ip>

# Compare the endpoints each node sees for the other
talosctl get kubespanendpoint --nodes <node-a-ip> -o yaml
talosctl get kubespanendpoint --nodes <node-b-ip> -o yaml
```

Make sure both nodes can reach each other on UDP 51820. If one node is behind a strict NAT that does not allow incoming connections, you might need to set up port forwarding or use a cloud instance as a relay.

## Issue 6: Slow Performance Through KubeSpan

If connectivity works but performance is poor, check these areas:

```bash
# Check WireGuard interface statistics
talosctl get kubespanpeerstatus --nodes <node-ip> -o yaml

# Look at receive and transmit bytes to see if traffic is flowing
# Check for packet loss by comparing sent and received bytes between peers
```

Performance issues are usually caused by:

- MTU mismatches causing fragmentation
- CPU saturation from encryption (rare on modern hardware)
- Network latency between sites
- Bandwidth limitations

To test throughput through KubeSpan:

```bash
# Deploy iperf3 pods on nodes connected via KubeSpan
kubectl run iperf-server --image=networkstatic/iperf3 -- -s
kubectl run iperf-client --image=networkstatic/iperf3 \
  --overrides='{"spec":{"nodeName":"<different-node>"}}' \
  -- -c <iperf-server-pod-ip> -t 30

# Compare with direct connectivity (if available) to measure overhead
```

## Systematic Debugging Approach

When you are stuck, follow this systematic approach:

```bash
# Step 1: Is KubeSpan enabled?
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A10 kubespan

# Step 2: Does the KubeSpan interface exist?
talosctl get links --nodes <node-ip> | grep kubespan

# Step 3: Is the discovery service working?
talosctl get discoveredmembers --nodes <node-ip>

# Step 4: Are endpoints being advertised?
talosctl get kubespanendpoint --nodes <node-ip>

# Step 5: What is the peer state?
talosctl get kubespanpeerstatus --nodes <node-ip>

# Step 6: Are routes set up?
talosctl get routes --nodes <node-ip> | grep kubespan

# Step 7: Check controller logs for errors
talosctl logs controller-runtime --nodes <node-ip> | grep -i "error\|warn\|kubespan"
```

## Resetting KubeSpan

If you need to reset KubeSpan completely, you can disable and re-enable it:

```yaml
# First, disable KubeSpan
machine:
  network:
    kubespan:
      enabled: false
```

Apply the change, wait for the node to apply the config, then re-enable:

```yaml
# Re-enable KubeSpan
machine:
  network:
    kubespan:
      enabled: true
```

```bash
# Apply the changes
talosctl patch machineconfig --patch @disable-kubespan.yaml --nodes <node-ip>
# Wait for config to apply
talosctl patch machineconfig --patch @enable-kubespan.yaml --nodes <node-ip>
```

This forces the node to regenerate its WireGuard configuration and re-establish all peer connections.

KubeSpan troubleshooting on Talos Linux follows a logical progression: check the configuration, check discovery, check endpoints, check peer state, and check routing. Because Talos is immutable and you cannot install debugging tools on the nodes, `talosctl` is your primary tool. Get comfortable with the KubeSpan-related resources, and you will be able to diagnose most issues quickly.
