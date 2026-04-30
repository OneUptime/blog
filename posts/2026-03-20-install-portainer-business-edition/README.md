# How to Install Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Business Edition, Enterprise, DevOps

Description: Learn how to install Portainer Business Edition on Docker with a valid license key for access to enterprise features.

---

Portainer Business Edition (BE) extends the free Community Edition with enterprise features including role-based access control, enhanced OAuth support, audit logging, and commercial support options. Installing BE requires a valid license key obtained from Portainer.

## Prerequisites

- Docker Engine installed and running
- A valid Portainer Business Edition license (free for up to 3 nodes at portainer.io)
- Port 9443 available on the host (and port 8000 if you plan to use Edge agents)

## Step 1: Create the Data Volume

```bash
# Create a persistent volume for Portainer BE data and configuration

docker volume create portainer_data
```

## Step 2: Pull and Run Portainer BE

The Business Edition image is hosted on Docker Hub under `portainer/portainer-ee`:

Port 8000 is optional and is only required if you plan to use Edge agents.

```bash
# Deploy Portainer Business Edition
# portainer-ee:latest is the Business Edition image (vs portainer-ce for Community)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest
```

## Step 3: Initial Setup and License Activation

1. Navigate to `https://localhost:9443` (or replace `localhost` with your server's IP address or FQDN)
2. Create an admin username and password (minimum 12 characters)
3. On the license screen, paste your Business Edition license key
4. Click **Submit** to complete setup

## Step 4: Verify the License

After activation, confirm your license is applied:

```bash
# Check Portainer BE container is running
docker ps --filter name=portainer --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
```

Navigate to **Licenses** in the Portainer UI to view license details including expiry date and node count.

## Business Edition vs Community Edition

| Feature | CE | BE |
|---------|----|----|
| Price | Free | Free up to 3 nodes; paid plans for larger deployments |
| RBAC | Basic | Advanced |
| OAuth/LDAP/AD | OAuth and LDAP | OAuth, LDAP, and AD |
| Audit logging | No | Yes |
| Registry management | Basic | Advanced |
| Support | Community | Community or commercial, depending on plan |

## Upgrading from CE to BE

If you have Portainer CE installed, see the separate guide on upgrading from CE to BE without losing data. Your existing configuration, stacks, and environments are preserved during the upgrade.

---

*Track the health and availability of your Portainer instance with [OneUptime](https://oneuptime.com).*
