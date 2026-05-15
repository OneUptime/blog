# How to Migrate from AlmaLinux to RHEL for Full Red Hat Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AlmaLinux, Migration, Convert2RHEL, Linux

Description: Convert AlmaLinux systems to RHEL using Convert2RHEL to gain full Red Hat support, certifications, and security SLAs.

---

AlmaLinux is ABI-compatible with RHEL, making in-place conversion with Convert2RHEL straightforward. Organizations typically make this move when they need vendor support for compliance, ISV certification, or incident response SLAs.

## Why Convert from AlmaLinux to RHEL

- ISV software requires a RHEL subscription for support
- Compliance frameworks require a vendor-supported OS
- You need 24/7 phone support and guaranteed response times
- You want access to Red Hat Insights for proactive management

## Prerequisites

```bash
# Check your AlmaLinux version

cat /etc/almalinux-release
# AlmaLinux release 9.7 (Moss Jungle Cat)

# Update to a minor version supported by Convert2RHEL
sudo dnf update -y
sudo reboot

# Create a backup or VM snapshot
```

## Install and Run Convert2RHEL

```bash
# Add the Convert2RHEL repository
sudo curl -o /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release \
  https://security.access.redhat.com/data/fd431d51.txt
sudo curl -o /etc/yum.repos.d/convert2rhel.repo \
  https://cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo

# Install the conversion tool
sudo dnf install convert2rhel -y

# Configure Red Hat Subscription Manager credentials for the conversion
sudo tee /etc/convert2rhel.ini >/dev/null <<'EOF'
[subscription_manager]
org = your-org-id
activation_key = your-key
EOF

# Run the analysis first
sudo convert2rhel analyze
```

## Execute the Conversion

```bash
# Perform the in-place conversion
sudo convert2rhel -y

# Monitor the output. The tool will:
# - Remove almalinux-release and related branding packages
# - Install redhat-release and RHEL packages
# - Configure RHEL repositories
# - Register with subscription-manager
```

## Post-Conversion Steps

```bash
# Reboot into the RHEL kernel
sudo reboot

# Verify RHEL is installed
cat /etc/redhat-release
# Red Hat Enterprise Linux release 9.7 (Plow)

# Confirm subscription is active
sudo subscription-manager status
sudo subscription-manager identity

# Clean up any remaining AlmaLinux packages
rpm -qa | grep -i alma
sudo dnf remove almalinux-release 2>/dev/null

# Verify RHEL repositories
sudo dnf repolist
```

## Enable Red Hat Insights

One of the benefits of RHEL is access to Red Hat Insights for proactive system analysis:

```bash
# Install and register with Insights
sudo dnf install insights-client
sudo insights-client --register

# Run an initial compliance check
sudo insights-client --compliance

# View recommendations
sudo insights-client --show-results
```

## Verify Application Compatibility

```bash
# Check all services are running
systemctl --failed

# Verify critical applications
for svc in httpd nginx postgresql mariadb; do
    STATUS=$(systemctl is-active "$svc" 2>/dev/null)
    if [ "$STATUS" = "active" ]; then
        echo "$svc: running"
    fi
done

# Test application endpoints
curl -s -o /dev/null -w "%{http_code}" http://localhost/
```

## Re-enable EPEL

```bash
# Enable CodeReady Linux Builder, which EPEL packages can depend on
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms

# Install EPEL for RHEL 9
sudo dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Verify EPEL packages are accessible
sudo dnf repolist | grep epel
```

After conversion, you have a RHEL system eligible for Red Hat support for Red Hat packages. Open a Red Hat support case to verify your subscription is working correctly if this is your first conversion.
