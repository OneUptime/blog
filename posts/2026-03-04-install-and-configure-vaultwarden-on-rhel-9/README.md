# How to Install and Configure Vaultwarden on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on install and configure vaultwarden using Red Hat Enterprise Linux 9.

---

Vaultwarden can be installed and configured on RHEL to provide a lightweight self-hosted password manager for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A DNS name and TLS-capable reverse proxy for production use

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install Podman and firewalld
sudo dnf install -y container-tools firewalld

# Enable the firewall service
sudo systemctl enable --now firewalld
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Create the persistent data directory
sudo mkdir -p /vw-data /etc/containers/systemd

# Open the Quadlet configuration file
sudo vi /etc/containers/systemd/vaultwarden.container
```

Adjust the settings according to your requirements. Key parameters to configure include the container image, persistent data volume, published port, domain name, and signup policy.

```ini
[Unit]
Description=Vaultwarden container
After=network-online.target

[Container]
Image=docker.io/vaultwarden/server:latest
ContainerName=vaultwarden
Volume=/vw-data:/data:Z
PublishPort=8080:80
Environment=DOMAIN=https://vaultwarden.example.com
Environment=SIGNUPS_ALLOWED=false

[Install]
WantedBy=multi-user.target
```

```bash
# Restart the service to apply changes
sudo systemctl daemon-reload
sudo systemctl restart vaultwarden.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable vaultwarden.service

# Start the service
sudo systemctl start vaultwarden.service

# Check the status
sudo systemctl status vaultwarden.service
```

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the Vaultwarden service status
sudo systemctl status vaultwarden.service

# Verify Vaultwarden is accessible
curl -I http://localhost:8080
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u vaultwarden.service -e --no-pager`.
- SELinux may block access if the data directory is not labeled for containers. The `:Z` suffix on the volume mount relabels `/vw-data` for the Vaultwarden container.
- Ensure all required packages are installed: `rpm -qa | grep -E 'podman|firewalld'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
