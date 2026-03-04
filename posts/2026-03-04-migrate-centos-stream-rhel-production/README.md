# How to Migrate from CentOS Stream to RHEL in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CentOS Stream, Migration, Convert2RHEL, Production, Linux

Description: Migrate production CentOS Stream systems to RHEL using Convert2RHEL, ensuring a smooth transition with minimal downtime.

---

CentOS Stream is a rolling-release distribution that tracks ahead of RHEL minor releases. Converting a CentOS Stream system to RHEL gives you stable, supported packages with predictable lifecycle guarantees.

## Prerequisites

```bash
# Verify the current CentOS Stream version
cat /etc/redhat-release
# Example: CentOS Stream release 9

# Update the system fully before converting
sudo dnf update -y

# Ensure the system has an active network connection
ping -c 3 subscription.rhsm.redhat.com
```

## Creating a Pre-Conversion Backup

Always back up before converting production systems:

```bash
# Create a full system backup
sudo tar czpf /backup/centos-stream-pre-convert-$(date +%Y%m%d).tar.gz \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp --exclude=/backup /

# If using LVM, create a snapshot as a fallback
sudo lvcreate --size 10G --snapshot --name pre-convert /dev/rhel/root
```

## Installing Convert2RHEL

```bash
# Install the Convert2RHEL repository for CentOS Stream 9
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://ftp.redhat.com/redhat/convert2rhel/9/convert2rhel.repo

# Install Convert2RHEL
sudo dnf install -y convert2rhel
```

## Running the Conversion

```bash
# Run Convert2RHEL with an activation key (recommended for automation)
sudo convert2rhel --org <your_org_id> --activationkey <your_key> -y

# Or use username and password
sudo convert2rhel --username <rhn_user> --password <rhn_pass> -y
```

Convert2RHEL will:
1. Verify system compatibility
2. Replace CentOS Stream repositories with RHEL repositories
3. Replace CentOS-branded packages with RHEL equivalents
4. Register the system with Red Hat Subscription Management

## Post-Conversion Steps

```bash
# Reboot into the RHEL kernel
sudo reboot

# Verify the system is now RHEL
cat /etc/redhat-release

# Check subscription status
sudo subscription-manager status

# Verify all packages are from RHEL repos
sudo dnf distro-sync -y

# Check for any remaining CentOS packages
rpm -qa | grep -i centos
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
sudo lvconvert --merge /dev/rhel/pre-convert
sudo reboot
```

After a successful conversion, your system receives RHEL updates and support through your Red Hat subscription.
