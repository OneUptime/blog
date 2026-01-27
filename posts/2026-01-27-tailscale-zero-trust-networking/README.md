# How to Use Tailscale for Zero-Trust Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tailscale, Zero-Trust, VPN, Networking, Security

Description: Learn how to use Tailscale for zero-trust networking, including mesh VPN setup, ACLs, subnet routing, and integration with existing infrastructure.

---

> Traditional VPNs create a trusted perimeter, but modern security demands verification at every access point. Tailscale implements zero-trust principles through identity-based authentication, encrypted point-to-point connections, and granular access controls - all without the complexity of traditional VPN infrastructure.

Tailscale is a mesh VPN built on WireGuard that makes secure networking simple. Instead of routing all traffic through a central gateway, Tailscale creates direct encrypted connections between devices. This guide covers everything from basic setup to enterprise deployment patterns.

---

## What is Zero-Trust Networking?

Zero-trust networking operates on the principle of "never trust, always verify." Unlike traditional perimeter-based security, zero-trust:

- Verifies every user and device before granting access
- Enforces least-privilege access controls
- Encrypts all traffic, even within the network
- Continuously validates trust throughout a session

Tailscale implements these principles by:
- Authenticating users through identity providers (Google, Okta, Azure AD)
- Creating encrypted WireGuard tunnels between authorized devices
- Enforcing access control lists (ACLs) at the network level
- Providing audit logs for all connection attempts

---

## Installation and Device Onboarding

### Installing Tailscale

Tailscale supports all major platforms. Install using your package manager:

```bash
# Ubuntu/Debian - add repository and install
curl -fsSL https://tailscale.com/install.sh | sh

# macOS - use Homebrew
brew install --cask tailscale

# Windows - download from tailscale.com or use winget
winget install tailscale.tailscale

# Docker - run as a container with network privileges
docker run -d --name=tailscale \
  --cap-add=NET_ADMIN \
  --cap-add=NET_RAW \
  -v /var/lib/tailscale:/var/lib/tailscale \
  -v /dev/net/tun:/dev/net/tun \
  tailscale/tailscale
```

### Authenticating Devices

After installation, authenticate your device to join your tailnet:

```bash
# Basic authentication - opens browser for login
sudo tailscale up

# Authenticate with specific options
sudo tailscale up --advertise-tags=tag:server --hostname=prod-api-1

# Check connection status
tailscale status

# View your device's Tailscale IP
tailscale ip -4
```

### Headless Server Authentication

For servers without a browser, use authentication keys:

```bash
# Generate an auth key in the Tailscale admin console, then:
sudo tailscale up --authkey=tskey-auth-xxxxx --hostname=db-server-1

# For ephemeral nodes that auto-cleanup when offline
sudo tailscale up --authkey=tskey-auth-xxxxx --hostname=ci-runner
```

Auth keys can be configured as:
- **Reusable**: Allow multiple devices to authenticate
- **Ephemeral**: Devices auto-remove when offline
- **Pre-authorized**: Skip admin approval for new devices

---

## MagicDNS for Service Discovery

MagicDNS automatically assigns DNS names to all devices in your tailnet, eliminating the need to track IP addresses.

### How MagicDNS Works

Every device gets a DNS name based on its hostname:

```bash
# Instead of remembering IPs, use hostnames
ssh user@prod-api-1

# Access services directly
curl http://backend-service:8080/health

# Full domain format: hostname.tailnet-name.ts.net
ping prod-db.example-corp.ts.net
```

### Configuring DNS in Tailscale Admin

Enable MagicDNS in the admin console under DNS settings:

```json
// Example DNS configuration in tailscale admin
{
  "magicDNS": true,
  "nameservers": [
    "8.8.8.8",
    "8.8.4.4"
  ],
  "searchDomains": ["example-corp.ts.net"],
  "splitDNS": {
    "internal.example.com": ["10.0.0.53"]
  }
}
```

### Split DNS for Hybrid Environments

Route internal DNS queries to your corporate DNS servers:

```bash
# Queries to internal.example.com go to corporate DNS
# All other queries use public DNS
# Configure in admin console under DNS > Nameservers
```

---

## Access Control Lists (ACLs)

ACLs define who can access what within your tailnet. They use a declarative JSON format.

### Basic ACL Structure

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:dev-servers:*"]
    },
    {
      "action": "accept",
      "src": ["group:ops"],
      "dst": ["*:*"]
    }
  ],
  "groups": {
    "group:developers": ["user1@example.com", "user2@example.com"],
    "group:ops": ["admin@example.com"]
  },
  "tagOwners": {
    "tag:dev-servers": ["group:ops"],
    "tag:prod-servers": ["group:ops"],
    "tag:databases": ["group:ops"]
  }
}
```

### Port-Based Access Control

Restrict access to specific ports:

```json
{
  "acls": [
    {
      // Developers can SSH to dev servers
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:dev-servers:22"]
    },
    {
      // Web traffic to production
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:prod-servers:80,443"]
    },
    {
      // Database access for backend services only
      "action": "accept",
      "src": ["tag:backend"],
      "dst": ["tag:databases:5432,3306"]
    }
  ]
}
```

### Using Tags for Service Identity

Tags identify machine roles independent of users:

```bash
# Register a server with tags
sudo tailscale up --advertise-tags=tag:backend,tag:prod-servers

