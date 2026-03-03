# How to Configure Firezone VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, WireGuard, Security, Authentication

Description: Step-by-step guide to deploying and configuring Firezone VPN on Ubuntu, including OIDC authentication integration and user management via the web portal.

---

Firezone is a WireGuard-based VPN management platform that combines a web portal for user self-service with enterprise-grade authentication options. Users log in through the portal with their existing SSO credentials (Google Workspace, Okta, Azure AD) and self-provision their own VPN configuration. IT teams get a central view of who has access and can revoke it instantly.

This guide installs Firezone on Ubuntu using the official installer, configures authentication, and walks through daily operations.

## Prerequisites

- Ubuntu 20.04 or 22.04
- 1 CPU core, 1 GB RAM minimum (2 GB recommended)
- A domain name pointing to your server
- Ports 80, 443, and 51820 (UDP) open
- Root access

## Installing Firezone

Firezone uses an omnibus package (similar to GitLab's approach - all dependencies bundled):

```bash
# Download and run the installer
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/firezone/firezone/legacy/scripts/install.sh)"
```

The installer will:
- Install WireGuard
- Configure PostgreSQL for Firezone's data
- Set up Nginx with a self-signed certificate
- Generate random secrets and admin credentials
- Start the Firezone systemd service

At the end, the installer displays the admin email and password - save these.

## Configuring SSL with Let's Encrypt

Replace the self-signed certificate with a real one:

```bash
# Edit the Firezone configuration
sudo nano /etc/firezone/firezone.rb
```

Update these settings:

```ruby
# Set your actual domain
default['firezone']['fqdn'] = 'vpn.yourdomain.com'

# Enable ACME (Let's Encrypt)
default['firezone']['ssl']['certificate_file'] = nil
default['firezone']['ssl']['certificate_key_file'] = nil
default['firezone']['ssl']['acme']['enabled'] = true
default['firezone']['ssl']['acme']['email'] = 'admin@yourdomain.com'
```

Apply the configuration:

```bash
sudo firezone-ctl reconfigure
```

## Firewall Setup

```bash
# Allow HTTPS for the web portal
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Allow WireGuard
sudo ufw allow 51820/udp

sudo ufw enable
```

## First Login and Initial Setup

Access the portal at `https://vpn.yourdomain.com` and log in with the credentials shown after installation.

Navigate to Settings > Security to:
1. Change the admin password
2. Configure allowed CIDR ranges
3. Set session timeout

Under Devices, you see all registered VPN configurations.

## Configuring OIDC for Single Sign-On

Firezone supports OpenID Connect providers. Here is the setup for Google Workspace:

**In Google Cloud Console:**
1. Create an OAuth 2.0 Client ID (Web application type)
2. Add `https://vpn.yourdomain.com/auth/oidc/google/callback` as an authorized redirect URI
3. Note the Client ID and Client Secret

**In Firezone configuration:**

```bash
sudo nano /etc/firezone/firezone.rb
```

```ruby
# Google Workspace OIDC configuration
default['firezone']['authentication']['oidc'] = {
  google: {
    discovery_document_uri: 'https://accounts.google.com/.well-known/openid-configuration',
    client_id: 'your-client-id.apps.googleusercontent.com',
    client_secret: 'your-client-secret',
    redirect_uri: 'https://vpn.yourdomain.com/auth/oidc/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    label: 'Google Workspace'
  }
}
```

Apply changes:

```bash
sudo firezone-ctl reconfigure
```

Users can now sign in with their Google account. On first login, Firezone creates a user account and they can self-provision a VPN device.

## Configuring Okta OIDC

```ruby
default['firezone']['authentication']['oidc'] = {
  okta: {
    discovery_document_uri: 'https://your-org.okta.com/.well-known/openid-configuration',
    client_id: 'your-okta-client-id',
    client_secret: 'your-okta-client-secret',
    redirect_uri: 'https://vpn.yourdomain.com/auth/oidc/okta/callback',
    response_type: 'code',
    scope: 'openid email profile',
    label: 'Okta'
  }
}
```

## User Self-Service Provisioning

Once a user authenticates, they click "Add Device" in the portal. The portal:
1. Generates a WireGuard key pair (private key stays in the browser)
2. Registers the public key with the server
3. Offers to download the configuration file or display a QR code

This self-service model means IT does not need to generate configs manually for each user.

## Managing Split Tunneling

By default, Firezone routes all traffic through the VPN. To configure split tunneling, go to Settings > Default Client Config and modify the "Allowed IPs":

For full tunnel:
```text
0.0.0.0/0, ::/0
```

For split tunnel (only route corporate networks through VPN):
```text
10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
```

Users who already have devices registered will need to regenerate their configuration after this change.

## Enforcing Periodic Authentication

Firezone can require users to re-authenticate periodically, which syncs with your identity provider to verify the user's account is still active:

```bash
sudo nano /etc/firezone/firezone.rb
```

```ruby
# Require re-authentication every 7 days
default['firezone']['authentication']['local_enabled'] = true
default['firezone']['max_session_lifetime_hours'] = 168
```

When a user's session expires, their VPN connection drops and they must log back into the portal. This ensures terminated employees lose access promptly.

## DNS Configuration

Configure the DNS pushed to clients:

```bash
sudo nano /etc/firezone/firezone.rb
```

```ruby
# Push internal DNS to VPN clients
default['firezone']['wireguard']['dns'] = '10.0.0.53'
```

## Egress Rules

Firezone can restrict what VPN clients can access via egress filtering. In the web UI, go to Rules and add allowed destinations:

- `10.0.0.0/8` - internal networks only
- `0.0.0.0/0` - everything (full tunnel)

## Backup and Recovery

```bash
# Backup the Firezone database
sudo firezone-ctl backup create

# Backups are stored in /var/opt/firezone/backups/
ls -la /var/opt/firezone/backups/

# Restore from backup
sudo firezone-ctl backup restore /var/opt/firezone/backups/firezone-20260302.tar.gz
```

Also back up `/etc/firezone/firezone.rb` separately:

```bash
sudo cp /etc/firezone/firezone.rb /backup/firezone.rb.$(date +%Y%m%d)
```

## Monitoring and Logs

```bash
# View all Firezone service logs
sudo firezone-ctl tail

# Check specific service
sudo firezone-ctl tail phoenix  # web app
sudo firezone-ctl tail nginx
sudo firezone-ctl tail postgresql

# Service status
sudo firezone-ctl status
```

## Upgrading Firezone

```bash
# Download the latest version
curl -fsSL https://raw.githubusercontent.com/firezone/firezone/legacy/scripts/install.sh | sudo bash

# Or if using apt (after adding the repository)
sudo apt update && sudo apt upgrade firezone
sudo firezone-ctl reconfigure
```

## Troubleshooting

**Portal returns 502 Bad Gateway:**
```bash
# Check if Phoenix app is running
sudo firezone-ctl status phoenix
sudo firezone-ctl tail phoenix
```

**WireGuard peers not receiving traffic:**
```bash
# Check WireGuard interface
sudo wg show

# Verify IP forwarding
sysctl net.ipv4.ip_forward

# Check iptables rules
sudo iptables -L FORWARD -n -v
```

**OIDC login failing:**
Check that the redirect URI in your identity provider exactly matches the one in Firezone's config, including the trailing slash (or lack thereof).

```bash
# Test OIDC discovery document is reachable
curl https://accounts.google.com/.well-known/openid-configuration
```

Firezone sits in a useful middle ground between managing raw WireGuard configs by hand and deploying a complex VPN platform. The OIDC integration means you get proper SSO and access revocation tied to your identity provider, which is essential for organizations where people join and leave regularly.
