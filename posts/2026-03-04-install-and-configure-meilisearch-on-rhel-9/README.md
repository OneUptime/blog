# How to Install and Configure Meilisearch on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Search, Linux

Description: Step-by-step guide on install and configure meilisearch using Red Hat Enterprise Linux 9.

---

Meilisearch can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps using Podman, which avoids the current Meilisearch Linux binary requirement for glibc 2.35 or newer.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the required packages
sudo dnf install -y container-tools curl openssl

# Create a persistent data directory for Meilisearch
sudo install -d -m 750 /var/lib/meilisearch
```

This installs Podman through the RHEL container tools package and creates a host directory that will be mounted into the Meilisearch container.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Create an environment file with a production master key
MEILI_MASTER_KEY=$(openssl rand -base64 32)
printf 'MEILI_ENV=production\nMEILI_MASTER_KEY=%s\n' "$MEILI_MASTER_KEY" | sudo tee /etc/meilisearch.env >/dev/null
sudo chmod 600 /etc/meilisearch.env
```

Adjust the settings according to your requirements. Key parameters to configure include the environment, authentication settings, and logging options.

```bash
# Create a systemd Quadlet service definition
sudo install -d -m 755 /etc/containers/systemd
sudo vi /etc/containers/systemd/meilisearch.container
```

Add the following content:

```ini
[Unit]
Description=Meilisearch

[Container]
Image=docker.io/getmeili/meilisearch:latest
ContainerName=meilisearch
PublishPort=7700:7700
Volume=/var/lib/meilisearch:/meili_data:Z
EnvironmentFile=/etc/meilisearch.env

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
```

After changing the Quadlet file or environment file, reload systemd and restart the service to apply changes.

```bash
sudo systemctl daemon-reload
sudo systemctl restart meilisearch.service
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd so it generates the service from the Quadlet file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable meilisearch.service

# Start the service
sudo systemctl start meilisearch.service

# Check the status
sudo systemctl status meilisearch.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status meilisearch.service

# Check the Meilisearch health endpoint
curl http://localhost:7700/health

# Review recent logs
journalctl -u meilisearch.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u meilisearch.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'podman|container-tools'`.
- Confirm the container image is available locally with `sudo podman image ls getmeili/meilisearch`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
