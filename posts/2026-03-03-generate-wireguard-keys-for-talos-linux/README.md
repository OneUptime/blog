# How to Generate WireGuard Keys for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Security, Cryptography

Description: A complete guide to generating, managing, and securing WireGuard keys for use with Talos Linux clusters and encrypted networking.

---

Every WireGuard connection starts with a key pair. Before you can configure any WireGuard interface on your Talos Linux nodes, you need to generate private and public keys for each participant in the network. While the key generation itself is simple, doing it correctly and securely matters a lot because these keys are the foundation of your encrypted communication.

This post covers how to generate WireGuard keys for Talos Linux, different approaches for managing keys at scale, and best practices for keeping them secure.

## WireGuard Cryptography Basics

WireGuard uses Curve25519 for key exchange. Each participant has a private key (32 bytes, base64-encoded) and a corresponding public key derived from it. The private key is kept secret and never shared. The public key is distributed to peers that need to communicate with this node.

Unlike TLS certificates, WireGuard keys do not expire and there is no certificate authority involved. The trust model is simpler but also means you need to manage key distribution and rotation yourself.

## Generating Keys with the wg Tool

The standard way to generate WireGuard keys is with the `wg` command-line tool, which is part of the wireguard-tools package.

```bash
# Install wireguard-tools on your workstation
# On Ubuntu/Debian
sudo apt install wireguard-tools

# On macOS with Homebrew
brew install wireguard-tools

# On Fedora/RHEL
sudo dnf install wireguard-tools
```

Once installed, generating a key pair is a two-step process:

```bash
# Step 1: Generate a private key
wg genkey
# Output: oK3Hs7g2LmQ9V8xN2pDrF5tW1yA0jBk6cZ4sE9nUmI=

# Step 2: Derive the public key from the private key
echo "oK3Hs7g2LmQ9V8xN2pDrF5tW1yA0jBk6cZ4sE9nUmI=" | wg pubkey
# Output: YH7Bs3gPLqM2W4kR8vF1dT5nX0yC6jAm9eZ2sG7hUoE=
```

For scripting, you can pipe the commands together and save to files:

```bash
# Generate a key pair and save to files
wg genkey | tee private.key | wg pubkey > public.key

# View the generated keys
echo "Private key: $(cat private.key)"
echo "Public key: $(cat public.key)"
```

## Generating Keys for Multiple Nodes

When setting up WireGuard across a Talos cluster, you need a key pair for every node. A simple loop makes this manageable.

```bash
# Create a directory for the keys
mkdir -p wireguard-keys

# Generate keys for each node in the cluster
NODES=("cp1" "cp2" "cp3" "worker1" "worker2" "worker3" "worker4" "worker5")

for node in "${NODES[@]}"; do
  wg genkey | tee "wireguard-keys/${node}-private.key" | \
    wg pubkey > "wireguard-keys/${node}-public.key"
  echo "Generated keys for ${node}"
done

# Display all public keys for reference
echo ""
echo "Public keys for peer configuration:"
for node in "${NODES[@]}"; do
  echo "  ${node}: $(cat wireguard-keys/${node}-public.key)"
done
```

This creates a directory with private and public key files for each node. You will reference these when building your Talos machine configuration patches.

## Generating Pre-Shared Keys

WireGuard supports an optional pre-shared key (PSK) for each peer relationship. The PSK adds a layer of symmetric encryption on top of the Curve25519 key exchange. This provides defense against potential future quantum computing attacks on the asymmetric key exchange.

```bash
# Generate a pre-shared key for a peer relationship
wg genpsk
# Output: 3J7Ks9g4NnP2V6xM1pBrE8tR0yZ5jCk7dW3sA2hFmU=

# Generate PSKs for all peer combinations
# For a 3-node setup: cp1-cp2, cp1-cp3, cp2-cp3
wg genpsk > wireguard-keys/psk-cp1-cp2.key
wg genpsk > wireguard-keys/psk-cp1-cp3.key
wg genpsk > wireguard-keys/psk-cp2-cp3.key
```

To use a pre-shared key in the Talos configuration:

```yaml
# Talos machine config with pre-shared key
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "NODE_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "PEER_PUBLIC_KEY"
              # Pre-shared key for additional security
              presharedKey: "3J7Ks9g4NnP2V6xM1pBrE8tR0yZ5jCk7dW3sA2hFmU="
              endpoint: 192.168.1.2:51820
              allowedIPs:
                - 10.10.0.2/32
```

## Generating Keys Without wg Tools

If you do not have wireguard-tools installed and do not want to install it, you can generate keys using standard Unix tools. WireGuard private keys are just 32 random bytes, base64-encoded, with the key clamped for Curve25519.

