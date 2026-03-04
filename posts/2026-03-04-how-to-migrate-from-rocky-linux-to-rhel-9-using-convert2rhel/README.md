# How to Migrate from Rocky Linux to RHEL 9 Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, Rocky Linux

Description: Step-by-step guide on migrate from rocky linux to rhel 9 using convert2rhel with practical examples and commands.

---

Convert2RHEL enables converting Rocky Linux to RHEL 9 for full Red Hat support and management.

## Prerequisites

- Rocky Linux 8 or 9
- Red Hat subscription with activation key
- Full backup

## Install Convert2RHEL

```bash
sudo dnf install -y https://ftp.redhat.com/redhat/convert2rhel/9/convert2rhel.repo
sudo dnf install -y convert2rhel
```

## Run Conversion

```bash
sudo convert2rhel --org <org-id> --activationkey <key-name> -y
```

## Post-Conversion

```bash
cat /etc/redhat-release
sudo subscription-manager status
sudo dnf update -y
sudo reboot
```

## Verify

```bash
# Ensure all Rocky Linux packages are replaced
rpm -qa | grep rocky
# Should return nothing

# Verify Red Hat repos
sudo dnf repolist
```

## Conclusion

Converting from Rocky Linux to RHEL 9 with Convert2RHEL is straightforward due to binary compatibility. After conversion, register with Satellite and Insights for full management capabilities.

