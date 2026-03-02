# How to Manage Ubuntu Extended Security Maintenance (ESM)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ESM, Security, Ubuntu Pro

Description: How to enable, configure, and manage Ubuntu Extended Security Maintenance to keep packages secure beyond standard support windows, including monitoring ESM package updates.

---

Ubuntu Extended Security Maintenance (ESM) is the security update service that covers packages beyond the standard 5-year LTS maintenance window. It comes in two forms: ESM-Infra for core system packages and ESM-Apps for the broader Universe repository. Both are available through Ubuntu Pro.

## Understanding ESM Coverage

Ubuntu's package repository has two major sections:

- **Main**: Core packages maintained directly by Canonical. Standard LTS provides 5 years of security updates here.
- **Universe**: Community-maintained packages. Standard LTS does not guarantee security updates for Universe packages.

ESM extends this coverage:
- **ESM-Infra**: Extends Main/Restricted security coverage from 5 years to 10 years
- **ESM-Apps**: Provides security updates for 23,000+ Universe packages

Without ESM, running Ubuntu 18.04 LTS past April 2023 (its standard EOL) means receiving no security updates. With ESM-Infra, that extends to April 2028.

## Checking Your Current ESM Status

```bash
# View overall Pro and ESM status
pro status

# Check specifically what ESM covers on your system
pro security-status

# Show packages by their security coverage
pro security-status --format json | python3 -m json.tool
```

The `security-status` command categorizes installed packages into groups:
- **supported**: Package receives standard Ubuntu security updates
- **esm-apps**: Package receives updates via ESM-Apps
- **esm-infra**: Package receives updates via ESM-Infra
- **end-of-life**: Package is no longer receiving any updates

## Enabling ESM on an Ubuntu Pro System

If not already enabled after attaching Pro:

```bash
# Enable ESM for infrastructure packages
sudo pro enable esm-infra

# Enable ESM for application packages
sudo pro enable esm-apps

# Update package lists to include ESM repositories
sudo apt update
```

After enabling, verify the repositories were added:

```bash
ls /etc/apt/sources.list.d/ | grep esm
# Should show:
# ubuntu-esm-apps.list
# ubuntu-esm-infra.list

# View repository contents
cat /etc/apt/sources.list.d/ubuntu-esm-apps.list
```

## Checking for ESM Package Updates

ESM updates appear in the regular `apt upgrade` workflow:

```bash
# Update package lists (includes ESM repos when enabled)
sudo apt update

# See all available upgrades, including ESM ones
apt list --upgradable

# View upgrades with their source repository
apt list --upgradable | grep esm
```

To see only packages that have ESM updates available:

```bash
# Show packages with ESM updates
pro security-status --esm-apps
pro security-status --esm-infra
```

The output lists packages that have available security updates from each ESM source.

## Installing ESM Updates

ESM updates integrate with standard apt commands:

```bash
# Install all available updates (includes ESM)
sudo apt upgrade

# Install only security updates (including ESM)
sudo apt-get -s upgrade | grep -i security
sudo unattended-upgrades --dry-run

# Force install ESM updates for a specific package
sudo apt install --only-upgrade specific-package-name
```

## Automating ESM Updates with unattended-upgrades

Configure unattended-upgrades to include ESM repositories:

```bash
sudo apt install unattended-upgrades

# Edit the configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Add ESM origins to the allowed upgrades list:

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
    // Optional: include regular updates too
    // "${distro_id}:${distro_codename}-updates";
};
```

Enable automatic updates:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Verify the configuration
sudo unattended-upgrades --dry-run --debug 2>&1 | head -50
```

## Identifying Packages Without Security Coverage

One of ESM's most valuable uses is identifying packages that are not receiving security updates:

```bash
# Full security status of all installed packages
pro security-status

# Show only packages with no security updates available
pro security-status | grep "End of Standard Support"

# Show packages from Universe that are unpatched without ESM
apt list --installed 2>/dev/null | while read pkg _; do
    pkg_name="${pkg%%/*}"
    source=$(apt-cache showpkg "$pkg_name" 2>/dev/null | grep "^Package:")
    echo "$pkg_name"
