# How to Configure WireGuard for Pod-to-Pod Traffic on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, Kubernetes, Networking, Pod Security

Description: Learn how to encrypt pod-to-pod traffic using WireGuard on Talos Linux for enhanced security in untrusted network environments.

---

By default, pod-to-pod traffic in Kubernetes travels unencrypted across the node network. In trusted environments like a private data center, this is usually acceptable. But when your Talos Linux cluster runs across cloud providers, spans multiple regions, or operates in an environment where you cannot fully trust the network infrastructure, encrypting pod traffic becomes important. WireGuard provides an efficient way to do this.

This post explains how to configure WireGuard on Talos Linux to encrypt pod-to-pod traffic, covering both the Cilium-native approach and a manual WireGuard mesh setup.

## Understanding the Problem

When Pod A on Node 1 sends a packet to Pod B on Node 2, the traffic crosses the physical network between the two nodes. The CNI plugin handles the encapsulation (usually VXLAN or Geneve), but the traffic between nodes is not encrypted unless you specifically configure it.

Anyone with access to the network between nodes can potentially capture and read this traffic. This includes cloud provider staff, other tenants on shared infrastructure, and anyone who compromises a network device along the path.

## Option 1: Cilium with WireGuard Encryption

If you are using Cilium as your CNI plugin on Talos Linux, the simplest approach is to enable Cilium's built-in WireGuard encryption. Cilium handles everything automatically, including key generation, peer discovery, and tunnel setup.

```yaml
# Cilium Helm values to enable WireGuard encryption
# Apply this when installing or upgrading Cilium
encryption:
  enabled: true
  type: wireguard
  # Use node-to-node encryption for all pod traffic
  wireguard:
    userspaceFallback: false
```

Install or upgrade Cilium with these values:

```bash
# Install Cilium with WireGuard encryption enabled
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard

# Or upgrade an existing installation
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --reuse-values
```

After enabling this, Cilium creates WireGuard interfaces on each node and automatically encrypts all pod-to-pod traffic that crosses node boundaries. Traffic between pods on the same node stays local and does not need encryption.

### Verifying Cilium WireGuard Encryption

Check that WireGuard is active on each node:

```bash
# Check Cilium encryption status
kubectl -n kube-system exec ds/cilium -- cilium encrypt status

# Expected output should show WireGuard is enabled
# and list the number of peers

# Verify WireGuard interfaces exist on nodes
kubectl -n kube-system exec ds/cilium -- cilium encrypt status --verbose

# Check that traffic is being encrypted
# Run a test pod and capture traffic between nodes
kubectl run test-pod --image=busybox --command -- sleep 3600
kubectl exec test-pod -- wget -qO- http://some-service-on-another-node
```

You can verify encryption is working by looking at the traffic on the node's physical interface. If WireGuard is active, you should see UDP traffic on the WireGuard port instead of plain VXLAN or Geneve traffic.

## Option 2: Manual WireGuard Mesh for Non-Cilium CNIs

If you are not using Cilium or if you want more control over the WireGuard configuration, you can set up a manual WireGuard mesh through the Talos machine configuration. This approach works with any CNI plugin.

### Step 1: Generate Keys for All Nodes

Each node needs its own WireGuard key pair.

```bash
# Generate keys for each node
for i in 1 2 3 4 5; do
  wg genkey | tee node${i}-private.key | wg pubkey > node${i}-public.key
done

# Display all public keys
for i in 1 2 3 4 5; do
  echo "Node $i public key: $(cat node${i}-public.key)"
done
```

### Step 2: Configure WireGuard on Each Node

Each node gets a WireGuard interface with all other nodes as peers. The key is to include the pod CIDR of each peer in the allowedIPs, so pod traffic gets routed through the encrypted tunnel.

```yaml
# wireguard-patch-node1.yaml
# WireGuard configuration for node1
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "NODE1_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # Node 2
            - publicKey: "NODE2_PUBLIC_KEY"
              endpoint: 192.168.1.2:51820
              allowedIPs:
                - 10.10.0.2/32
                # Node 2 pod CIDR
                - 10.244.1.0/24
              persistentKeepalive: 25
            # Node 3
            - publicKey: "NODE3_PUBLIC_KEY"
              endpoint: 192.168.1.3:51820
              allowedIPs:
                - 10.10.0.3/32
                - 10.244.2.0/24
              persistentKeepalive: 25
            # Node 4
            - publicKey: "NODE4_PUBLIC_KEY"
              endpoint: 192.168.1.4:51820
              allowedIPs:
                - 10.10.0.4/32
                - 10.244.3.0/24
              persistentKeepalive: 25
            # Node 5
            - publicKey: "NODE5_PUBLIC_KEY"
              endpoint: 192.168.1.5:51820
              allowedIPs:
                - 10.10.0.5/32
                - 10.244.4.0/24
              persistentKeepalive: 25
```

