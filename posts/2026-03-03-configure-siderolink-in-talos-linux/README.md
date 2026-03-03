# How to Configure SideroLink in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SideroLink, Sidero Metal, Bare Metal, Kubernetes, Cluster Management

Description: Learn how to configure SideroLink in Talos Linux to establish a secure WireGuard tunnel between your nodes and the Sidero management plane.

---

SideroLink is a networking feature that creates a secure point-to-point WireGuard tunnel between your Talos Linux nodes and the Sidero management plane. If you are managing bare metal Kubernetes clusters at scale, understanding SideroLink is important because it gives you reliable, encrypted connectivity back to your management infrastructure regardless of the underlying network topology.

In this guide, we will walk through what SideroLink does, why it matters, and how to configure it properly in your Talos Linux environment.

## What is SideroLink?

SideroLink is a WireGuard-based overlay network that connects each Talos Linux node directly to the Sidero Metal management server. Unlike traditional management approaches where you need direct network access to every node, SideroLink creates a reverse tunnel from each node back to the management plane. This means your management server does not need to be able to reach nodes directly - the nodes reach out to the management server instead.

Each node gets a unique IPv6 address on the SideroLink network, and all management traffic (including talosctl commands, log streaming, and cluster operations) flows over this encrypted tunnel. This is particularly useful in environments where nodes sit behind NAT, firewalls, or are spread across different network segments.

## Prerequisites

Before configuring SideroLink, make sure you have the following in place:

- A running Sidero Metal management cluster
- Talos Linux v1.5 or later on your managed nodes
- Network connectivity from your nodes to the Sidero management server on the SideroLink port (default UDP 51821)
- `talosctl` installed on your workstation

## How SideroLink Works Under the Hood

When a Talos Linux node boots and discovers it is being managed by Sidero, the following sequence happens:

1. The node receives the SideroLink configuration as part of its machine config
2. A WireGuard interface is created on the node with a unique key pair
3. The node establishes a WireGuard tunnel to the Sidero management server
4. An IPv6 address from the SideroLink subnet is assigned to the node
5. Management traffic flows over this encrypted tunnel

The management server maintains the peer list and routes traffic to the correct node based on its SideroLink address.

## Configuring SideroLink in the Machine Config

SideroLink configuration is embedded in the Talos machine configuration. When you use Sidero Metal to provision nodes, this configuration is typically injected automatically. However, you can also configure it manually.

Here is what the relevant section of the machine config looks like:

```yaml
# Machine configuration with SideroLink settings
machine:
  network:
    interfaces:
      - interface: siderolink
        addresses:
          - fd00:1234:5678::1/128  # Unique SideroLink IPv6 address
  # SideroLink specific configuration
  siderolink:
    api: https://sidero-management.example.com:8099  # Management server endpoint
```

The `api` field points to your Sidero management server's SideroLink endpoint. The address assigned to the interface is unique per node and is managed by the Sidero server.

## Setting Up the Sidero Management Server

On the management server side, you need to make sure the SideroLink service is running and accessible. If you installed Sidero Metal using the standard Helm chart, SideroLink is enabled by default.

Verify the SideroLink service is running:

```bash
# Check SideroLink pods in the sidero-system namespace
kubectl get pods -n sidero-system -l app=sidero-link

# Verify the SideroLink service endpoint
kubectl get svc -n sidero-system siderolink
```

You should see a service listening on UDP port 51821. Make sure this port is accessible from your worker nodes.

## Verifying SideroLink Connectivity

Once your nodes are configured and booted, you can verify that SideroLink tunnels are established:

```bash
# Check the SideroLink interface on a node
talosctl -n <node-ip> get links siderolink

# Verify the WireGuard tunnel status
talosctl -n <node-ip> get wireguardpeers

# Check the assigned SideroLink address
talosctl -n <node-ip> get addresses siderolink
```

You should see an active WireGuard peer connection with recent handshake timestamps. If the handshake timestamp is stale or missing, the tunnel is not establishing properly.

## Using SideroLink for Node Management

One of the biggest advantages of SideroLink is that you can use the SideroLink IPv6 addresses to manage nodes through talosctl, even when the nodes are not directly reachable on your network:

```bash
# Connect to a node using its SideroLink address
talosctl -n fd00:1234:5678::1 version

# Stream logs from a node via SideroLink
talosctl -n fd00:1234:5678::1 logs kubelet

# Apply configuration changes through the tunnel
talosctl -n fd00:1234:5678::1 apply-config --file machine-config.yaml
```

This works because your workstation connects to the Sidero management server, which then routes the traffic through the appropriate SideroLink tunnel to the target node.

## Troubleshooting SideroLink Issues

If SideroLink is not working as expected, here are the common areas to investigate.

**Tunnel not establishing:**

```bash
# Check if the node can reach the management server
talosctl -n <node-ip> get netstat | grep 51821

# Look for SideroLink errors in the node logs
talosctl -n <node-ip> dmesg | grep -i wireguard

# Verify the SideroLink configuration was applied
talosctl -n <node-ip> get machineconfig -o yaml | grep -A 10 siderolink
```

**Key mismatch errors:**

If you see authentication failures in the WireGuard logs, the most likely cause is that the node's key pair does not match what the management server expects. This can happen if a node was re-provisioned without cleaning up its entry in Sidero. Remove the old server entry in the Sidero management plane and let the node re-register.

**Firewall blocking UDP traffic:**

SideroLink uses UDP for its WireGuard tunnel. If you have firewalls between your nodes and the management server, make sure UDP port 51821 (or whatever port you configured) is allowed through. TCP-only firewalls will block the tunnel entirely.

## Security Considerations

SideroLink traffic is encrypted using WireGuard's cryptographic primitives (Curve25519 for key exchange, ChaCha20-Poly1305 for data encryption). Each node has a unique key pair, and the management server maintains a list of authorized peers.

A few things to keep in mind regarding security:

- Rotate SideroLink keys periodically by re-provisioning nodes through Sidero
- Restrict access to the SideroLink UDP port to only your node networks
- Monitor the management server for unauthorized peer connections
- Use network policies in your management cluster to restrict access to the SideroLink service

```bash
# Example: Check current peers on the management server
kubectl exec -n sidero-system deploy/siderolink -c siderolink -- wg show
```

## Performance Tuning

WireGuard is known for its low overhead, but there are a few things you can tune for better SideroLink performance in large clusters:

```yaml
# Adjust MTU if you are running inside a cloud provider or nested virtualization
machine:
  network:
    interfaces:
      - interface: siderolink
        mtu: 1420  # Reduce MTU to account for WireGuard overhead
```

For clusters with more than 100 nodes, consider monitoring the management server's CPU and memory usage, as maintaining many concurrent WireGuard tunnels does add some overhead.

## Conclusion

SideroLink provides a clean solution for managing Talos Linux nodes that may not be directly reachable on your network. By leveraging WireGuard tunnels, it gives you secure, encrypted management access to every node in your fleet without requiring complex network configurations or VPN setups. Whether you are managing a handful of bare metal servers in a single rack or hundreds of nodes across multiple data centers, SideroLink simplifies the management plane connectivity problem considerably.

The key takeaway is that SideroLink works best when you let Sidero Metal handle the configuration automatically during node provisioning. Manual configuration is possible but adds maintenance overhead. Start with the defaults, verify connectivity, and tune from there.
