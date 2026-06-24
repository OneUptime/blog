# How to Install Portainer on Synology NAS (DSM 7)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Synology, NAS, Docker, DSM 7, Self-Hosted, Home Lab

Description: Install Portainer on a Synology NAS running DSM 7 to manage Docker containers through a web UI instead of the limited Container Manager interface.

## Introduction

On DSM 7.2, Synology renamed its Docker package to Container Manager. Earlier DSM 7 releases still use the Docker package, but the install flow is similar. Installing Portainer on your Synology NAS gives you stack support, registry management, app templates, and a much more powerful container management experience.

## Prerequisites

- Synology NAS with DSM 7.x installed
- Container Manager installed from Package Center (or the Docker package on DSM 7.0/7.1)
- SSH access enabled (Control Panel > Terminal & SNMP) if you plan to use the CLI method
- Enough free storage for Portainer's persistent data

## Installation Methods

### Method 1: Via Container Manager UI (Recommended)

1. Open **Container Manager** on your Synology (`Docker` on DSM 7.0/7.1)
2. Navigate to **Registry** and search for `portainer`
3. Select `portainer/portainer-ce` and click **Download**
4. Choose tag `lts` and click **Apply**
5. Navigate to **Container** and click **Create**
6. Select the `portainer/portainer-ce` image
7. Configure:
   - **Container Name**: `portainer`
   - **Enable auto-restart**: Yes
8. Click **Advanced Settings**
9. Under **Volume**, add:
   - Host path: `/var/run/docker.sock` → Mount path: `/var/run/docker.sock` (Type: File)
   - Host path: a persistent folder on your NAS (for example `/volume1/docker/portainer`) → Mount path: `/data`
10. Under **Port Settings**, add:
    - Local port: `9443` → Container port: `9443` (TCP)
    - Optional for legacy HTTP access: Local port `9000` → Container port `9000` (TCP)
11. Click **Apply** and **Next**, then **Done**

### Method 2: Via SSH (Recommended for Reproducibility)

SSH into your Synology NAS:

```bash
ssh <your-admin-user>@<synology-ip>
```

Run the Portainer container:

```bash
# Create a volume for Portainer data persistence

sudo docker volume create portainer_data

# Run Portainer CE
# Add -p 9000:9000 if you need legacy HTTP access
sudo docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Verify it is running
sudo docker ps | grep portainer
```

### Step 3: Access Portainer

Open your browser and navigate to:
- HTTPS: `https://<synology-ip>:9443`
- HTTP: `http://<synology-ip>:9000` if you explicitly exposed port `9000` for legacy access

On first access, you'll be prompted to create an admin user.

## Configuring DSM Firewall

If the Synology firewall is enabled, allow the Portainer port you exposed:

1. Go to **Control Panel > Security > Firewall**
2. Click **Edit Rules** for your profile
3. Click **Create** and set:
   - Ports: `9443` (and `9000` only if you enabled legacy HTTP access)
   - Protocol: TCP
   - Source IP: your local subnet (e.g., `192.168.1.0/24`)
   - Action: Allow
4. Move the rule above the default deny rule

## Post-Installation Configuration

### Enable HTTPS with a Custom Certificate

Portainer can use your own PEM-formatted certificate and key. Place them in a folder on the NAS that Docker can mount:

```bash
# Example files:
# /path/to/certs/cert.pem
# /path/to/certs/key.pem
```

Then recreate the container with SSL certificate mounts:

```bash
sudo docker stop portainer
sudo docker rm portainer

sudo docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/certs:/certs:ro \
  portainer/portainer-ce:lts \
  --sslcert /certs/cert.pem \
  --sslkey /certs/key.pem
```

## Updating Portainer

```bash
# Stop and remove the old container (data volume is preserved)
sudo docker stop portainer
sudo docker rm portainer

# Pull the latest LTS image
sudo docker pull portainer/portainer-ce:lts

# Recreate with the same run command
sudo docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Troubleshooting

**Cannot access Portainer:** Check DSM firewall settings, verify the container is running with `sudo docker ps`, and make sure you are connecting to `https://<synology-ip>:9443` unless you explicitly enabled legacy HTTP access on port `9000`.

**Permission denied on docker.sock:** Ensure the container was created with `-v /var/run/docker.sock:/var/run/docker.sock` and that your SSH user can run Docker commands with `sudo`.

**Container restarts in a loop:** Check logs with `sudo docker logs portainer`.

## Conclusion

Portainer on Synology DSM 7 transforms your NAS into a capable container management platform. With Portainer's richer stack support and management features, you can manage more complex container workloads on your NAS with less friction than in Container Manager alone. The persistent data volume ensures your configuration survives container updates.
