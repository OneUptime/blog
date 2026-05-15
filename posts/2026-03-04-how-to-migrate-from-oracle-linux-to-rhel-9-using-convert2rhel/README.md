# How to Migrate from Oracle Linux to RHEL 9 Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, Oracle Linux

Description: Step-by-step guide on migrate from oracle linux to rhel 9 using convert2rhel with practical examples and commands.

---

Convert2RHEL supports converting supported Oracle Linux 9 systems to the corresponding RHEL 9 minor release for full Red Hat support coverage.

## Prerequisites

- Oracle Linux 9 system on a supported minor version
- Active Red Hat subscription
- System backup completed
- Booted into Oracle's Red Hat Compatible Kernel (RHCK), not UEK

## Install Convert2RHEL

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo
sudo dnf install -y convert2rhel
```

## Run the Conversion

```bash
sudo tee /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = <organization_ID>
activation_key = <activation_key>
EOF

sudo convert2rhel analyze
sudo convert2rhel
```

## Handle Oracle-Specific Packages

Convert2RHEL will:
- Replace Oracle Linux kernel with RHEL kernel
- Remove Oracle Linux branding packages
- Update repository configuration

## Post-Conversion

```bash
# Verify conversion

cat /etc/redhat-release
sudo subscription-manager status
sudo dnf update -y

# Reboot with RHEL kernel
sudo reboot
```

## Verify Kernel

```bash
uname -r
# Should show a RHEL kernel, not UEK
```

## Conclusion

Convert2RHEL provides a straightforward path from Oracle Linux to RHEL. After conversion, you gain access to Red Hat support, Insights, and the full RHEL ecosystem.
