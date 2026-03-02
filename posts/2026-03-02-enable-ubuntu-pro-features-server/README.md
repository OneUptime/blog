# How to Enable Ubuntu Pro Features on Your Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Livepatch, Security

Description: A practical guide to enabling and configuring specific Ubuntu Pro features including ESM, Livepatch, FIPS, and CIS hardening tools on Ubuntu Server.

---

After attaching an Ubuntu Pro subscription, you have access to a range of optional services. Most are not enabled by default and require explicit activation. Knowing what each service does and how to configure it helps you make the most of the subscription.

## Reviewing Available Services

Once attached, see what your subscription includes:

```bash
# Show all services with their status
pro status --all

# Shorter version without --all shows only relevant services
pro status
```

The output lists each service as enabled, disabled, or not entitled (not included in your subscription tier).

## ESM: Extended Security Maintenance

ESM comes in two flavors that cover different package repositories:

- **esm-infra**: Security patches for packages in the Main and Restricted repositories, extended to 10 years
- **esm-apps**: Security patches for packages in the Universe repository

Both are typically enabled automatically on attachment. Verify:

```bash
pro status | grep esm
```

If not enabled:

```bash
sudo pro enable esm-infra
sudo pro enable esm-apps

# Update package lists to include ESM repositories
sudo apt update
```

After enabling, check which installed packages have available ESM updates:

```bash
# Show security status broken down by source
pro security-status

# Or use the apt-specific view
pro security-status --esm-apps
pro security-status --esm-infra
```

Install any pending ESM updates:

```bash
sudo apt upgrade
```

The ESM repositories appear in your apt sources:

```bash
cat /etc/apt/sources.list.d/ubuntu-esm-apps.list
cat /etc/apt/sources.list.d/ubuntu-esm-infra.list
```

## Livepatch: Kernel Updates Without Reboots

Livepatch applies security patches to the running kernel in memory, without requiring a reboot. This is particularly valuable for servers where reboots require maintenance windows and downtime.

### Checking Livepatch Status

```bash
# Check if Livepatch is running
sudo canonical-livepatch status

# Verbose output showing applied patches
sudo canonical-livepatch status --verbose
```

Example output:

```
kernel: 6.8.0-35-generic #35-Ubuntu SMP PREEMPT_DYNAMIC
server check-in: succeeded
patch state: ✓ all applicable livepatch modules inserted
patch version: 99.1
```

### Manually Checking for Patches

```bash
# Force a check for new patches (normally runs automatically)
sudo canonical-livepatch refresh

# View the patch history
sudo canonical-livepatch status --format json | python3 -m json.tool
```

### Livepatch Kernel Requirements

Livepatch supports specific kernel versions. Check compatibility:

```bash
uname -r
# The kernel version must be a supported GA or HWE kernel

# If using HWE kernel, verify support
pro status | grep livepatch
```

If Livepatch reports "kernel is not supported," you may be on a kernel version that has aged out of Livepatch support. Upgrade to the current HWE or GA kernel:

```bash
sudo apt install linux-generic-hwe-24.04
sudo reboot
```

### Disabling Livepatch

```bash
# Disable Livepatch (for testing or compliance reasons)
sudo pro disable livepatch

# Re-enable
sudo pro enable livepatch
```

## FIPS: Federal Information Processing Standards

FIPS 140-2 (and 140-3) certification is required for cryptographic modules used in US federal systems. Ubuntu Pro provides FIPS-certified versions of OpenSSL, OpenSSH, and the kernel cryptographic module.

### Understanding the FIPS Trade-offs

FIPS mode restricts cryptographic algorithms to NIST-approved ones. This means:
- Certain cipher suites become unavailable (e.g., RC4, MD5 for signatures)
- Some algorithms that are technically "stronger" may not be FIPS-approved
- Software that uses non-FIPS algorithms will fail

Enable FIPS only if you have a compliance requirement for it. It is not a net security improvement for all environments.

### Enabling FIPS

```bash
# Preview what FIPS enablement will change
sudo pro enable fips --dry-run

# Enable FIPS (requires reboot to take effect)
sudo pro enable fips

# Reboot
sudo reboot

# After reboot, verify FIPS is active
cat /proc/sys/crypto/fips_enabled
# Expected output: 1
```

