# How to Set Up Tailscale VPN on Ubuntu for Zero-Config Networking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Tailscale, Networking, WireGuard

Description: Install and configure Tailscale on Ubuntu to create a zero-configuration mesh VPN between your devices using WireGuard under the hood.

---

Tailscale is a mesh VPN built on top of WireGuard that eliminates most of the manual configuration that traditional VPNs require. Instead of managing certificates, keys, and routing rules yourself, Tailscale handles peer discovery, NAT traversal, key rotation, and access control through a coordination server. You install the client, log in, and your devices can immediately reach each other.

This guide covers setting up Tailscale on Ubuntu, configuring it as a subnet router or exit node, and using the key admin features.

## What Tailscale Does Differently

Traditional VPNs route all traffic through a central server. Tailscale creates a mesh network where devices connect directly to each other (peer-to-peer) when possible, falling back to relay servers (DERP servers) when direct connections aren't possible. This means:

- No single point of failure for routing
- Lower latency between peers that can connect directly
- No central server bandwidth bottleneck for peer-to-peer traffic
- NAT traversal happens automatically

## Installing Tailscale on Ubuntu

```bash
# Add Tailscale's repository and install
curl -fsSL https://tailscale.com/install.sh | sh

# Alternatively, add the repository manually
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null

curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list

sudo apt update
sudo apt install tailscale

# Verify installation
tailscale version
```

## Authenticating and Connecting

```bash
# Start Tailscale and authenticate
sudo tailscale up

# This outputs a URL - open it in a browser to authenticate
# Example output:
# To authenticate, visit:
#    https://login.tailscale.com/a/xxxxxxxxx
```

After authentication, the device appears in your Tailscale admin console at `admin.tailscale.com`.

```bash
# Check connection status
tailscale status

# Get your device's Tailscale IP address
tailscale ip -4

# Check if you can reach another device
ping 100.x.x.x   # Use the Tailscale IP of another device
```

## Managing Tailscale as a Service

Tailscale runs as a systemd service:

```bash
# Check service status
sudo systemctl status tailscaled

# The service starts automatically with the OS
sudo systemctl is-enabled tailscaled

# Restart Tailscale
sudo systemctl restart tailscaled

# View logs
sudo journalctl -u tailscaled -f
```

## Connecting Without Interactive Authentication (Headless)

For servers or CI environments where you can't open a browser:

### Method 1: Auth Keys

Generate an auth key from the Tailscale admin console:

1. Go to admin.tailscale.com
2. Navigate to Settings > Keys
3. Click "Generate auth key"
4. Choose one-time or reusable, expiry, and tags
5. Copy the key

```bash
# Authenticate using an auth key (non-interactive)
sudo tailscale up --authkey=tskey-auth-xxxxxxxxxxxxxxxxx

# Authenticate and set device tags
sudo tailscale up --authkey=tskey-auth-xxx --advertise-tags=tag:server

# For ephemeral nodes (removed from admin when offline)
sudo tailscale up --authkey=tskey-auth-xxx --ephemeral
```

### Method 2: OAuth Clients

For automation pipelines, OAuth clients provide more control than auth keys.

## Setting Up a Subnet Router

A subnet router allows other Tailscale devices to reach subnets that are physically connected to the Ubuntu machine, without needing Tailscale installed on every device in those subnets.

```bash
# Enable IP forwarding (required for subnet routing)
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# Advertise a subnet route
# Replace with your actual subnet
sudo tailscale up --advertise-routes=192.168.1.0/24

# Verify the route advertisement
tailscale status
```

Then in the Tailscale admin console, approve the subnet route for that device (Machines > select machine > Edit route settings > Enable routes).

After approval, other devices on your Tailscale network can reach `192.168.1.x` addresses through this router.

## Setting Up an Exit Node

An exit node routes all internet traffic from other Tailscale devices through itself. This is useful for accessing geo-restricted content or protecting traffic on public networks.

```bash
# Configure this Ubuntu machine as an exit node
sudo tailscale up --advertise-exit-node

# Combined with subnet routing
sudo tailscale up --advertise-routes=192.168.1.0/24 --advertise-exit-node
```

