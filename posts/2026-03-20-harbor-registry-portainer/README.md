# How to Deploy Harbor Registry via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Harbor, Container Registry, Self-Hosted

Description: Deploy Harbor, the enterprise-grade container registry, using Portainer stacks for a secure and feature-rich private image repository.

## Introduction

Harbor is an open-source container registry that extends the Docker Distribution project with enterprise features: role-based access control, image vulnerability scanning, content trust, and replication. Deploying it via Portainer simplifies the operational overhead and gives you a single pane of glass for all your container infrastructure.

## Prerequisites

- Portainer CE or BE installed and running
- Docker Engine 20.10+ with Docker Compose v2 available on the Harbor host
- Minimum 2 CPU, 4 GB RAM, and 40 GB disk on the host
- A domain name with DNS pointing to your host, or a reachable IP address

## Step 1: Download Harbor Installer

Harbor provides both online and offline installers. The offline installer is useful when the host does not have Internet access. Run these commands on the Docker host, not inside Portainer:

```bash
# Download the Harbor offline installer for the version you want to deploy
VERSION=v2.15.0
wget https://github.com/goharbor/harbor/releases/download/${VERSION}/harbor-offline-installer-${VERSION}.tgz

# Extract the archive
tar xzvf harbor-offline-installer-${VERSION}.tgz

# Move to a permanent location
mv harbor /opt/harbor
cd /opt/harbor
```

## Step 2: Configure harbor.yml

```bash
# Copy the template configuration
cp harbor.yml.tmpl harbor.yml
```

Edit `/opt/harbor/harbor.yml`:

```yaml
# The hostname or IP address of your Harbor instance
hostname: registry.yourdomain.com

# HTTP configuration (redirect to HTTPS in production)
http:
  port: 80

# HTTPS configuration
https:
  port: 443
  certificate: /opt/harbor/certs/yourdomain.crt
  private_key: /opt/harbor/certs/yourdomain.key

# Initial admin password (change immediately after first login)
harbor_admin_password: Harbor12345

# Database configuration
database:
  password: root123
  max_idle_conns: 100
  max_open_conns: 900

# Default data volume
data_volume: /data/harbor

# Logging settings
log:
  level: info
  local:
    rotate_count: 50
    rotate_size: 200M
    location: /var/log/harbor
```

Make sure the certificate and key files exist at the paths referenced under `https` before you run the installer.

## Step 3: Run the Harbor Installer

```bash
# Install Harbor (this generates the docker-compose.yml and starts Harbor)
cd /opt/harbor
./install.sh --with-trivy

# Verify all services are running
docker compose ps

# Stop the CLI-managed deployment before importing it into Portainer
docker compose down
```

Harbor's install script generates a `docker-compose.yml` automatically and starts Harbor. The `--with-trivy` flag enables image vulnerability scanning.

## Step 4: Import Harbor into Portainer as a Stack

After the installer has generated Harbor's compose assets, you can manage Harbor through Portainer:

1. Open Portainer and navigate to **Stacks**
2. Click **Add Stack** → **Upload**
3. Upload the generated `/opt/harbor/docker-compose.yml`
4. Replace Harbor's relative bind mounts with absolute host paths rooted at `/opt/harbor`
5. Name the stack `harbor`
6. Click **Deploy the stack**

> **Note**: Portainer's relative path volume support applies to Git-based stack deployments. If you upload Harbor's generated compose file, convert its relative bind mounts to absolute host paths before deploying.

## Step 5: Access Harbor UI

1. Navigate to `https://registry.yourdomain.com`
2. Log in with `admin` / `Harbor12345`
3. Immediately change the default admin password after first sign-in

## Step 6: Connect Harbor to Portainer

1. In Portainer, go to **Registries** → **Add Registry**
2. Select **Custom Registry**
3. Enter:
   - **Name**: `harbor`
   - **URL**: `https://registry.yourdomain.com`
   - **Username**: `admin`
   - **Password**: your Harbor admin password
4. Click **Add Registry**

> **Note**: If Harbor uses a self-signed or privately issued certificate, make sure the Portainer Server (and Agent, if used) trusts that CA before adding the registry.

## Step 7: Create a Harbor Project and Push Images

Create the project in the Harbor UI before you push the first image. For example, create a project named `myproject` under **Projects**.

```bash
# Log in to Harbor from your workstation
docker login registry.yourdomain.com -u admin

# Tag an image for Harbor
docker tag myapp:latest registry.yourdomain.com/myproject/myapp:v1.0

# Push to Harbor
docker push registry.yourdomain.com/myproject/myapp:v1.0
```

> **Note**: If Harbor uses a self-signed or privately issued certificate, copy the Harbor CA certificate to `/etc/docker/certs.d/registry.yourdomain.com/ca.crt` on the Docker client and restart Docker before running `docker login`.

## Step 8: Enable Vulnerability Scanning

In the Harbor UI:
1. Navigate to your project → **Configuration**
2. Enable **Automatically scan images on push**
3. Open **Repositories**, select your repository, and inspect the artifact's **Vulnerabilities** status or detail view to see scan results

## Updating Harbor

For Harbor version upgrades, follow Harbor's official upgrade guide for your current and target versions: https://goharbor.io/docs/main/administration/upgrade/

Version upgrades can require `harbor.yml` migration and database migration, so simply rerunning `install.sh` is not sufficient across releases.

## Conclusion

Harbor provides enterprise-grade registry capabilities - vulnerability scanning, RBAC, and image signing - all manageable via Portainer stacks. This combination gives your team a powerful, self-hosted container supply chain without needing cloud registry services.
