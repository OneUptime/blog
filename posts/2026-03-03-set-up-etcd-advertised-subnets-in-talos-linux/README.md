# How to Set Up etcd Advertised Subnets in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Networking, Kubernetes, Cluster Configuration

Description: Learn how to configure etcd advertised subnets in Talos Linux to control which network interface etcd uses for peer communication and client traffic.

---

In a Talos Linux cluster, etcd is the backbone of your control plane. It stores all cluster state, and its performance and reliability directly affect your entire Kubernetes cluster. When your nodes have multiple network interfaces, etcd needs to know which one to use for communicating with its peers. This is where the `advertisedSubnets` configuration comes in. This guide explains what it does, why it matters, and how to set it up correctly.

## What Are etcd Advertised Subnets

When etcd starts on a Talos Linux control plane node, it needs to advertise an IP address that other etcd members can use to reach it. By default, Talos picks the IP address associated with the default route. In a single-interface setup, this works fine because there is only one choice.

But when your nodes have multiple interfaces - say one for management traffic and another for storage or a separate pod network - the default choice might not be the right one. The `advertisedSubnets` setting tells Talos which subnet to pick the etcd advertise address from, giving you explicit control over etcd's communication path.

## Why This Matters

etcd is sensitive to network latency and packet loss. The consensus algorithm relies on timely heartbeats between members, and if those heartbeats are delayed, etcd can trigger leader elections, which temporarily stall all writes to the cluster. In a worst-case scenario, frequent elections can make the cluster unstable.

If etcd accidentally picks an IP from a high-latency network (like a storage VLAN that is saturated with replication traffic), you will see symptoms like:

- Slow `kubectl` commands
- Pods taking longer than usual to schedule
- Warning messages in etcd logs about failed heartbeats
- Occasional leader elections visible in `etcdctl endpoint status`

By explicitly configuring the advertised subnet, you make sure etcd uses a low-latency, reliable network path.

## Checking the Current etcd Configuration

Before making changes, check which address etcd is currently advertising:

```bash
# Check etcd member list to see current advertised addresses
talosctl etcd members --nodes 10.0.1.10
```

You can also inspect the etcd service to see its current configuration:

```bash
# Get the etcd service status
talosctl service etcd --nodes 10.0.1.10
```

This will show you the advertise address etcd is currently using. If it is on the wrong subnet, you know you need to configure `advertisedSubnets`.

## Configuring Advertised Subnets

The configuration is straightforward. You add the `advertisedSubnets` field under `cluster.etcd` in your machine configuration:

```yaml
# Machine configuration for a control plane node
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24  # Use the management network for etcd
```

You can specify multiple subnets, and Talos will use the first one that matches an address on the node:

```yaml
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24    # Primary preference
      - 172.16.0.0/16   # Fallback if primary is not available
```

## Applying the Configuration

If you are generating fresh configurations for a new cluster, include the `advertisedSubnets` in your config generation:

```bash
# Generate configs with etcd subnet configuration
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch '[{"op": "add", "path": "/cluster/etcd/advertisedSubnets", "value": ["10.0.1.0/24"]}]'
```

For an existing cluster, create a patch file:

```yaml
# etcd-subnet-patch.yaml
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

Then apply it to each control plane node:

```bash
# Apply the patch to the first control plane node
talosctl apply-config --nodes 10.0.1.10 --patch @etcd-subnet-patch.yaml --mode no-reboot

# Apply to the second control plane node
talosctl apply-config --nodes 10.0.1.11 --patch @etcd-subnet-patch.yaml --mode no-reboot

# Apply to the third control plane node
talosctl apply-config --nodes 10.0.1.12 --patch @etcd-subnet-patch.yaml --mode no-reboot
```

The `--mode no-reboot` flag is important here. Changing the etcd advertised subnet does not require a full reboot, and rebooting control plane nodes simultaneously could cause cluster downtime.

## Handling Subnet Changes on Running Clusters

Changing the advertised subnet on a running cluster requires care. If etcd members are already communicating on one subnet and you switch them to another, you need to make sure the new subnet is reachable by all members before the change takes effect.

Here is the recommended approach:

1. Verify that all control plane nodes have IPs on the new subnet
2. Verify network connectivity between all nodes on the new subnet
3. Apply the change to one node at a time
4. After each node, verify etcd cluster health before proceeding

```bash
# Step 1: Check that all nodes have addresses on the target subnet
talosctl get addresses --nodes 10.0.1.10 | grep "172.16"
talosctl get addresses --nodes 10.0.1.11 | grep "172.16"
talosctl get addresses --nodes 10.0.1.12 | grep "172.16"

