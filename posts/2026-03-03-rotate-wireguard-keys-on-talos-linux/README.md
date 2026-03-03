# How to Rotate WireGuard Keys on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, Security, Key Rotation, VPN

Description: Step-by-step guide to rotating WireGuard private and public keys on Talos Linux clusters to maintain strong security practices.

---

WireGuard keys do not expire. Unlike TLS certificates that have a built-in expiration date, a WireGuard key pair works indefinitely until you replace it. This means key rotation is entirely your responsibility. If a key is compromised and you never rotate, an attacker has permanent access to your encrypted network. Regular key rotation limits the window of exposure and is a fundamental security practice for any WireGuard deployment on Talos Linux.

This post covers why you should rotate keys, how to plan the rotation, and the step-by-step process for rotating WireGuard keys across a Talos Linux cluster with minimal disruption.

## Why Rotate Keys

There are several reasons to rotate WireGuard keys regularly.

First, limiting exposure. If a private key was somehow leaked (through a backup, a misconfigured secret store, or a compromised system), rotating the key immediately invalidates the leaked key.

Second, compliance. Many security frameworks and compliance standards require regular cryptographic key rotation. SOC 2, PCI DSS, and NIST guidelines all recommend rotating keys on a defined schedule.

Third, reducing risk. The longer a key is in use, the more encrypted traffic is captured with that key. While WireGuard uses perfect forward secrecy for session keys, the static keys are used for authentication. Rotating them periodically is a defense-in-depth measure.

A reasonable rotation schedule for most environments is every 90 days. High-security environments might rotate monthly. At minimum, rotate keys whenever someone with access leaves the team.

## Planning the Rotation

Key rotation on WireGuard is not atomic. You need to update keys on multiple nodes, and during the transition, there will be a brief period where peers need to be updated. The key is to plan the rotation so you update all related nodes quickly and in the right order.

Here is the general approach:

1. Generate new key pairs for the nodes being rotated
2. Update the node's own configuration with the new private key
3. Update all peers that reference the node's public key
4. Verify connectivity after each change

For a cluster with N nodes in a full mesh, rotating one node's key requires updating N configurations (the node itself plus N-1 peers).

## Step-by-Step: Rotating a Single Node's Key

Let us walk through rotating the key for a single node (node1) in a three-node WireGuard mesh.

### Step 1: Generate a New Key Pair

```bash
# Generate the new key pair for node1
wg genkey | tee node1-new-private.key | wg pubkey > node1-new-public.key

echo "New private key: $(cat node1-new-private.key)"
echo "New public key: $(cat node1-new-public.key)"

# Keep the old public key for reference during the transition
echo "Old public key: $(cat node1-old-public.key)"
```

### Step 2: Update the Peers First

Update node2 and node3 to recognize node1's new public key. This order is important. If you update node1 first, it will have a new key that no peer recognizes, and all tunnels to node1 will break.

By updating the peers first, node1 continues to work with its old key while the peers are prepared for the new key. The brief disruption happens only when node1 switches to the new key.

```yaml
# Patch for node2: update node1's public key
# node2-peer-update.yaml
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          peers:
            # Updated public key for node1
            - publicKey: "NEW_NODE1_PUBLIC_KEY"
              endpoint: 192.168.1.1:51820
              allowedIPs:
                - 10.10.0.1/32
              persistentKeepalive: 25
            # Node3 stays the same
            - publicKey: "NODE3_PUBLIC_KEY"
              endpoint: 192.168.1.3:51820
              allowedIPs:
                - 10.10.0.3/32
              persistentKeepalive: 25
```

```bash
# Apply peer updates to node2 and node3
talosctl -n 192.168.1.2 patch machineconfig --patch-file node2-peer-update.yaml
talosctl -n 192.168.1.3 patch machineconfig --patch-file node3-peer-update.yaml
```

At this point, node2 and node3 are expecting node1's new public key. The tunnel to node1 will be temporarily down because node1 is still using the old key.

### Step 3: Update Node1's Private Key

Now update node1 with its new private key.

```yaml
# node1-key-update.yaml
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          # New private key
          privateKey: "NEW_NODE1_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "NODE2_PUBLIC_KEY"
              endpoint: 192.168.1.2:51820
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepalive: 25
            - publicKey: "NODE3_PUBLIC_KEY"
              endpoint: 192.168.1.3:51820
              allowedIPs:
                - 10.10.0.3/32
              persistentKeepalive: 25
```

```bash
talosctl -n 192.168.1.1 patch machineconfig --patch-file node1-key-update.yaml
```

### Step 4: Verify Connectivity

After updating node1, the tunnels should re-establish within seconds.

