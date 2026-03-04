# How to Migrate from Oracle Linux to RHEL 9 Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, Oracle Linux

Description: Step-by-step guide on migrate from oracle linux to rhel 9 using convert2rhel with practical examples and commands.

---

Convert2RHEL supports converting Oracle Linux systems to RHEL 9 for full Red Hat support coverage.

## Prerequisites

- Oracle Linux 8 or 9 system
- Active Red Hat subscription
- System backup completed

## Install Convert2RHEL

```bash
sudo dnf install -y https://ftp.redhat.com/redhat/convert2rhel/9/convert2rhel.repo
sudo dnf install -y convert2rhel
```

## Run the Conversion

```bash
sudo convert2rhel --org <org-id> --activationkey <key-name>
```

## Handle Oracle-Specific Packages

Convert2RHEL will:
- Replace Oracle Linux kernel with RHEL kernel
- Remove Oracle Linux branding packages
- Replace UEK kernel with RHEL kernel
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