### Step 3: Apply to All Nodes

```bash
# Apply WireGuard configuration to each node
talosctl -n 192.168.1.1 patch machineconfig --patch-file wireguard-patch-node1.yaml
talosctl -n 192.168.1.2 patch machineconfig --patch-file wireguard-patch-node2.yaml
talosctl -n 192.168.1.3 patch machineconfig --patch-file wireguard-patch-node3.yaml
talosctl -n 192.168.1.4 patch machineconfig --patch-file wireguard-patch-node4.yaml
talosctl -n 192.168.1.5 patch machineconfig --patch-file wireguard-patch-node5.yaml
```

### Step 4: Configure CNI to Use WireGuard Addresses

Your CNI plugin needs to know that cross-node pod traffic should go through the WireGuard tunnel. This typically means configuring the CNI to use the WireGuard interface IPs as the node addresses.

For Flannel, you can set the public IP annotation on each node:

```bash
# Tell Flannel to use the WireGuard tunnel IP for cross-node traffic
kubectl annotate node node1 flannel.alpha.coreos.com/public-ip-overwrite=10.10.0.1
kubectl annotate node node2 flannel.alpha.coreos.com/public-ip-overwrite=10.10.0.2
kubectl annotate node node3 flannel.alpha.coreos.com/public-ip-overwrite=10.10.0.3
```

## Performance Considerations

WireGuard adds some overhead to every packet. The encryption itself is fast thanks to the use of ChaCha20-Poly1305, but there is still a per-packet cost for encryption and decryption, plus the WireGuard header adds bytes to each packet.

In practice, the performance impact is small. On modern hardware, WireGuard can handle several gigabits per second with minimal CPU overhead. But there are a few things to watch for.

### MTU Settings

The WireGuard overhead reduces the effective MTU. Set the WireGuard interface MTU to account for the WireGuard header (typically 60 bytes). If your physical interface has a 1500 byte MTU, set the WireGuard MTU to 1420.

```yaml
# Correct MTU setting for WireGuard
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        # ... rest of WireGuard config
```

If you are running WireGuard inside a VXLAN overlay, you might need to reduce the MTU further. The CNI plugin's MTU should be set lower than the WireGuard MTU to avoid fragmentation.

### CPU Impact

WireGuard uses SIMD instructions on modern CPUs, which makes encryption very efficient. On a typical server-class CPU, you should not see more than a few percent CPU increase from enabling WireGuard encryption. However, on resource-constrained nodes (like edge devices), test the performance impact before deploying to production.

## Monitoring Encrypted Traffic

Once WireGuard is encrypting your pod traffic, you will want to monitor the tunnel status to catch issues early.

```bash
# Check WireGuard interface statistics
talosctl -n 192.168.1.1 read /proc/net/wireguard

# The output shows for each peer:
# - Public key
# - Endpoint address
# - Latest handshake timestamp
# - Transfer bytes (rx/tx)
# - Allowed IPs

# Monitor transfer rates over time
# Run this periodically to track traffic patterns
talosctl -n 192.168.1.1 get links | grep wg0
```

If a peer shows no recent handshake, it means the tunnel to that node is down. Investigate the connectivity between the nodes and check the WireGuard configuration.

## Handling Node Additions

When you add a new node to the cluster, you need to update the WireGuard configuration on all existing nodes to include the new node as a peer. This is one of the downsides of the manual approach compared to the Cilium approach, which handles peer discovery automatically.

```bash
# For a new node (node6), generate keys
wg genkey | tee node6-private.key | wg pubkey > node6-public.key

# Add node6 as a peer to all existing nodes
# Then configure node6 with all existing nodes as peers
```

For clusters that frequently add and remove nodes, the Cilium approach is much more practical because it automates the peer management entirely.

## Conclusion

Encrypting pod-to-pod traffic with WireGuard on Talos Linux protects your workloads from network-level eavesdropping. If you are already using Cilium, enable the built-in WireGuard support for the simplest setup. If you use a different CNI or need custom routing, the manual WireGuard mesh approach gives you full control. Either way, the performance overhead is minimal and the security benefit is substantial, especially in cloud or multi-tenant environments where you cannot fully trust the network.