done | head -20
```

A cleaner approach using the built-in tools:

```bash
# Export security status as JSON for analysis
pro security-status --format json > /tmp/security-status.json

# Find packages with no coverage
python3 -c "
import json
with open('/tmp/security-status.json') as f:
    data = json.load(f)
for pkg in data.get('packages', []):
    if pkg.get('status') == 'end-of-life':
        print(pkg['name'], '-', pkg.get('description', ''))
"
```

## Checking CVE Coverage

ESM directly affects your vulnerability exposure. Check specific CVEs:

```bash
# Check if a specific CVE is patched on your system
pro fix CVE-2024-12345

# Output shows whether the patch is available and if it requires ESM
# Example output:
# CVE-2024-12345 (HIGH)
# https://ubuntu.com/security/CVE-2024-12345
# 1 affected package installed: libssl3
# (1/1) libssl3:
#   A fix is available in Ubuntu Pro: ESM Apps.
#   The update can be installed with: apt install libssl3

# Dry run to see what would be done
pro fix --dry-run CVE-2024-12345
```

## ESM for Older Ubuntu Releases

If you are running Ubuntu 16.04 or 18.04, ESM may be the only source of security updates (depending on release dates):

```bash
# Check EOL status
ubuntu-support-status

# Or check via pro
pro status
# If the release is past standard EOL, the status shows accordingly
```

For 16.04 Xenial (past EOL in 2021, ESM through 2026) and 18.04 Bionic (EOL April 2023, ESM through 2028):

```bash
# Attach Pro to get updates
sudo pro attach YOUR_TOKEN

# After attachment, ESM is available
sudo apt update
sudo apt upgrade
```

## ESM on Cloud Providers

Major cloud providers offer Ubuntu Pro images with ESM pre-configured:

- AWS: Ubuntu Pro images in the AMI marketplace
- Azure: Ubuntu Pro images with Pro baked in
- GCP: Ubuntu Pro images available

On these images, ESM is automatically enabled without a separate token:

```bash
# On Ubuntu Pro cloud images
pro status
# Should show esm-apps and esm-infra as enabled automatically
```

## Monitoring ESM Coverage in Your Organization

For organizations managing multiple servers, track ESM status across the fleet:

```bash
# Script to check ESM status on multiple hosts
for host in server1 server2 server3; do
    echo "=== $host ==="
    ssh "$host" "pro security-status --format json" | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
summary = data.get('summary', {})
print('ESM-Infra:', summary.get('esm_infra_enabled', False))
print('ESM-Apps:', summary.get('esm_apps_enabled', False))
print('Packages needing ESM:', summary.get('num_esm_apps_packages', 0))
"
done
```

## Understanding the ESM Package Count

When you run `pro security-status`, you may see a number like "23 packages could receive ESM security updates." This number represents Universe packages that have a published CVE fix available only through ESM.

```bash
# See the actual packages in this category
pro security-status --esm-apps

# Example output:
# 2 packages installed from Ubuntu Universe/Multiverse
#   Updates available for these via esm-apps:
#   - curl (7.81.0-1ubuntu1 -> 7.81.0-1ubuntu1.17)
#   - libcurl4 (7.81.0-1ubuntu1 -> 7.81.0-1ubuntu1.17)
```

This helps prioritize which packages to update and justifies the ESM subscription from a risk management perspective.

## Disabling ESM Services

If you need to disable ESM for testing or compliance review:

```bash
# Disable ESM-Apps
sudo pro disable esm-apps

# Disable ESM-Infra
sudo pro disable esm-infra

# Re-enable later
sudo pro enable esm-apps
sudo pro enable esm-infra
sudo apt update
```

ESM is one of the more straightforward security investments available for Ubuntu environments. It is particularly important for organizations running older LTS releases that are past standard support but not yet migrated to a newer version, and for any environment that relies heavily on Universe packages.
