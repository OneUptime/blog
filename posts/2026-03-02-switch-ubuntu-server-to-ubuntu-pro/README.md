# How to Switch from Ubuntu Server to Ubuntu Pro

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Security, ESM

Description: How to attach an Ubuntu Pro subscription to an existing Ubuntu Server installation, enabling extended security maintenance, kernel livepatch, and additional compliance features.

---

Ubuntu Pro is Canonical's subscription offering that extends an Ubuntu Server installation with additional security coverage, compliance tools, and support options. Converting an existing Ubuntu Server to Ubuntu Pro does not require reinstalling - you attach a token to the running system.

## What Ubuntu Pro Adds

Free Ubuntu Server (LTS releases) includes:
- 5 years of security maintenance for the Main repository
- Standard Ubuntu packages

Ubuntu Pro adds:
- **ESM-Apps**: Security updates for 23,000+ packages in the Universe repository (those not covered by standard Ubuntu)
- **ESM-Infra**: Extended security maintenance up to 10 years for LTS releases (instead of 5)
- **Livepatch**: Kernel patching without reboots
- **FIPS**: FIPS 140-2 certified cryptography modules (for US government compliance)
- **CIS hardening**: Automated CIS benchmark compliance
- **USG**: Ubuntu Security Guide for DISA-STIG compliance
- **Real-time kernel**: Deterministic latency kernel (for industrial use cases)

For most organizations, the main draws are ESM (longer package security maintenance) and Livepatch (reduced reboot maintenance windows).

## Getting an Ubuntu Pro Token

Ubuntu Pro is free for up to 5 machines for personal use. For organizations, pricing is per machine.

1. Go to ubuntu.com/pro and sign in or create an Ubuntu SSO account
2. Navigate to the "Tokens" section
3. Copy your personal access token

For organizational subscriptions, tokens are managed through the company's Canonical account.

## Installing the ubuntu-advantage-tools Package

The `ua` command-line tool manages Ubuntu Pro attachments:

```bash
# Check if already installed
ua version

# If not installed (should be present on Ubuntu 18.04+)
sudo apt update
sudo apt install ubuntu-advantage-tools

# On newer Ubuntu versions, it is also available as 'pro'
pro version
```

The `ua` and `pro` commands are aliases for the same tool on recent Ubuntu versions.

## Attaching Ubuntu Pro

```bash
# Attach your Ubuntu Pro token
sudo pro attach YOUR_TOKEN_HERE

# Example
sudo pro attach C1234567890abcdefgh
```

The attachment process:
1. Validates the token with Canonical's servers
2. Identifies your Ubuntu version
3. Configures the available services for your subscription
4. Enables default services (varies by token type)

After successful attachment:

```bash
# Check the status
pro status
```

The output shows all available services and whether they are enabled:

```
SERVICE          ENTITLED  STATUS    DESCRIPTION
anbox-cloud      yes       disabled  Scalable Android in the cloud
cc-eal           yes       disabled  Common Criteria EAL2 Provisioning Packages
cis              yes       disabled  Security compliance and hardening tooling
esm-apps         yes       enabled   Expanded Security Maintenance for Applications
esm-infra        yes       enabled   Expanded Security Maintenance for Infrastructure
fips             yes       disabled  NIST-certified core packages
fips-updates     yes       disabled  NIST-certified core packages with priority security updates
livepatch        yes       enabled   Canonical Livepatch service
realtime-kernel  yes       disabled  Ubuntu kernel with PREEMPT_RT patches integrated
usg              yes       disabled  Security compliance and hardening tooling for CIS or DISA-STIG
```

## What Gets Enabled Automatically

When you attach Ubuntu Pro, some services enable by default:
- **esm-apps**: Enabled by default
- **esm-infra**: Enabled by default
- **livepatch**: Enabled by default (if the kernel is supported)

Others require explicit enablement.

## Enabling Livepatch

Livepatch keeps the kernel up to date with security patches without requiring a reboot:

```bash
# Check Livepatch status (usually auto-enabled with Pro)
pro status --all | grep livepatch

# Enable if not already enabled
sudo pro enable livepatch

# Check Livepatch service status
sudo canonical-livepatch status

# See detailed patch information
sudo canonical-livepatch status --verbose
```

Livepatch works only on long-term support kernels. Check if your kernel is supported:

```bash
uname -r
# GA (General Availability) kernels are supported
# HWE (Hardware Enablement) kernels are also supported from certain versions
```

## Enabling ESM Packages

With ESM enabled, `apt` accesses additional security repositories:

```bash
# Check ESM status
pro status | grep esm

# View ESM-covered packages
pro security-status

# After enabling ESM, update to get ESM package listings
sudo apt update

# See if any installed packages now have ESM updates
sudo pro security-status --esm-apps
```

## Enabling Additional Services

### FIPS Compliance

```bash
# Enable FIPS (requires reboot)
sudo pro enable fips

# WARNING: FIPS uses specific cryptographic modules that are stricter
# Some software may not work with FIPS-enabled OpenSSL
# Test thoroughly before enabling on production systems

# After reboot, verify FIPS is active
cat /proc/sys/crypto/fips_enabled
# Should output: 1
```

### CIS Hardening

```bash
# Enable the CIS compliance tool
sudo pro enable cis

# Run a CIS audit
sudo usg audit cis_level1_server

# Apply CIS hardening (review the changes first)
sudo usg fix cis_level1_server
```

### DISA-STIG

```bash
# Enable USG for DISA-STIG
sudo pro enable usg

# Audit against STIG profile
sudo usg audit disa_stig

# Apply STIG hardening
sudo usg fix disa_stig
```

## Checking Available Updates After Pro Attachment

After attaching Pro, run a security audit to see the impact:

```bash
# Show all security-related package statuses
pro security-status

# Check for available updates including ESM packages
sudo apt update
sudo apt list --upgradable 2>/dev/null

# Install available updates (now includes ESM packages)
sudo apt upgrade
```

## Pro on Cloud Instances

Cloud providers (AWS, Azure, GCP) offer Ubuntu Pro images that come pre-attached. If you launched a regular Ubuntu image on a cloud provider, you can still attach a Pro token:

```bash
# On cloud instances, you may also use cloud-specific Pro integration
# For AWS, Ubuntu Pro is available as a marketplace offering with hourly billing

# Check if already attached via cloud
pro status
```

## Verifying the Attachment

```bash
# Detailed status
pro status --all

# Account information
pro accounts

# Which token is attached
pro status | head -20
```

## Detaching If Needed

```bash
# Detach the Pro subscription (disables all Pro services)
sudo pro detach

# This removes Pro repositories and reverts to standard Ubuntu
# ESM packages installed will remain but will no longer receive updates
```

Switching to Ubuntu Pro is non-destructive and reversible. The main practical benefit for most organizations is ESM coverage for Universe packages, which significantly expands the set of packages receiving security updates. For organizations running regulated workloads, FIPS and STIG/CIS compliance tooling provides a streamlined path to certification requirements.
