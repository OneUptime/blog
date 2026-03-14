# How to Configure etcd Listen and Advertise Addresses in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Networking, Kubernetes, Cluster Configuration

Description: Learn how to configure etcd listen and advertise addresses in Talos Linux for proper cluster communication and multi-network setups.

---

etcd needs to communicate with its cluster peers and with the Kubernetes API server. The addresses it uses for listening and advertising are fundamental to this communication. Getting these wrong leads to clusters that cannot form, members that cannot sync, or API servers that cannot reach their data store. On Talos Linux, these addresses are configured through the machine configuration, not through command-line flags or config files on disk.

## Understanding Listen vs. Advertise Addresses

etcd uses two types of addresses, and confusing them is one of the most common configuration mistakes.

**Listen addresses** are the local network interfaces and ports where etcd binds and accepts connections. These are like opening a door on a specific side of your building. Common listen addresses include `0.0.0.0:2379` (accept client connections on all interfaces) or `192.168.1.10:2380` (accept peer connections only on a specific interface).

**Advertise addresses** are the addresses that etcd tells other members and clients to use when connecting to it. These are like publishing your mailing address. The advertise address must be reachable by the other members and clients. If you advertise `localhost:2379`, other nodes will try to connect to their own localhost, which obviously will not work.

etcd has two sets of these:

- **Client URLs** (port 2379) - Used by the API server and other clients to read and write data
- **Peer URLs** (port 2380) - Used by etcd members to communicate with each other for consensus

## Default Configuration in Talos Linux

Talos Linux automatically configures etcd listen and advertise addresses based on your machine configuration. By default, Talos sets:

