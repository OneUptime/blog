# How to Install and Configure Forgejo Git Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Git, Linux

Description: Step-by-step guide on install and configure forgejo git server using Red Hat Enterprise Linux 9.

---

Forgejo Git Server can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A server hostname or IP address for the Forgejo web UI

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf upgrade -y

# Install the required packages
sudo dnf install -y git git-lfs wget gnupg2 firewalld

# Download and verify the Forgejo binary
export FORGEJO_VERSION=15.0.2
wget https://codeberg.org/forgejo/forgejo/releases/download/v${FORGEJO_VERSION}/forgejo-${FORGEJO_VERSION}-linux-amd64
wget https://codeberg.org/forgejo/forgejo/releases/download/v${FORGEJO_VERSION}/forgejo-${FORGEJO_VERSION}-linux-amd64.asc
gpg --keyserver keys.openpgp.org --recv EB114F5E6C0DC2BCDD183550A4B61A2DC5923710
gpg --verify forgejo-${FORGEJO_VERSION}-linux-amd64.asc forgejo-${FORGEJO_VERSION}-linux-amd64

# Install the binary
sudo install -m 0755 forgejo-${FORGEJO_VERSION}-linux-amd64 /usr/local/bin/forgejo
```

Replace `FORGEJO_VERSION` with the current Forgejo release for your use case and use the matching binary for your CPU architecture.

## Step 2: Configure the Service

Create the dedicated `git` user and the directories Forgejo uses:

```bash
sudo groupadd --system git
sudo useradd --system --shell /bin/bash --comment 'Git Version Control' \
  --gid git --home-dir /home/git --create-home git

sudo mkdir -p /var/lib/forgejo /etc/forgejo
sudo chown git:git /var/lib/forgejo
sudo chmod 750 /var/lib/forgejo
sudo chown root:git /etc/forgejo
sudo chmod 770 /etc/forgejo
```

Install the Forgejo systemd service file:

```bash
sudo wget -O /etc/systemd/system/forgejo.service \
  https://codeberg.org/forgejo/forgejo/raw/branch/forgejo/contrib/systemd/forgejo.service
sudo systemctl daemon-reload
```

Forgejo creates `/etc/forgejo/app.ini` during the first web-based setup. After starting the service in the next step and completing the initial setup, return to edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/forgejo/app.ini
```

Adjust the settings according to your requirements. Key parameters to configure include `ROOT_URL`, `DOMAIN`, `HTTP_PORT`, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart forgejo.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable forgejo.service

# Start the service
sudo systemctl start forgejo.service

# Check the status
sudo systemctl status forgejo.service
```

After the service starts, Forgejo listens on port `3000` by default. Configure the firewall in the next step before accessing it remotely.

## Step 4: Configure the Firewall

```bash
# Start and enable firewalld if it is not already running
sudo systemctl enable --now firewalld

# Open the Forgejo web port
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```

Port `3000/tcp` is Forgejo's default web port. SSH access for Git uses the server's SSH service, usually port `22/tcp`, unless you configure Forgejo or SSH differently.

Open `http://<server-ip-or-hostname>:3000/` in a browser and complete the initial Forgejo setup.

## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status forgejo.service

# Review recent logs
journalctl -u forgejo.service --no-pager -n 20
```

You can also verify the web interface by visiting `http://<server-ip-or-hostname>:3000/`.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u forgejo.service -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -q git git-lfs wget gnupg2 firewalld`.
- If `/etc/forgejo/app.ini` does not exist yet, start `forgejo.service` and complete the initial setup in the web UI.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
