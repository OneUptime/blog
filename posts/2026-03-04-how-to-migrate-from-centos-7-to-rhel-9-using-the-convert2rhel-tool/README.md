# How to Migrate from CentOS 7 to RHEL 9 Using the Convert2RHEL Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, CentOS

Description: Step-by-step guide on migrate from centos 7 to rhel 9 using the convert2rhel tool with practical examples and commands.

---

Convert2RHEL enables in-place conversion from CentOS 7 to RHEL 7. This guide covers the complete migration process to RHEL 9 by following the conversion with Leapp upgrades.

## Prerequisites

- CentOS 7 system with latest updates applied
- Active Red Hat subscription
- Full system backup
- Network access to Red Hat CDN
- 64-bit Intel architecture

## Prepare the System

```bash
sudo sed -i 's/^mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=https://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
sudo yum update -y
sudo reboot
```

## Install Convert2RHEL

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-7-x86_64.repo
sudo yum install -y convert2rhel
```

## Run the Conversion

```bash
sudo tee -a /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = <organization_ID>
activation_key = <activation_key>
EOF

sudo convert2rhel analyze
sudo convert2rhel
sudo reboot
```

## Post-Conversion Steps

```bash
# Verify RHEL registration

sudo subscription-manager status

# Upgrade from RHEL 7 to RHEL 8 using Leapp
sudo subscription-manager repos --enable rhel-7-server-rpms
sudo subscription-manager repos --enable rhel-7-server-extras-rpms
sudo subscription-manager release --unset
sudo yum install -y leapp-upgrade
sudo yum update -y
sudo reboot
sudo leapp preupgrade --target 8.10
sudo leapp upgrade --target 8.10
sudo reboot

# Upgrade from RHEL 8 to RHEL 9 using Leapp
sudo rm -rf /usr/share/leapp-repository/repositories
sudo dnf install -y leapp-upgrade
sudo dnf update -y
sudo reboot
sudo leapp preupgrade --target 9.7
sudo leapp upgrade --target 9.7
sudo reboot
```

## Verify the Migration

```bash
cat /etc/redhat-release
sudo subscription-manager list --consumed
```

## Conclusion

Convert2RHEL provides a supported path from CentOS 7 to RHEL. Follow with Leapp upgrades to reach RHEL 9 for full lifecycle support.
