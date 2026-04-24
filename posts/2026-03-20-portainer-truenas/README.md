# How to Install Portainer on TrueNAS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, TrueNAS, NAS, Docker, Self-Hosted, Home Lab

Description: Install Portainer on TrueNAS SCALE to manage Docker containers and Kubernetes applications through a unified web interface.

## Introduction

TrueNAS SCALE 24.10 and later uses Docker for its Apps system, and some users prefer to manage those containers through Portainer. On SCALE, the supported way to run Portainer is through the Apps UI, either from the catalog or as a custom app using Docker Compose YAML. This guide covers installing Portainer on both TrueNAS SCALE and TrueNAS CORE.

## Prerequisites

- TrueNAS SCALE 24.10 or later OR TrueNAS CORE with a Linux VM
- TrueNAS SCALE 24.10.2.2 or later if installing Portainer from the Community app catalog
- Apps pool configured on TrueNAS SCALE
- At least 4GB RAM

## TrueNAS SCALE: Docker Method

### Step 1: Configure Apps on TrueNAS SCALE

TrueNAS SCALE 24.10+ uses Docker for Apps. Start by configuring the Apps service:

1. Navigate to **Apps**
2. If prompted, click **Choose Pool** and select the pool to use for apps
3. Click **Discover Apps**

### Step 2: Create a dataset for Portainer data

Create a dataset for Portainer data before deploying it:

1. Navigate to **Datasets**
2. Create a dataset such as `apps/portainer`
3. Use that dataset path for Portainer persistent storage

### Step 3: Compose-Based Deployment

Create a custom app on TrueNAS SCALE using Docker Compose YAML:

1. Navigate to **Apps > Discover Apps**
2. Click the `more_vert` menu and select **Install via YAML**
3. Enter a name such as `portainer`
4. Paste the following YAML:

```yaml
name: portainer

services:
  portainer:
    image: portainer/portainer-ce:sts
    container_name: portainer
    restart: always
    ports:
      - "9443:9443"
    volumes:
      # Docker socket for container management
      - /var/run/docker.sock:/var/run/docker.sock
      # Store data on TrueNAS dataset
      - /mnt/pool/apps/portainer:/data
```

If you need legacy HTTP access, add `- "9000:9000"` under `ports`.

## TrueNAS SCALE: App Catalog Method

If using the built-in App system:

1. Navigate to **Apps**
2. Open **Configuration > Settings**
3. Enable the **community** train and click **Save**
4. Open **Discover Apps**
5. Search for `Portainer`
6. Click **Install**
7. Configure storage and networking as needed, then deploy the app

## TrueNAS CORE: Using a Linux VM

TrueNAS CORE uses FreeBSD jails, not Linux containers. If you still use CORE, install Docker in a Linux VM instead:

### Option A: Linux VM

1. Navigate to **Virtual Machines** and click **Add**
2. Create an Ubuntu 22.04 LTS VM
3. Allocate 2 vCPUs, 4GB RAM, 20GB disk
4. Install Docker inside the VM
5. Deploy Portainer inside the VM

```bash
# Inside the Ubuntu VM
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Log out and back in, or keep using sudo for Docker commands
sudo docker volume create portainer_data
sudo docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

If you need legacy HTTP access, add `-p 9000:9000` to the `docker run` command.

## Step 4: Configure Network Access

Allow access to Portainer on your network:

1. If you use an external firewall, router ACL, or VLAN policy, allow inbound TCP port 9443 to the TrueNAS or VM IP
2. Restrict source access to your local subnet
3. If you enabled legacy HTTP access, allow TCP port 9000 as well

## Step 5: Access Portainer

Navigate to `https://<truenas-ip>:9443` on SCALE, or `https://<vm-ip>:9443` if you installed Portainer in a Linux VM on CORE, then create your admin account.

## Backing Up Portainer Data

If you stored Portainer data in a TrueNAS dataset such as `apps/portainer`, schedule ZFS snapshots for it:

1. Navigate to **Data Protection > Periodic Snapshot Tasks**
2. Add a task for the `apps/portainer` dataset
3. Set schedule (daily recommended)
4. Set retention (7 days)

## Conclusion

Portainer on TrueNAS gives you a powerful container management interface backed by ZFS storage reliability. Using a TrueNAS dataset for Portainer data means you benefit from ZFS checksums, snapshots, and replication for your container configuration. TrueNAS SCALE's Docker support makes this particularly straightforward in recent releases.
