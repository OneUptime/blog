# How to Migrate from CentOS 7 to RHEL 9 Using the Convert2RHEL Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, CentOS

Description: Step-by-step guide on migrate from centos 7 to rhel 9 using the convert2rhel tool with practical examples and commands.

---

Convert2RHEL enables in-place conversion from CentOS 7 to RHEL. This guide covers the complete migration process.

## Prerequisites

- CentOS 7 system with latest updates applied
- Active Red Hat subscription
- Full system backup
- Network access to Red Hat CDN

## Prepare the System

```bash
sudo yum update -y
sudo reboot
```

## Install Convert2RHEL

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://www.redhat.com/security/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://ftp.redhat.com/redhat/convert2rhel/7/convert2rhel.repo
sudo yum install -y convert2rhel
```

## Run the Conversion

```bash
sudo convert2rhel --org <org-id> --activationkey <key-name>
```

## Post-Conversion Steps

```bash
# Verify RHEL registration
sudo subscription-manager status

# Upgrade to RHEL 8, then RHEL 9 using Leapp
sudo dnf install -y leapp-upgrade
sudo leapp preupgrade
sudo leapp upgrade
sudo reboot
```

## Verify the Migration

```bash
cat /etc/redhat-release
sudo subscription-manager list --consumed
```

## Conclusion

Convert2RHEL provides a supported path from CentOS 7 to RHEL. Follow with Leapp upgrades to reach RHEL 9 for full lifecycle support.