### FIPS Updates

Standard FIPS packages are the certified versions, which may lag behind the latest upstream. FIPS-updates adds security patches while maintaining certification:

```bash
# Check both options
pro status | grep fips

# Enable FIPS with updates (recommended over base FIPS for production)
sudo pro enable fips-updates
```

## CIS Hardening

The Center for Internet Security (CIS) publishes hardening benchmarks. Ubuntu Pro includes `usg` (Ubuntu Security Guide) for applying and auditing CIS compliance.

### Installing USG

```bash
sudo pro enable usg
# This installs the usg package

sudo apt install usg
```

### Auditing Against CIS Benchmarks

```bash
# List available profiles
sudo usg audit --list

# Common profiles:
# cis_level1_server - CIS Level 1 for server environments
# cis_level2_server - CIS Level 2 (more restrictive)
# cis_level1_workstation - For desktop systems
# disa_stig - DISA STIG profile

# Run a Level 1 audit (read-only, no changes)
sudo usg audit cis_level1_server

# Save the report to a file
sudo usg audit cis_level1_server --html-file /tmp/cis-audit.html
```

### Applying CIS Hardening

```bash
# Preview what changes would be made
sudo usg fix cis_level1_server --dry-run

# Apply the hardening rules
sudo usg fix cis_level1_server

# Some rules require a reboot
sudo reboot

# Re-run the audit to verify compliance
sudo usg audit cis_level1_server
```

### Customizing CIS Rules

Not every CIS rule may apply to your environment. Create a tailoring file to exclude specific rules:

```bash
# Generate a default tailoring file
sudo usg generate-tailoring cis_level1_server --tailoring-file /etc/usg/custom-tailoring.xml

# Edit the tailoring file to disable specific rules
sudo nano /etc/usg/custom-tailoring.xml

# Apply with the custom tailoring
sudo usg fix cis_level1_server --tailoring-file /etc/usg/custom-tailoring.xml
```

## Real-Time Kernel

The real-time kernel is for workloads requiring deterministic, low-latency responses:

```bash
# Enable the real-time kernel (replaces the standard kernel)
sudo pro enable realtime-kernel

# After reboot, verify
uname -r
# Should show -realtime in the kernel name
```

This is primarily for industrial control systems, audio production, and financial trading platforms. General-purpose server workloads should not use this.

## Managing Services Centrally

For organizations managing many servers, Ubuntu Pro services can be configured via a configuration file:

```bash
# View the current configuration
cat /etc/ubuntu-advantage/uaclient.conf

# Example configuration for automated setups
sudo tee /etc/ubuntu-advantage/uaclient.conf << 'EOF'
contract_url: https://contracts.canonical.com
data_dir: /var/lib/ubuntu-advantage
log_level: debug
EOF
```

### Enabling Services via Cloud-Init

For automated deployments, configure Pro in cloud-init:

```yaml
#cloud-config

ubuntu_advantage:
  token: YOUR_TOKEN_HERE
  enable:
    - esm-infra
    - esm-apps
    - livepatch
```

This is useful for auto-scaling groups or infrastructure-as-code deployments where each new instance should be automatically Pro-attached.

## Monitoring Pro Service Health

```bash
# Check all service states at once
pro status

# Check for Pro-related systemd services
systemctl status ubuntu-advantage

# View Pro logs
sudo journalctl -u ubuntu-advantage -n 100

# Check Livepatch daemon
sudo systemctl status snap.canonical-livepatch.canonical-livepatch.service
```

## Security Status Overview

One of the most useful Pro features is the consolidated security status view:

```bash
# Full security audit
pro security-status

# Check specifically for CVE coverage
pro fix CVE-2024-XXXXX

# Get information about a specific CVE
pro fix --dry-run CVE-2024-XXXXX
```

The `pro fix` command can automatically apply the patch for a specific CVE if one is available in the Ubuntu repositories, which is useful for responding quickly to reported vulnerabilities.

Ubuntu Pro transforms a standard Ubuntu Server into a security-hardened, compliance-capable platform. The services complement each other: ESM provides broad package coverage, Livepatch reduces maintenance windows, and USG/CIS tools provide automated compliance verification.
