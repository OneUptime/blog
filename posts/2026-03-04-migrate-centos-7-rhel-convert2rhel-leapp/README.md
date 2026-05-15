# How to Migrate from CentOS 7 to RHEL Using Convert2RHEL and Leapp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS, Convert2RHEL, Leapp, Migration, Linux

Description: Migrate from CentOS 7 to RHEL using a two-step process: Convert2RHEL to convert CentOS 7 to RHEL 7, then Leapp to upgrade to RHEL 8 or 9.

---

With CentOS 7 reaching end of life, migrating to RHEL requires a two-step process: first convert CentOS 7 to RHEL 7 using Convert2RHEL, then upgrade to RHEL 8 or 9 using Leapp.

## Step 1: Prepare the CentOS 7 System

```bash
# Update CentOS 7 to the latest available packages
sudo sed -i 's/^mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=https://vault.centos.org|g' /etc/yum.repos.d/CentOS-*

sudo yum update -y

# Verify the current version
cat /etc/redhat-release

# Create a backup before starting (always back up first)
sudo tar czpf /backup/centos7-pre-convert-$(date +%Y%m%d).tar.gz \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp --exclude=/backup /
```

## Step 2: Install and Run Convert2RHEL

```bash
# Configure Red Hat subscription details for Convert2RHEL
sudo tee /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = <your_org_id>
activation_key = <your_key>
EOF

# Download the Red Hat GPG key
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release \
  https://security.access.redhat.com/data/fd431d51.txt

# Install the Convert2RHEL repository
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-7-x86_64.repo

# Install the Convert2RHEL package
sudo yum install -y convert2rhel

# Run the pre-conversion analysis and fix any reported issues
sudo convert2rhel analyze

# Run the conversion
sudo convert2rhel
```

The tool will:
- Replace CentOS-branded packages with RHEL equivalents
- Register the system with Red Hat Subscription Management
- Install the RHEL 7 kernel and core packages

```bash
# After conversion completes, reboot
sudo reboot

# Verify the system is now RHEL 7
cat /etc/redhat-release
```

## Step 3: Upgrade from RHEL 7 to RHEL 8 with Leapp

```bash
# Enable the required repositories
sudo subscription-manager repos --enable rhel-7-server-rpms
sudo subscription-manager repos --enable rhel-7-server-extras-rpms

# Use the latest RHEL 7.9 content
sudo subscription-manager release --unset

# Install the Leapp upgrade packages
sudo yum install -y leapp-upgrade

# Run pre-upgrade assessment
sudo leapp preupgrade --target 8.10

# Review and fix any inhibitors
cat /var/log/leapp/leapp-report.txt

# Perform the upgrade
sudo leapp upgrade --target 8.10

# Reboot into the upgrade initramfs and then into RHEL 8
sudo reboot
```

## Step 4: Upgrade from RHEL 8 to RHEL 9 (Optional)

After reaching RHEL 8, you can continue to RHEL 9:

```bash
# Update RHEL 8 fully
sudo subscription-manager repos \
  --enable rhel-8-for-x86_64-baseos-rpms \
  --enable rhel-8-for-x86_64-appstream-rpms
sudo subscription-manager release --set 8.10
sudo dnf update -y

# If this system was upgraded from RHEL 7, remove leftover Leapp data first
sudo dnf remove -y "*leapp*"
sudo rm -rf /usr/share/leapp-repository/repositories

# Install Leapp for RHEL 8 to 9 upgrade
sudo dnf install -y leapp-upgrade

# Pre-upgrade assessment
sudo leapp preupgrade --target 9.7

# Perform the upgrade
sudo leapp upgrade --target 9.7

# Reboot into the upgrade initramfs and then into RHEL 9
sudo reboot
```

## Post-Migration Cleanup

```bash
# Remove leftover conversion/upgrade packages
sudo dnf remove -y convert2rhel*

# Verify the final version
cat /etc/redhat-release

# Check for failed services
systemctl list-units --state=failed
```

This two-step migration path gives you a supported RHEL system without requiring a fresh installation.
