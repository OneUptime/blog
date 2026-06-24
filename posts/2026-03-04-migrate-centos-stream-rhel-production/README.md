# How to Migrate from CentOS Stream to RHEL in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS Stream, Migration, Convert2RHEL, Production, Linux

Description: Migrate production CentOS Stream systems to RHEL using Convert2RHEL, ensuring a smooth transition with minimal downtime.

---

Convert2RHEL supports conversions from selected RHEL-derived distributions such as Alma Linux, CentOS Linux, Oracle Linux, and Rocky Linux to the corresponding RHEL minor release. CentOS Stream conversions are possible only as unsupported conversions, so production systems should use a supported conversion path or a fresh RHEL build and data migration.

## Prerequisites

```bash
# Verify the current source OS version

cat /etc/redhat-release
# Example: Rocky Linux release 9.x

# Update the system to a supported minor version before converting
sudo dnf update -y
sudo reboot

# Ensure the system has an active network connection
curl -I https://subscription.rhsm.redhat.com
curl -I https://cdn-public.redhat.com
```

## Creating a Pre-Conversion Backup

Always back up before converting production systems:

```bash
# Create a full system backup
sudo tar czpf /backup/pre-convert-$(date +%Y%m%d).tar.gz \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp --exclude=/backup /

# If using LVM, create a snapshot as a fallback
sudo lvcreate --size 10G --snapshot --name pre-convert /dev/<vg_name>/<lv_name>
```

## Installing Convert2RHEL

```bash
# Download the Red Hat GPG key
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release \
  https://security.access.redhat.com/data/fd431d51.txt

# Install the Convert2RHEL repository for conversions to RHEL 9
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo

# Install Convert2RHEL
sudo dnf install -y convert2rhel
```

## Running the Conversion

```bash
# Configure RHSM credentials for Convert2RHEL
sudo vi /etc/convert2rhel.ini
```

```ini
[subscription_manager]
org = <your_org_id>
activation_key = <your_key>
```

```bash
# Run the pre-conversion analysis and resolve reported issues
sudo convert2rhel analyze

# Start the conversion after the analysis is clean
sudo convert2rhel
```

Convert2RHEL will:
1. Verify system compatibility
2. Replace source OS repositories with RHEL repositories
3. Replace source OS packages with RHEL equivalents where available
4. Register the system with Red Hat Subscription Management

## Post-Conversion Steps

```bash
# Reboot into the RHEL kernel
sudo reboot

# Verify the system is now RHEL
cat /etc/redhat-release

# Check subscription status
sudo subscription-manager status

# Synchronize installed packages with enabled RHEL repositories
sudo dnf distro-sync -y

# Review packages that are not available from the enabled RHEL repository
sudo dnf list extras --disablerepo="*" --enablerepo=<RHEL_RepoID>
```

## Verifying Production Services

```bash
# Check for failed services
systemctl list-units --state=failed

# Test critical applications
systemctl status httpd
systemctl status postgresql
systemctl status nginx

# Verify SELinux is enforcing
getenforce
```

## Troubleshooting

If the conversion fails partway through:

```bash
# Check the Convert2RHEL log
cat /var/log/convert2rhel/convert2rhel.log

# If you created an LVM snapshot, roll back
sudo lvconvert --merge /dev/<vg_name>/pre-convert
sudo reboot
```

After a successful conversion, your system receives RHEL updates and support through your Red Hat subscription.