```bash
# Generate a private key using /dev/urandom
# This produces a valid Curve25519 private key
openssl rand -base64 32

# However, this does NOT clamp the key properly
# For correct Curve25519 clamping, use Python
python3 -c "
import os, base64
key = bytearray(os.urandom(32))
# Clamp the key for Curve25519
key[0] &= 248
key[31] &= 127
key[31] |= 64
print(base64.b64encode(bytes(key)).decode())
"
```

For the public key derivation, you need a Curve25519 implementation. The simplest approach is to use the `wg` tool, but if that is not available:

```bash
# Generate both keys using Python
python3 -c "
import subprocess
import base64
import os

# Generate private key
private_key = bytearray(os.urandom(32))
private_key[0] &= 248
private_key[31] &= 127
private_key[31] |= 64
private_b64 = base64.b64encode(bytes(private_key)).decode()

print(f'Private key: {private_b64}')

# For the public key, you need a Curve25519 library
# pip install cryptography
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import serialization

priv = X25519PrivateKey.from_private_bytes(bytes(private_key))
pub = priv.public_key()
pub_bytes = pub.public_bytes(
    serialization.Encoding.Raw,
    serialization.PublicFormat.Raw
)
pub_b64 = base64.b64encode(pub_bytes).decode()
print(f'Public key: {pub_b64}')
"
```

Using the `wg` tool is strongly recommended over these alternatives because it handles all the details correctly.

## Storing Keys Securely

WireGuard private keys grant access to the encrypted network. Treat them like SSH private keys or TLS certificates.

### Using a Secret Manager

For production environments, store WireGuard keys in a secret manager rather than plain text files.

```bash
# Store a private key in HashiCorp Vault
vault kv put secret/wireguard/node1 \
  private_key="$(cat wireguard-keys/node1-private.key)"

# Retrieve the key when generating Talos configs
PRIVATE_KEY=$(vault kv get -field=private_key secret/wireguard/node1)
```

### Using SOPS for Encrypted Files

If you manage your configurations in Git, use SOPS to encrypt the key files.

```bash
# Encrypt a key file with SOPS
sops --encrypt --age "age1..." wireguard-keys/node1-private.key > wireguard-keys/node1-private.key.enc

# Decrypt when needed
sops --decrypt wireguard-keys/node1-private.key.enc > wireguard-keys/node1-private.key
```

### File Permissions

At minimum, restrict file permissions on private key files:

```bash
# Set restrictive permissions on private keys
chmod 600 wireguard-keys/*-private.key

# Verify permissions
ls -la wireguard-keys/
# Should show -rw------- for private keys
```

## Building Talos Config Patches from Generated Keys

Once you have all the keys, you can script the generation of Talos configuration patches.

```bash
# Script to generate Talos WireGuard patches for all nodes
# This creates a patch file for each node with all peers configured

NODES=("cp1:10.10.0.1:192.168.1.1" "cp2:10.10.0.2:192.168.1.2" "worker1:10.10.0.3:192.168.1.3")

for entry in "${NODES[@]}"; do
  IFS=':' read -r name wg_ip real_ip <<< "$entry"
  PRIVATE_KEY=$(cat "wireguard-keys/${name}-private.key")

  # Start building the patch file
  cat > "wireguard-patches/${name}-patch.yaml" <<PATCH
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - ${wg_ip}/24
        wireguard:
          privateKey: "${PRIVATE_KEY}"
          listenPort: 51820
          peers:
PATCH

  # Add all other nodes as peers
  for peer_entry in "${NODES[@]}"; do
    IFS=':' read -r peer_name peer_wg_ip peer_real_ip <<< "$peer_entry"
    if [ "$peer_name" != "$name" ]; then
      PEER_PUBLIC=$(cat "wireguard-keys/${peer_name}-public.key")
      cat >> "wireguard-patches/${name}-patch.yaml" <<PEER
            - publicKey: "${PEER_PUBLIC}"
              endpoint: ${peer_real_ip}:51820
              allowedIPs:
                - ${peer_wg_ip}/32
              persistentKeepalive: 25
PEER
    fi
  done

  echo "Generated patch for ${name}"
done
```

## Key Validation

Before applying configurations, validate that your keys are correctly formatted.

```bash
# A valid WireGuard key is exactly 44 characters of base64 (32 bytes)
validate_key() {
  local key=$1
  if [ ${#key} -eq 44 ] && echo "$key" | base64 -d > /dev/null 2>&1; then
    echo "Valid key"
  else
    echo "Invalid key format"
  fi
}

# Validate all generated keys
for keyfile in wireguard-keys/*.key; do
  key=$(cat "$keyfile")
  echo -n "$(basename $keyfile): "
  validate_key "$key"
done
```

## Conclusion

Generating WireGuard keys for Talos Linux is straightforward, but managing them correctly requires discipline. Use the `wg` tool for key generation, store private keys in a secret manager or encrypted files, script the process for clusters with many nodes, and validate keys before applying configurations. With a solid key management process in place, setting up WireGuard on your Talos cluster becomes a repeatable and secure operation.