Approve the exit node in the admin console (Machines > select machine > Edit route settings > Use as exit node).

On a client device that wants to use this exit node:

```bash
# Use the Ubuntu server as an exit node
# Get the exit node's Tailscale IP first
tailscale status | grep server-hostname

sudo tailscale up --exit-node=100.x.x.x    # The server's Tailscale IP

# Or by hostname
sudo tailscale up --exit-node=ubuntu-server

# Verify all traffic goes through the exit node
curl ifconfig.me   # Should show the Ubuntu server's IP
```

## MagicDNS

Tailscale's MagicDNS feature assigns DNS names to devices. Each device gets a name like `machine-name.tailnet-name.ts.net`.

```bash
# Check your device's DNS name
tailscale status --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Self']['DNSName'])"

# Ping by hostname instead of IP
ping ubuntu-server

# SSH by hostname
ssh user@ubuntu-server
```

MagicDNS is enabled by default in new Tailscale accounts. You can manage it in admin.tailscale.com > DNS.

## Access Control Lists (ACL)

Tailscale uses a JSON-based ACL policy to control which devices can talk to which others. Edit this in the admin console under Access Controls.

Example ACL that allows all devices to communicate:

```json
{
  "acls": [
    {"action": "accept", "src": ["*"], "dst": ["*:*"]}
  ]
}
```

A more restrictive example - servers can only be accessed from the admin group:

```json
{
  "groups": {
    "group:admins": ["alice@example.com", "bob@example.com"]
  },
  "tagOwners": {
    "tag:server": ["group:admins"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["group:admins"],
      "dst": ["tag:server:22", "tag:server:80", "tag:server:443"]
    }
  ]
}
```

Apply tags to devices when authenticating:

```bash
sudo tailscale up --authkey=tskey-auth-xxx --advertise-tags=tag:server
```

## Checking Connection Quality

```bash
# View status of all peers
tailscale status

# Get detailed information including connection type (direct vs relay)
tailscale status --json | python3 -m json.tool

# Check if you're connecting directly or through a relay
tailscale ping 100.x.x.x

# Example output:
# pong from device-name (100.x.x.x) via DERP(nyc) in 45ms    <- relay
# pong from device-name (100.x.x.x) via 192.168.1.x:41641 in 2ms  <- direct
```

A direct connection shows the actual IP and port. A relay connection shows `DERP(region)`. For devices on the same local network, Tailscale automatically uses direct connections.

## SSH Through Tailscale

Tailscale can manage SSH access to your devices, replacing traditional SSH key management:

```bash
# Enable Tailscale SSH on this device
sudo tailscale up --ssh

# Now other Tailscale devices can SSH in using:
ssh user@ubuntu-server    # No password needed if ACLs allow it

# The connection is authenticated by Tailscale identity
# And the connection is encrypted by WireGuard
```

Configure which users can SSH in through the admin console ACLs:

```json
{
  "ssh": [
    {
      "action": "accept",
      "src": ["group:admins"],
      "dst": ["tag:server"],
      "users": ["ubuntu", "root"]
    }
  ]
}
```

## Removing a Device

```bash
# Disconnect from Tailscale
sudo tailscale down

# Log out and remove from the network
sudo tailscale logout

# Remove from the admin console
# admin.tailscale.com > Machines > select machine > Remove
```

## Useful Tailscale Commands

```bash
# Show current status
tailscale status

# Show your Tailscale IP
tailscale ip

# Show version
tailscale version

# Ping a peer to test connectivity
tailscale ping hostname-or-ip

# Show network interface status
tailscale debug interfaces

# Force re-authentication
sudo tailscale up --force-reauth

# Debug connection issues
tailscale bugreport
```

Tailscale removes most of the complexity of running a VPN. The tradeoff is that the control plane runs through Tailscale's servers, which some organizations can't accept. For those cases, Headscale is an open-source implementation of the Tailscale control server that you can self-host. The client configuration for Headscale is nearly identical to regular Tailscale.
