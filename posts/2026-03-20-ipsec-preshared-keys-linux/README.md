# How to Configure IPsec with Pre-Shared Keys on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, PSK, Pre-Shared Keys, strongSwan, Linux, VPN

Description: Configure IPsec VPN authentication using pre-shared keys (PSK) on Linux with strongSwan, including secure key generation and secrets file management.

Pre-shared keys (PSK) are the simplest authentication method for IPsec. Both sides of the tunnel share the same secret key. While less scalable than certificate-based auth, PSK is easier to configure for a small number of site-to-site tunnels.
The examples below use strongSwan's legacy `ipsec.conf` / `ipsec.secrets` files and the `ipsec` command. On strongSwan 6.x, this `stroke`-based workflow is deprecated and may not be installed by default; new deployments should prefer `swanctl.conf` and `swanctl`.

## Generating a Secure Pre-Shared Key

```bash
# Generate a strong PSK (32 random bytes is a good baseline)

openssl rand -base64 32
# Example output: lUkSbNdXaqYzehSg7/ppvCg6ndY7LjwZ6BGKuhRGJI0=

# Or use /dev/urandom
dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n'

# Store it securely - never use weak PSKs
```

## Configuring PSK in ipsec.secrets

The `ipsec.secrets` file holds authentication credentials:

```conf
# /etc/ipsec.secrets

# Format: [local_id remote_id] : PSK "secret"

# Simple form - any peer can authenticate with this PSK
: PSK "your-very-long-random-secret-here"

# Specific peer PSK (more secure)
@gateway-a @gateway-b : PSK "specific-tunnel-secret"

# Using IP addresses as identifiers
1.2.3.4 5.6.7.8 : PSK "ip-based-psk-secret"
```

```bash
# CRITICAL: Secure the secrets file
sudo chmod 600 /etc/ipsec.secrets
sudo chown root:root /etc/ipsec.secrets
```

## Connection Configuration with PSK

```conf
# /etc/ipsec.conf

conn psk-tunnel
    keyexchange=ikev2
    auto=start
    type=tunnel

    # Local gateway
    left=%defaultroute
    leftid=@my-gateway
    leftsubnet=10.1.0.0/24
    # Authenticate using PSK
    leftauth=psk

    # Remote gateway
    right=5.6.7.8
    rightid=@remote-gateway
    rightsubnet=10.2.0.0/24
    rightauth=psk

    # Crypto settings
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
```

## Multiple PSK Tunnels

For multiple site-to-site tunnels with different keys:

```conf
# /etc/ipsec.secrets

# Each tunnel can have its own PSK
@gateway-a @site-b : PSK "secret-for-site-b"
@gateway-a @site-c : PSK "secret-for-site-c"
@gateway-a @site-d : PSK "secret-for-site-d"
```

## Rotating PSKs

PSK rotation must be coordinated between both sides to avoid downtime:

```bash
# strongSwan can't keep two different PSKs for the same selector pair active
# in /etc/ipsec.secrets. Replace the PSK on both peers during a change window.
# Step 1: Update the PSK in ipsec.secrets on both peers
# Step 2: Reload the secrets on both peers
# Step 3: Re-establish the tunnel so it authenticates with the new PSK

# Reload secrets without full restart
sudo ipsec rereadsecrets

# Reconnect the tunnel if you want the new PSK used immediately
sudo ipsec down psk-tunnel
sudo ipsec up psk-tunnel
```

## Verifying PSK Authentication

```bash
# Bring up the tunnel
sudo ipsec up psk-tunnel

# Check detailed SA state
sudo ipsec statusall

# On systemd-based installs, inspect recent IKE logs
sudo journalctl -u strongswan -u strongswan-starter -n 50

# AUTH_FAILED usually means the PSK or peer ID selectors do not match.
# Check that the PSK matches on both sides exactly and that leftid/rightid
# match the selectors in /etc/ipsec.secrets.
```

## Best Practices for PSK Security

```bash
# 1. Use long, random keys (32+ characters)
openssl rand -base64 48

# 2. Use per-tunnel unique keys, not one shared PSK
# 3. Protect the secrets file (chmod 600)
# 4. Rotate PSKs annually or after any compromise
# 5. Use certificate authentication for production if possible
# 6. Monitor for authentication failures as they may indicate PSK exposure
sudo journalctl -u strongswan -u strongswan-starter | grep -Ei "AUTH_FAILED|authentication.*fail"
```

PSK authentication is a pragmatic choice for two-site tunnels, but move to certificate authentication when managing more than 5-10 tunnels or when compliance requires it.
