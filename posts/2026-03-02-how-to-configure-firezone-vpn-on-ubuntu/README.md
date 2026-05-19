# How to Configure Firezone VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, WireGuard, Security, Authentication

Description: Step-by-step guide to deploying and configuring Firezone VPN on Ubuntu, including OIDC authentication integration and user management via the web portal.

---

Firezone's legacy 0.7 release is a WireGuard-based VPN management platform that combines a web portal for user self-service with enterprise-grade authentication options. Users log in through the portal with their existing SSO credentials (Google Workspace, Okta, Azure AD) and self-provision their own VPN configuration. IT teams get a central view of who has access and can revoke it instantly.

This guide installs the legacy Firezone 0.7 server on Ubuntu using the official legacy installer, configures authentication, and walks through daily operations. The legacy branch is end-of-life; Firezone's current product uses a managed control plane and self-hosted gateways instead of this self-hosted portal.

## Prerequisites

- Ubuntu 20.04 or 22.04 with Docker Engine and Docker Compose v2
- 1 CPU core, 1 GB RAM minimum (2 GB recommended)
- A domain name pointing to your server
- Ports 80, 443, and 51820 (UDP) open
- A user with permission to run Docker commands

## Installing Firezone

Legacy Firezone 0.7 uses Docker Compose by default. The legacy installer prompts for an administrator email, install directory, and external URL, then creates a `.env` file and a Docker Compose deployment:

```bash
# Download and run the installer

bash <(curl -fsSL https://github.com/firezone/firezone/raw/legacy/scripts/install.sh)
```

The installer will:
- Download a Docker Compose template
- Generate Firezone secrets and admin credentials in `$HOME/.firezone/.env`
- Start PostgreSQL, Firezone, and Caddy containers
- Run database migrations
- Create the initial administrator account

At the end, the installer displays the admin email and password - save these.

## Configuring SSL with Let's Encrypt

For Docker deployments, the default production Compose file uses Caddy to obtain and renew certificates automatically when `EXTERNAL_URL` is a public HTTPS URL and port 80 is reachable.

```bash
# Edit the Firezone environment file
nano $HOME/.firezone/.env
```

Set your actual domain:

```env
EXTERNAL_URL=https://vpn.yourdomain.com
```

Apply the configuration:

```bash
cd $HOME/.firezone
docker compose up -d
```

## Firewall Setup

```bash
# Allow HTTPS for the web portal
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Allow WireGuard
sudo ufw allow 51820/udp

# Allow routed VPN traffic through the host
sudo ufw default allow routed

sudo ufw enable
```

## First Login and Initial Setup

Access the portal at `https://vpn.yourdomain.com` and log in with the credentials shown after installation.

Navigate to Settings > Security to:
1. Change the admin password
2. Configure authentication providers
3. Set session timeout

Under Devices, you see all registered VPN configurations.

## Configuring OIDC for Single Sign-On

Firezone supports OpenID Connect providers. Here is the setup for Google Workspace:

**In Google Cloud Console:**
1. Create an OAuth 2.0 Client ID (Web application type)
2. Add `https://vpn.yourdomain.com/auth/oidc/google/callback/` as an authorized redirect URI
3. Note the Client ID and Client Secret

**In Firezone:**

Navigate to `/settings/security`, click "Add OpenID Connect Provider", and enter:

- Config ID: `google`
- Label: `Google Workspace`
- Discovery Document URI: `https://accounts.google.com/.well-known/openid-configuration`
- Client ID: `your-client-id.apps.googleusercontent.com`
- Client Secret: `your-client-secret`
- Redirect URI: `https://vpn.yourdomain.com/auth/oidc/google/callback/`
- Response type: `code`
- Scope: `openid email profile`

Users can now sign in with their Google account. If Auto create users is enabled for the provider, Firezone creates a user account on first login and they can self-provision a VPN device.

## Configuring Okta OIDC

