# How to Migrate from Rocky Linux to RHEL 9 Using Convert2RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, Rocky Linux

Description: Step-by-step guide on migrate from rocky linux to rhel 9 using convert2rhel with practical examples and commands.

---

Convert2RHEL enables converting Rocky Linux to RHEL 9 for full Red Hat support and management.

## Prerequisites

- Rocky Linux 9 on a supported conversion path
- Red Hat subscription with activation key
- Full backup

## Install Convert2RHEL

```bash
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo
sudo dnf install -y convert2rhel
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

## Post-Conversion

```bash
sudo reboot
cat /etc/redhat-release
sudo subscription-manager status
sudo dnf update -y
```

## Verify

```bash
# Review third-party packages that remained unchanged

sudo dnf list extras --disablerepo="*" \
  --enablerepo="rhel-9-for-x86_64-baseos-rpms" \
  --enablerepo="rhel-9-for-x86_64-appstream-rpms"

# Verify Red Hat repos
sudo dnf repolist
```

## Conclusion

Converting from Rocky Linux to RHEL 9 with Convert2RHEL is straightforward due to binary compatibility. After conversion, register with Satellite and Insights for full management capabilities.
