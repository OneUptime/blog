# How to Configure Kubelet Node IP in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubelet, Kubernetes, Networking, Node Configuration

Description: Step-by-step guide to configuring the kubelet node IP in Talos Linux so Kubernetes registers nodes with the correct network address.

---

When a Kubernetes node registers with the API server, the kubelet reports its IP address. This IP becomes the address that the API server uses to reach the kubelet for things like pod logs, exec sessions, and health probes. In Talos Linux, when your nodes have multiple network interfaces or addresses, you need to make sure the kubelet picks the right one. The `nodeIP` configuration in Talos gives you direct control over this selection.

## The Problem with Automatic IP Selection

By default, the kubelet selects its node IP based on the default route. On a machine with a single interface and a single IP, this works perfectly. But consider a node with two interfaces:

- `eth0` at 10.0.1.20 on the management network
- `eth1` at 192.168.100.20 on the storage network

If the default route points through `eth0`, the kubelet will usually pick 10.0.1.20. But "usually" is not good enough for production. Network configuration changes, DHCP renewals, or route metric adjustments could cause the kubelet to pick a different IP after a restart. When that happens, the node might appear as a new node in the cluster, or existing pods might lose connectivity.

## How Talos Linux Handles Node IP Selection

Talos Linux provides the `machine.kubelet.nodeIP.validSubnets` configuration option. This lets you specify which subnets are acceptable for the kubelet's node IP. Talos will only select an IP that falls within one of the listed subnets.

The basic configuration looks like this:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
```

With this setting, the kubelet will only register with an IP from the 10.0.1.0/24 subnet. Even if the node has other addresses, they will be ignored for the purpose of node registration.

## Configuring Node IP During Cluster Creation

The simplest approach is to include the node IP configuration when generating your initial Talos configurations:

```bash
# Create a config patch file
cat > kubelet-nodeip-patch.yaml <<'EOF'
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
EOF

# Generate configs with the patch applied
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @kubelet-nodeip-patch.yaml
```

This patch applies to both control plane and worker nodes. If control plane nodes and worker nodes use different subnets, you can apply separate patches:

```bash
# Patch for control plane nodes
cat > cp-nodeip-patch.yaml <<'EOF'
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
EOF

# Patch for worker nodes
cat > worker-nodeip-patch.yaml <<'EOF'
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.2.0/24
EOF

# Generate configs with role-specific patches
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch-control-plane @cp-nodeip-patch.yaml \
    --config-patch-worker @worker-nodeip-patch.yaml
```

## Configuring Node IP on an Existing Cluster

For a running cluster, create a patch and apply it to each node:

```yaml
# nodeip-patch.yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
```

```bash
# Apply to a specific node
talosctl apply-config --nodes 10.0.1.20 --patch @nodeip-patch.yaml --mode no-reboot
```

The kubelet will pick up the new configuration without requiring a full node reboot. However, if the node IP actually changes as a result, the kubelet will need to restart, which means pods on that node may experience brief disruptions.

## Verifying the Node IP

After applying the configuration, verify that the kubelet is using the expected IP:

```bash
# Check the node's internal IP in Kubernetes
kubectl get nodes -o wide
```

The `INTERNAL-IP` column should show an IP from your configured subnet. You can also check from the Talos side:

```bash
# View the kubelet's current node IP
talosctl get kubeletspec --nodes 10.0.1.20
```

## Dual-Stack Node IP Configuration

If you are running a dual-stack Kubernetes cluster that supports both IPv4 and IPv6, you can configure valid subnets for both address families:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24          # IPv4 subnet
        - fd00:db8:1::/64       # IPv6 subnet
```

With this configuration, the kubelet registers with both an IPv4 and an IPv6 address. Kubernetes will list both under the node's addresses. This is required for proper dual-stack operation because services need to know both addresses for routing.

## Excluding Specific Subnets

Sometimes it is easier to specify which subnets to exclude rather than which to include. While Talos does not have an explicit "exclude" option, you can achieve the same result by listing all acceptable subnets. If your node has three interfaces on 10.0.1.0/24, 192.168.100.0/24, and 172.16.0.0/24, and you want to exclude the storage network:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24      # Management - include
        - 172.16.0.0/24     # Application - include
        # 192.168.100.0/24 is omitted, so it will not be selected
```

The negation prefix `!` can also be used to explicitly exclude subnets:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - "!192.168.100.0/24"  # Exclude the storage network
```

This approach says "use any address except one from the storage network," which can be more maintainable when you add new networks over time.

## Coordinating Node IP with Other Components

The kubelet node IP should be on the same network as other cluster components. Here is a complete configuration that aligns the kubelet, etcd, and certificate SANs:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24
  certSANs:
    - 10.0.1.20
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
      - interface: eth1
        addresses:
          - 192.168.100.20/24
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
```

This configuration ensures that the kubelet, etcd, and TLS certificates all reference the same management network. Consistency here prevents hard-to-debug connectivity issues.

## What Happens When No Matching Subnet Exists

If you configure `validSubnets` with a subnet that does not match any address on the node, the kubelet will fail to start. You will see errors in the kubelet logs:

```bash
# Check kubelet logs for IP selection errors
talosctl logs kubelet --nodes 10.0.1.20
```

The error will indicate that no valid IP was found matching the configured subnets. To fix this, either correct the subnet in the configuration or ensure the node has an address in the specified subnet.

## Node IP and Cloud Environments

In cloud environments like AWS, GCP, or Azure, nodes typically get their IPs from the cloud provider. In these cases, you should configure `validSubnets` to match the VPC or subnet CIDR that your instances are deployed into:

```yaml
# Example for an AWS VPC subnet
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.0.0/16  # VPC CIDR
```

Using a broader CIDR works fine here because cloud instances typically only have one private IP from the VPC subnet. The `validSubnets` filter still ensures that if additional interfaces are attached (like for CNI plugins or additional ENIs), they will not be accidentally selected as the node IP.

## Troubleshooting Node IP Issues

If nodes are registering with unexpected IPs, here is a systematic troubleshooting approach:

```bash
# Step 1: Check what IPs the node has
talosctl get addresses --nodes 10.0.1.20

# Step 2: Check the current machine config
talosctl get machineconfig --nodes 10.0.1.20

# Step 3: Check kubelet status
talosctl service kubelet --nodes 10.0.1.20

# Step 4: Look at kubelet logs
talosctl logs kubelet --nodes 10.0.1.20 | grep -i "node IP\|address"

# Step 5: Check what Kubernetes sees
kubectl get node <node-name> -o jsonpath='{.status.addresses}' | jq
```

Step through these commands in order. Most issues come down to either a missing address on the node (the subnet does not match any interface) or a configuration that has not been applied yet.

## Conclusion

Configuring the kubelet node IP in Talos Linux is essential for any cluster where nodes have more than one network interface. The `validSubnets` option gives you precise control over which address the kubelet uses, preventing the kind of unpredictable behavior that comes from relying on automatic selection. Whether you are setting up a new cluster or updating an existing one, taking a few minutes to configure this correctly saves hours of debugging network issues down the road. Always align your kubelet node IP configuration with your etcd advertised subnets and certificate SANs for a consistent, reliable cluster network setup.
