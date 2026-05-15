# How to Install and Configure Teleport for SSH Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on install and configure teleport for ssh access using Red Hat Enterprise Linux 9.

---

Teleport for SSH Access can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A running Teleport cluster, proxy address, join token, and CA pin

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the DNF config-manager plugin
sudo dnf install -y dnf-plugins-core

# Add the Teleport RPM repository for RHEL 9 or CentOS Stream 9
source /etc/os-release
export TELEPORT_VERSION=v18
export TELEPORT_CHANNEL="stable/${TELEPORT_VERSION}"
export TELEPORT_PKG=teleport
REPO_ID="$ID"
REPO_VERSION_ID="$(echo "$VERSION_ID" | grep -Eo '^[0-9]+')"
ARCH="$(rpm --eval '%{_arch}')"

sudo dnf config-manager --add-repo \
  "https://yum.releases.teleport.dev/${REPO_ID}/${REPO_VERSION_ID}/Teleport/${ARCH}/${TELEPORT_CHANNEL}/teleport.repo"

# Install Teleport Community Edition
sudo dnf install -y "${TELEPORT_PKG}"

# Verify the installed binary
teleport version
```

Use `teleport-ent` instead of `teleport` if you are installing Teleport Enterprise Self-Hosted.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Generate the SSH node configuration
sudo teleport node configure \
  --proxy=teleport.example.com:443 \
  --token=/path/to/join-token \
  --ca-pin=sha256:replace-with-your-cluster-ca-pin \
  --labels=env=prod,os=rhel9 \
  -o file:///etc/teleport.yaml
```

Replace `teleport.example.com:443`, `/path/to/join-token`, and the `sha256:` CA pin with values from your Teleport cluster. You can also edit `/etc/teleport.yaml` directly to adjust labels, the node name, or SSH service settings.

```bash
# Restart the service to apply changes
sudo systemctl restart teleport
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable teleport

# Start the service
sudo systemctl start teleport

# Check the status
sudo systemctl status teleport
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status teleport

# Review recent logs
journalctl -u teleport --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u teleport -e --no-pager`.
- Check file ownership and permissions with `ls -laZ` (the Z flag shows SELinux contexts).
- Ensure Teleport is installed: `rpm -qa | grep teleport`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
