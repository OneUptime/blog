# How to Migrate from AlmaLinux to RHEL 9 for Full Red Hat Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, AlmaLinux

Description: Step-by-step guide on migrate from almalinux to rhel 9 for full red hat support with practical examples and commands.

---

Converting from AlmaLinux to RHEL 9 provides full Red Hat support and access to the complete RHEL ecosystem.

## Prerequisites

- A supported AlmaLinux 9 minor release for conversion to the corresponding RHEL 9 minor release
- Red Hat subscription
- System backup

## Install Convert2RHEL

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo
sudo yum -y install convert2rhel
```

## Run Conversion

```bash
sudo tee /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = <org-id>
activation_key = <key-name>
EOF

sudo convert2rhel analyze
sudo convert2rhel -y
```

## Post-Conversion Verification

```bash
cat /etc/redhat-release
sudo subscription-manager status

# Verify no AlmaLinux packages remain

rpm -qa | grep almalinux
# Review any remaining AlmaLinux-branded packages

sudo dnf update -y
sudo reboot
```

## Enable Red Hat Ecosystem

```bash
# Register with Insights
sudo dnf install -y insights-client
sudo insights-client --register

# Connect with rhc
sudo dnf install -y rhc
sudo rhc connect
```

## Conclusion

AlmaLinux to RHEL 9 conversion is seamless with Convert2RHEL. After conversion, take advantage of Red Hat Insights, Satellite, and commercial support for enterprise management.