# Step 2: Apply to the first node
talosctl apply-config --nodes 10.0.1.10 --patch @etcd-subnet-patch.yaml --mode no-reboot

# Step 3: Wait a moment and check etcd health
talosctl etcd members --nodes 10.0.1.11
talosctl etcd status --nodes 10.0.1.11

# Step 4: If healthy, proceed to the next node
talosctl apply-config --nodes 10.0.1.11 --patch @etcd-subnet-patch.yaml --mode no-reboot

# Step 5: Verify again
talosctl etcd members --nodes 10.0.1.12
talosctl etcd status --nodes 10.0.1.12

# Step 6: Apply to the last node
talosctl apply-config --nodes 10.0.1.12 --patch @etcd-subnet-patch.yaml --mode no-reboot
```

## Combined Configuration with Kubelet Node IP

When configuring etcd advertised subnets, you usually also want to set the kubelet node IP to use the same network. This keeps all cluster-critical traffic on the same reliable network:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

This way, both the kubelet registration and etcd peer communication happen over the management network, while other interfaces can handle workload traffic.

## Dual-Stack Considerations

If you are running a dual-stack cluster with both IPv4 and IPv6, you can specify subnets for both address families:

```yaml
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24          # IPv4 management network
      - fd00:db8:1::/64       # IPv6 management network
```

Talos will pick one address from each family if dual-stack is configured, or just the matching address for single-stack setups.

## Verifying the Change

After applying the configuration, verify that etcd is advertising the correct address:

```bash
# List etcd members and check their peer URLs
talosctl etcd members --nodes 10.0.1.10
```

The output should show peer URLs using IPs from your configured subnet. For example:

```
ID                 HOSTNAME        PEER URLS                      CLIENT URLS
8e9e05c52164694d   cp-1           https://10.0.1.10:2380         https://10.0.1.10:2379
91bc3c398fc3c146   cp-2           https://10.0.1.11:2380         https://10.0.1.11:2379
fd422379fda50e48   cp-3           https://10.0.1.12:2380         https://10.0.1.12:2379
```

If any member shows an IP from a different subnet, the configuration did not take effect on that node. Check the machine config and reapply if needed.

## Monitoring etcd Network Performance

After setting up the advertised subnets, monitor etcd to make sure the chosen network performs well:

```bash
# Check etcd health and latency
talosctl etcd status --nodes 10.0.1.10

# Look for slow heartbeat warnings in the logs
talosctl logs etcd --nodes 10.0.1.10 | grep -i "heartbeat\|election\|slow"
```

Healthy etcd should show consistent leader status with no frequent elections or slow request warnings. If you see issues, the network path for the chosen subnet may have problems that need investigation at the infrastructure level.

## Common Mistakes to Avoid

There are a few pitfalls to watch out for when configuring etcd subnets:

Do not use a subnet that only exists on some control plane nodes. All etcd members must be able to reach each other on the configured subnet. If one node does not have an address in that subnet, etcd will fail to start on that node.

Do not use a storage or backup network that has variable bandwidth. etcd needs consistent low-latency communication. A network that gets saturated during backup windows or storage replication is a poor choice.

Do not forget to update the configuration when changing your network topology. If you migrate to a new subnet, update the `advertisedSubnets` as part of that migration plan.

## Conclusion

Configuring etcd advertised subnets in Talos Linux is a small change that can have a big impact on cluster stability. By explicitly telling etcd which network to use, you avoid the unpredictability of automatic address selection on multihomed nodes. The process is simple: add the `advertisedSubnets` field to your cluster configuration, apply it to your control plane nodes, and verify that etcd members are communicating on the right network. For production clusters, this should be considered a required configuration step rather than an optional one.