- Client listen: `https://0.0.0.0:2379` (listens on all interfaces)
- Client advertise: `https://<node-ip>:2379` (advertises the node's primary IP)
- Peer listen: `https://0.0.0.0:2380`
- Peer advertise: `https://<node-ip>:2380`
- Metrics listen: `http://0.0.0.0:2381` (for Prometheus scraping)

For most single-network setups, the defaults work perfectly. You only need to change them for multi-network configurations, specific security requirements, or unusual topologies.

## Customizing etcd Addresses in Talos Machine Config

To override the default etcd configuration, modify the machine config for your control plane nodes:

```yaml
# controlplane-patch.yaml
cluster:
  etcd:
    # Advertise address for this etcd member
    advertisedSubnets:
      - 10.0.1.0/24  # Use the 10.0.1.x network for etcd communication

    # Additional etcd configuration
    extraArgs:
      listen-client-urls: "https://0.0.0.0:2379"
      listen-peer-urls: "https://0.0.0.0:2380"
      listen-metrics-urls: "http://0.0.0.0:2381"
```

The `advertisedSubnets` setting is the most important one. It tells Talos which network to use when calculating the advertise address. If your node has multiple interfaces (for example, one for management and one for data), this setting ensures etcd advertises the correct IP.

Apply the configuration:

```bash
# Apply to a control plane node
talosctl apply-config --nodes 192.168.1.10 --patch @controlplane-patch.yaml

# Verify the configuration took effect
talosctl -n 192.168.1.10 get etcdmembers
```

## Multi-Network Configurations

A common scenario is having separate networks for different types of traffic. For example:

- `192.168.1.0/24` - Management network (SSH, talosctl)
- `10.0.1.0/24` - Cluster network (etcd, kubelet, API server)
- `10.0.2.0/24` - Application network (pod-to-pod traffic)

In this setup, you want etcd to communicate over the cluster network, not the management network:

```yaml
# Multi-network etcd configuration
machine:
  network:
    interfaces:
    - interface: eth0
      addresses:
        - 192.168.1.10/24
      routes:
        - network: 0.0.0.0/0
          gateway: 192.168.1.1
    - interface: eth1
      addresses:
        - 10.0.1.10/24
    - interface: eth2
      addresses:
        - 10.0.2.10/24

cluster:
  etcd:
    # Tell etcd to advertise on the cluster network
    advertisedSubnets:
      - 10.0.1.0/24

    # Restrict listening to specific interfaces
    extraArgs:
      listen-client-urls: "https://10.0.1.10:2379,https://127.0.0.1:2379"
      listen-peer-urls: "https://10.0.1.10:2380"
      listen-metrics-urls: "http://10.0.1.10:2381"
```

This configuration ensures that:

- etcd peer traffic flows over the dedicated cluster network
- Client connections (from the API server) also use the cluster network
- The loopback address is included for local health checks

## Configuring for High Availability

In a 3-node or 5-node etcd cluster, every member needs to know the initial addresses of all other members. Talos handles this through the cluster discovery mechanism, but you can also specify initial cluster members explicitly:

```yaml
# Explicit cluster member configuration
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
    extraArgs:
      initial-cluster: >-
        cp1=https://10.0.1.10:2380,
        cp2=https://10.0.1.11:2380,
        cp3=https://10.0.1.12:2380
      initial-cluster-state: "new"
      initial-cluster-token: "my-etcd-cluster"
```

For existing clusters where you are adding a new member, use `existing` instead of `new` for the initial-cluster-state.

## Verifying the Configuration

After applying your configuration, verify that etcd is using the correct addresses:

```bash
# Check etcd member list with their peer URLs
talosctl -n 10.0.1.10 etcd members

# Example output:
# MEMBER         HOSTNAME  PEER URLS                    CLIENT URLS                   LEARNER
# 8e9e05c52164   cp1       https://10.0.1.10:2380       https://10.0.1.10:2379        false
# a1b2c3d4e5f6   cp2       https://10.0.1.11:2380       https://10.0.1.11:2379        false
# f6e5d4c3b2a1   cp3       https://10.0.1.12:2380       https://10.0.1.12:2379        false

# Verify connectivity between members
talosctl -n 10.0.1.10 etcd status
talosctl -n 10.0.1.11 etcd status
talosctl -n 10.0.1.12 etcd status
```

All members should show the same leader and similar raft indices.

## Troubleshooting Address Issues

If etcd members cannot communicate, check the following:

```bash
# Check if etcd is listening on the expected ports
talosctl -n 10.0.1.10 netstat | grep 2379
talosctl -n 10.0.1.10 netstat | grep 2380

# Check etcd logs for connection errors
talosctl -n 10.0.1.10 logs etcd | grep -i "error\|refused\|timeout\|unreachable"

# Verify the machine config was applied correctly
talosctl -n 10.0.1.10 get machineconfig -o yaml | grep -A 10 etcd
```

Common problems include:

- **Firewall rules blocking ports 2379/2380** between control plane nodes
- **Advertising an unreachable address** (like a private IP from a different subnet)
- **Mismatched TLS certificates** when the advertised address does not match the certificate SANs
- **Split-brain from dual-homed nodes** where different members see different addresses

## Security Considerations

etcd traffic should always be encrypted with TLS, which Talos Linux handles automatically. However, if you are customizing listen addresses, make sure you are not accidentally exposing etcd on a public interface:

```yaml
# Restrict client access to internal networks only
cluster:
  etcd:
    extraArgs:
      # Do NOT listen on 0.0.0.0 in production if you have public interfaces
      listen-client-urls: "https://10.0.1.10:2379,https://127.0.0.1:2379"
      listen-peer-urls: "https://10.0.1.10:2380"
```

The metrics endpoint (port 2381) uses HTTP by default and should also be restricted to internal networks. Do not expose it publicly.

## Summary

Configuring etcd listen and advertise addresses in Talos Linux is done through the machine configuration, primarily using the `advertisedSubnets` setting and `extraArgs` for fine-tuning. For single-network clusters, the defaults are usually sufficient. For multi-network setups, explicitly configure the addresses to ensure etcd communicates over the correct network. Always verify your configuration with talosctl after applying changes, and keep etcd traffic on secure, low-latency networks for the best cluster performance.