# Tags must be defined in tagOwners to be used
```

```json
{
  "tagOwners": {
    "tag:backend": ["group:ops"],
    "tag:frontend": ["group:ops"],
    "tag:databases": ["group:ops", "group:dba"],
    "tag:prod-servers": ["group:ops"],
    "tag:dev-servers": ["group:ops", "group:developers"]
  }
}
```

### ACL Tests

Validate your ACLs with built-in tests:

```json
{
  "tests": [
    {
      "src": "user1@example.com",
      "accept": ["tag:dev-servers:22"],
      "deny": ["tag:prod-servers:22"]
    },
    {
      "src": "tag:backend",
      "accept": ["tag:databases:5432"],
      "deny": ["tag:databases:22"]
    }
  ]
}
```

---

## Subnet Routing

Subnet routers expose entire network ranges to your tailnet, enabling access to resources that cannot run Tailscale directly.

### Setting Up a Subnet Router

```bash
# On the subnet router machine, enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# Advertise the subnet
sudo tailscale up --advertise-routes=10.0.0.0/24,192.168.1.0/24

# Approve routes in admin console or via CLI
# Then enable on client devices
tailscale up --accept-routes
```

### High Availability Subnet Routing

Run multiple subnet routers for redundancy:

```bash
# Router 1 - Primary
sudo tailscale up --advertise-routes=10.0.0.0/24 --hostname=subnet-router-1

# Router 2 - Secondary
sudo tailscale up --advertise-routes=10.0.0.0/24 --hostname=subnet-router-2

# Tailscale automatically fails over if one router goes offline
```

### ACLs for Subnet Access

Control who can reach advertised subnets:

```json
{
  "acls": [
    {
      // Only ops can access the entire subnet
      "action": "accept",
      "src": ["group:ops"],
      "dst": ["10.0.0.0/24:*"]
    },
    {
      // Developers can access specific hosts on the subnet
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["10.0.0.50:22", "10.0.0.51:22"]
    }
  ],
  "autoApprovers": {
    "routes": {
      "10.0.0.0/24": ["tag:subnet-routers"]
    }
  }
}
```

---

## Exit Nodes

Exit nodes route all internet traffic through a specific device, useful for secure browsing on untrusted networks.

### Configuring an Exit Node

```bash
# On the exit node server
sudo tailscale up --advertise-exit-node

# Approve the exit node in admin console

# On client devices, use the exit node
tailscale up --exit-node=exit-server
tailscale up --exit-node=exit-server --exit-node-allow-lan-access

# Disable exit node
tailscale up --exit-node=
```

### Exit Node Selection by Region

Deploy exit nodes in multiple regions for performance:

```bash
# Exit nodes automatically show their location
tailscale exit-node list

# Users can select by hostname or let Tailscale suggest the best one
tailscale up --exit-node=exit-us-east
tailscale up --exit-node=exit-eu-west
```

### ACLs for Exit Nodes

Control who can use exit nodes:

```json
{
  "acls": [
    {
      // Allow specific groups to use exit nodes
      "action": "accept",
      "src": ["group:remote-workers"],
      "dst": ["autogroup:internet:*"]
    }
  ],
  "autoApprovers": {
    "exitNode": ["tag:exit-nodes"]
  }
}
```

---

## Tailscale SSH

Tailscale SSH replaces traditional SSH key management with identity-based authentication.

### Enabling Tailscale SSH

```bash
# On the server, enable Tailscale SSH
sudo tailscale up --ssh

# Connect from any tailnet device without SSH keys
ssh user@server-hostname

# Tailscale handles authentication via your identity provider
```

### SSH ACLs

Define who can SSH to which servers:

```json
{
  "ssh": [
    {
      // Developers can SSH to dev servers as their own user
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:dev-servers"],
      "users": ["autogroup:nonroot"]
    },
    {
      // Ops can SSH to all servers as root
      "action": "accept",
      "src": ["group:ops"],
      "dst": ["tag:servers"],
      "users": ["root", "autogroup:nonroot"]
    },
    {
      // Require check mode for production
      "action": "check",
      "src": ["group:developers"],
      "dst": ["tag:prod-servers"],
      "users": ["autogroup:nonroot"]
    }
  ]
}
```

### Session Recording

Enable session recording for compliance:

```json
{
  "ssh": [
    {
      "action": "accept",
      "src": ["group:ops"],
      "dst": ["tag:prod-servers"],
      "users": ["root"],
      "recorder": ["tag:session-recorders"]
    }
  ]
}
```

---

## Integration with Identity Providers

Tailscale integrates with major identity providers for user authentication and group sync.

### Supported Identity Providers

- Google Workspace
- Microsoft Azure AD / Entra ID
- Okta
- OneLogin
- GitHub
- OIDC-compatible providers

### Configuring OIDC Integration

```json
// Example OIDC configuration in admin console
{
  "oidc": {
    "issuer": "https://auth.example.com",
    "clientId": "tailscale-client-id",
    "clientSecret": "your-client-secret"
  }
}
```

### Group Sync

Automatically sync groups from your identity provider:

```json
{
  "groups": {
    // Groups prefixed with 'group:' sync from IdP
    "group:engineering": [],
    "group:security": [],

    // Or define manually
    "group:contractors": ["contractor1@example.com"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["group:engineering"],
      "dst": ["tag:dev-servers:*"]
    }
  ]
}
```

### SCIM Provisioning

Enable SCIM for automatic user provisioning:

```bash
# Users added/removed in IdP are automatically synced to Tailscale
# Configure SCIM endpoint in your IdP:
# Endpoint: https://api.tailscale.com/api/v2/tailnet/{tailnet}/scim/v2
# Bearer token: Generate in Tailscale admin console
```

---

## Monitoring and Logging

### Network Logs

Tailscale provides detailed logs for all connection attempts:

```bash
# View local logs
journalctl -u tailscaled -f