```bash
# Check handshake status from node1
talosctl -n 192.168.1.1 read /proc/net/wireguard

# Verify connectivity to both peers
talosctl -n 192.168.1.1 ping 10.10.0.2
talosctl -n 192.168.1.1 ping 10.10.0.3

# Check from the other side too
talosctl -n 192.168.1.2 read /proc/net/wireguard
```

## Rotating All Keys in a Cluster

When rotating all keys (for example, during a scheduled rotation), rotate one node at a time to avoid a complete network outage.

```bash
# Script to rotate keys for all nodes one at a time
NODES=("node1:192.168.1.1" "node2:192.168.1.2" "node3:192.168.1.3")

for entry in "${NODES[@]}"; do
  IFS=':' read -r name ip <<< "$entry"

  echo "Rotating key for ${name}..."

  # Generate new key pair
  wg genkey | tee "keys/${name}-new-private.key" | wg pubkey > "keys/${name}-new-public.key"

  # Update all peers first
  for peer_entry in "${NODES[@]}"; do
    IFS=':' read -r peer_name peer_ip <<< "$peer_entry"
    if [ "$peer_name" != "$name" ]; then
      echo "  Updating peer config on ${peer_name}..."
      # Generate and apply the peer update patch
      # (patch generation logic here)
      talosctl -n "$peer_ip" patch machineconfig --patch-file "patches/${peer_name}-update.yaml"
    fi
  done

  # Update the node's own key
  echo "  Updating ${name}'s private key..."
  talosctl -n "$ip" patch machineconfig --patch-file "patches/${name}-key-update.yaml"

  # Verify connectivity
  echo "  Verifying connectivity..."
  sleep 5
  talosctl -n "$ip" ping 10.10.0.1 -c 3

  echo "  ${name} key rotation complete."
  echo ""
done
```

## Pre-Shared Key Rotation

If you use pre-shared keys, rotate them along with the node keys. Both peers in a relationship need the new PSK applied simultaneously.

```bash
# Generate a new pre-shared key
wg genpsk > new-psk-node1-node2.key

# Apply the new PSK to both peers at the same time
# The tunnel will briefly drop during the update
```

```yaml
# Update PSK on both node1 and node2
# node1 patch:
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          peers:
            - publicKey: "NODE2_PUBLIC_KEY"
              presharedKey: "NEW_PSK_VALUE"
              endpoint: 192.168.1.2:51820
              allowedIPs:
                - 10.10.0.2/32
```

## Automating Key Rotation

For a fully automated rotation process, build a CI/CD pipeline that handles key generation, configuration updates, and verification.

```yaml
# .github/workflows/wireguard-key-rotation.yaml
name: WireGuard Key Rotation
on:
  schedule:
    # Run quarterly
    - cron: '0 2 1 */3 *'
  workflow_dispatch:

jobs:
  rotate-keys:
    runs-on: ubuntu-latest
    steps:
      - name: Install tools
        run: |
          sudo apt-get update
          sudo apt-get install -y wireguard-tools
          # Install talosctl
          curl -sL https://talos.dev/install | sh

      - name: Generate new keys
        run: |
          mkdir -p new-keys
          for node in node1 node2 node3; do
            wg genkey | tee "new-keys/${node}-private.key" | \
              wg pubkey > "new-keys/${node}-public.key"
          done

      - name: Rotate keys sequentially
        run: |
          # Rotation logic for each node
          # Update peers first, then the node itself
          # Verify after each rotation
          ./scripts/rotate-wireguard-keys.sh

      - name: Verify all tunnels
        run: |
          # Check that all tunnels are healthy
          ./scripts/verify-wireguard-health.sh

      - name: Store new keys in vault
        run: |
          # Update the secret store with new keys
          for node in node1 node2 node3; do
            vault kv put "secret/wireguard/${node}" \
              private_key="$(cat new-keys/${node}-private.key)" \
              public_key="$(cat new-keys/${node}-public.key)"
          done
```

## Securely Disposing of Old Keys

After rotation, securely delete the old key material.

```bash
# Securely delete old key files
shred -vfz -n 5 keys/node1-old-private.key
shred -vfz -n 5 keys/node2-old-private.key
shred -vfz -n 5 keys/node3-old-private.key

# Update the secret store to remove old keys
vault kv delete secret/wireguard/old-keys
```

## Conclusion

Rotating WireGuard keys on Talos Linux is a straightforward but important maintenance task. The process involves generating new keys, updating peers before updating the node, and verifying connectivity after each change. By rotating one node at a time, you minimize the disruption window. Automate the process through CI/CD for consistent execution, and store keys in a proper secret manager rather than files on disk. A regular rotation schedule of 90 days strikes a good balance between security and operational overhead for most environments.
