# How to Configure IPsec IPv6 with Pre-Shared Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, PSK, strongSwan, Authentication

Description: Learn how to configure IPv6 IPsec authentication using pre-shared keys (PSK) with strongSwan and best practices for PSK management and security.

## Overview

Pre-shared keys (PSK) are the simplest form of IPsec authentication: both peers share the same secret string, which is used to authenticate the IKEv2 exchange. PSK is suitable for small deployments with a limited number of tunnels. For large-scale deployments, certificate-based authentication is preferred.

## Generating a Strong PSK

```bash
# Generate a 256-bit (32-byte) random PSK

openssl rand -base64 32
# Example output: K7mX3pQnY9vL2wR8sT4uJ6hB1cE0fI5dG+N/oA==

# Or generate a hex PSK
openssl rand -hex 32
# Example: 4a8b3c2e1f9d7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b
```

PSK requirements:
- At least 256 bits of entropy from a cryptographically secure random generator
- Different PSK for each tunnel
- Store securely (password manager, secrets vault)

## strongSwan PSK Configuration

### Method 1: Inline PSK in swanctl.conf

```text
# /etc/swanctl/conf.d/vpn-psk.conf
connections {
    gw1-to-gw2 {
        version = 2
        local_addrs  = 2001:db8:1::1
        remote_addrs = 2001:db8:2::1

        local {
            auth = psk
            # Must match the peer's remote ID
            id = gw1.example.com
        }
        remote {
            auth = psk
            # Must match the peer's local ID
            id = gw2.example.com
        }

        children {
            site-tunnel {
                local_ts  = 2001:db8:100::/48
                remote_ts = 2001:db8:200::/48
                mode = tunnel
                esp_proposals = aes256gcm128-ecp256
                start_action = start
            }
        }

        proposals = aes256-sha256-ecp256
    }
}

secrets {
    ike-gw1-gw2 {
        id-1 = gw1.example.com
        id-2 = gw2.example.com
        secret = "K7mX3pQnY9vL2wR8sT4uJ6hB1cE0fI5dG+N/oA=="
    }
}
```

### Method 2: Separate Secrets File

```text
# Keep secrets in a separate file for security
chmod 600 /etc/swanctl/conf.d/secrets.conf

# /etc/swanctl/conf.d/secrets.conf
secrets {
    ike-gw1-gw2 {
        id-1 = gw1.example.com
        id-2 = gw2.example.com
        secret = "K7mX3pQnY9vL2wR8sT4uJ6hB1cE0fI5dG+N/oA=="
    }
    ike-gw1-gw3 {
        id-1 = gw1.example.com
        id-2 = gw3.example.com
        secret = "Different-PSK-For-Each-Tunnel-X9kL3mNpQ=="
    }
}
```

## Libreswan PSK Configuration

```text
# /etc/ipsec.secrets
@gw1.example.com @gw2.example.com : PSK "K7mX3pQnY9vL2wR8sT4uJ6hB1cE0fI5dG+N/oA=="

# IP-based PSK (alternative)
2001:db8:1::1 2001:db8:2::1 : PSK "K7mX3pQnY9vL2wR8sT4uJ6hB1cE0fI5dG+N/oA=="
```

## PSK Identity Matching

The PSK secret is selected by matching `id` values:

```text
Scenario: GW1 connects to GW2

GW1 sends:  IDi = gw1.example.com
GW2 looks up: Prefer the secret whose configured identities best match the
              local and remote IKE identities
              A secret listing both gw1.example.com and gw2.example.com is
              more specific than one listing only one identity

If no usable secret matches → AUTHENTICATION_FAILED
```

```bash
# Debugging PSK matching
# Enable cfg logging level 3 in strongswan.conf
# If file logging is enabled, watch for PSK selection and identity-matching messages
tail -f /var/log/charon.log | grep -i 'psk\|secret\|auth'
```

## PSK Security Considerations

### Risk: PSK Compromise

If a PSK is compromised, any attacker with the PSK can:
- Impersonate either gateway
- Establish unauthorized tunnels
- Mount active attacks against future connection attempts until the PSK is rotated

**Mitigation:** Use a unique, high-entropy PSK per tunnel and prefer certificate-based authentication where practical.

### PSK Rotation

```bash
# PSK rotation procedure:
# 1. Update the PSK on both peers for the same identity pair
# 2. Reload credentials on both peers
swanctl --load-creds

# 3. Reauthenticate the IKE SA from the initiator so the new PSK is used
# Rekey alone is not enough because IKEv2 rekeying does not run AUTH again
swanctl --rekey --ike gw1-to-gw2 --reauth

# 4. Verify the new SA established
swanctl --list-sas
```

### Using HashiCorp Vault for PSK Storage

```bash
# Store PSK in Vault
vault kv put secret/ipsec/gw1-gw2 psk="K7mX3pQnY9vL2wR8..."

# Retrieve at runtime via script
PSK=$(vault kv get -field=psk secret/ipsec/gw1-gw2)

# Generate swanctl secrets dynamically
cat > /etc/swanctl/conf.d/secrets-dynamic.conf << EOF
secrets {
    ike-gw1-gw2 {
        id-1 = gw1.example.com
        id-2 = gw2.example.com
        secret = "$PSK"
    }
}
EOF

swanctl --load-creds
```

## Summary

PSK authentication for IPv6 IPsec uses shared secrets referenced by identity (FQDN or IP). In strongSwan swanctl.conf, set `auth = psk` in local/remote blocks and define the secret in a `secrets{}` block with identities that match the peers' IKE IDs. Use separate PSK files with `chmod 600` for security. Generate PSKs with `openssl rand -base64 32` and use a unique PSK for each tunnel. For production, consider certificate authentication for scalability and rotate PSKs periodically by updating both peers, reloading credentials, and forcing reauthentication.