In the Okta Admin Console, create an OIDC web application. Set the sign-in redirect URI to `https://vpn.yourdomain.com/auth/oidc/okta/callback/`, enable the Authorization Code flow, and enable refresh tokens if you want Firezone to revoke VPN sessions when OIDC refresh fails.

In Firezone, navigate to `/settings/security`, click "Add OpenID Connect Provider", and enter the Okta provider details. Use `openid email profile offline_access` for the scope when refresh tokens are enabled.

## User Self-Service Provisioning

Once a user authenticates, they click "Add Device" in the portal. The portal:
1. Generates a WireGuard key pair (private key stays in the browser)
2. Registers the public key with the server
3. Offers to download the configuration file or display a QR code

This self-service model means IT does not need to generate configs manually for each user.

## Managing Split Tunneling

By default, Firezone routes all traffic through the VPN. To configure split tunneling, go to Settings > Defaults and modify the "Allowed IPs":

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

Firezone can require users to re-authenticate periodically, which syncs with your identity provider to verify the user's account is still active. Set the VPN session duration in seconds:

```bash
nano $HOME/.firezone/.env
```

```env
# Require re-authentication every 7 days
VPN_SESSION_DURATION=604800
```

Apply the configuration:

```bash
cd $HOME/.firezone
docker compose up -d
```

When a user's VPN session expires, their VPN connection is disabled and they must log back into the portal. This helps terminated employees lose access promptly.

## DNS Configuration

Configure the DNS pushed to clients:

```bash
nano $HOME/.firezone/.env
```

```env
# Push internal DNS to VPN clients
DEFAULT_CLIENT_DNS=10.0.0.53
```

Apply the configuration:

```bash
cd $HOME/.firezone
docker compose up -d
```

## Egress Rules

Firezone can restrict what VPN clients can access via egress filtering. In the web UI, go to Rules and add allowed destinations:

- `10.0.0.0/8` - internal networks only
- `0.0.0.0/0` - everything (full tunnel)

## Backup and Recovery

```bash
# Stop Firezone before backing up
cd $HOME/.firezone
docker compose down

# Back up the installation directory and Docker PostgreSQL volume
sudo tar -zcvfp $HOME/firezone-back-$(date +'%F-%H-%M').tgz \
  $HOME/.firezone \
  /var/lib/docker/volumes/firezone_postgres-data

# Restore from backup
sudo tar -zxvfp /path/to/firezone-back.tgz -C / --numeric-owner
```

Also back up any Docker daemon changes, such as `/etc/docker/daemon.json`, if you customized Docker networking:

```bash
sudo cp /etc/docker/daemon.json /backup/daemon.json.$(date +%Y%m%d)
```

## Monitoring and Logs

```bash
# View all Firezone service logs
cd $HOME/.firezone
docker compose logs -f

# Check specific service
docker compose logs -f firezone  # web app
docker compose logs -f caddy
docker compose logs -f postgres

# Service status
docker compose ps
```

## Upgrading Firezone

```bash
# Change to the Firezone installation directory
cd $HOME/.firezone

# Pull updated images and restart services
docker compose pull
docker compose up -d
```

## Troubleshooting

**Portal returns 502 Bad Gateway:**
```bash
# Check if Phoenix app is running
cd $HOME/.firezone
docker compose ps firezone
docker compose logs -f firezone
```

**WireGuard peers not receiving traffic:**
```bash
# Check WireGuard interface
sudo wg show

# Verify IP forwarding
sysctl net.ipv4.ip_forward

# Check iptables rules
sudo iptables -L FORWARD -n -v

# If using ufw, verify routed traffic is allowed
sudo ufw status verbose
```

**OIDC login failing:**
Check that the redirect URI in your identity provider exactly matches the one in Firezone's config, including the trailing slash (or lack thereof).

```bash
# Test OIDC discovery document is reachable
curl https://accounts.google.com/.well-known/openid-configuration
```

Firezone sits in a useful middle ground between managing raw WireGuard configs by hand and deploying a complex VPN platform. The OIDC integration means you get proper SSO and access revocation tied to your identity provider, which is essential for organizations where people join and leave regularly.