# Network logs available in admin console
# Export to SIEM via API
```

### Configuration Audit Logs

Track all changes to your tailnet configuration:

```json
// Audit log entry example
{
  "timestamp": "2026-01-27T10:30:00Z",
  "actor": "admin@example.com",
  "action": "acl.update",
  "details": {
    "changes": ["Added group:contractors to ACL"]
  }
}
```

### Metrics and Monitoring

Export metrics for observability:

```bash
# Prometheus metrics endpoint
curl http://localhost:41112/metrics

# Key metrics to monitor:
# - tailscale_connected_peers: Number of connected devices
# - tailscale_inbound_bytes_total: Traffic received
# - tailscale_outbound_bytes_total: Traffic sent
```

### Integration with OneUptime

Monitor your Tailscale infrastructure with OneUptime:

```bash
# Create a synthetic monitor for critical services
# Example: Monitor connectivity to production database

# Use OneUptime's API to create alerts based on
# Tailscale connection status or ACL violations
```

---

## Best Practices for Enterprise

### 1. Use Tags for Machine Identity

```json
{
  "tagOwners": {
    "tag:production": ["group:ops"],
    "tag:staging": ["group:ops", "group:developers"],
    "tag:ci-cd": ["group:ops"]
  }
}
```

Tags provide:
- Consistent identity across machine reinstalls
- Clear separation of environments
- Simplified ACL management

### 2. Implement Least-Privilege Access

```json
{
  "acls": [
    // Default deny - only allow what is explicitly needed
    {
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:dev-servers:22,80,443"]
    },
    // Production access requires ops group membership
    {
      "action": "accept",
      "src": ["group:ops"],
      "dst": ["tag:production:*"]
    }
  ]
}
```

### 3. Enable MFA Through Your Identity Provider

Configure your IdP to require MFA for Tailscale authentication:

```bash
# In your IdP (Okta, Azure AD, etc.):
# - Create a conditional access policy for Tailscale app
# - Require MFA for all users
# - Consider requiring managed devices for production access
```

### 4. Use Ephemeral Nodes for CI/CD

```bash
# CI/CD runners should use ephemeral auth keys
sudo tailscale up --authkey=tskey-auth-xxxxx-ephemeral

# Nodes auto-remove when they disconnect
# Prevents stale entries in your device list
```

### 5. Segment Networks with Multiple Tailnets

For large organizations:
- Separate tailnets for production vs development
- Use subnet routers for cross-tailnet communication
- Apply different security policies per tailnet

### 6. Regular ACL Audits

```json
{
  "tests": [
    // Test that contractors cannot access production
    {
      "src": "group:contractors",
      "deny": ["tag:production:*"]
    },
    // Test that developers can access their tools
    {
      "src": "group:developers",
      "accept": ["tag:dev-servers:22"]
    }
  ]
}
```

### 7. Document Your Network Topology

Maintain documentation of:
- All subnet routers and their advertised routes
- Exit node locations and purposes
- Tag ownership and meanings
- ACL change procedures

---

## Summary

Tailscale provides a practical path to zero-trust networking:

| Feature | Benefit |
|---------|---------|
| Identity-based auth | No SSH keys or VPN credentials to manage |
| ACLs | Granular, verifiable access control |
| MagicDNS | Simple service discovery |
| Subnet routing | Connect legacy infrastructure |
| Exit nodes | Secure browsing on untrusted networks |
| Tailscale SSH | Replace SSH key management |
| IdP integration | Centralized user lifecycle management |

Key takeaways:
- Start with basic device onboarding and iterate on ACLs
- Use tags to separate machine identity from user identity
- Leverage your existing identity provider for authentication
- Monitor connections and audit ACL changes
- Apply least-privilege principles from the start

Zero-trust networking with Tailscale removes the complexity of traditional VPNs while improving security through continuous verification and encryption.

---

*Need to monitor your Tailscale-connected infrastructure? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for services across your tailnet, with alerts for connectivity issues and performance degradation. Start monitoring your zero-trust network today.*
