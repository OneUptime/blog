# How to Attach Ubuntu Pro to Your Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Security, ESM, Compliance

Description: A step-by-step guide to attaching Ubuntu Pro to your Ubuntu server, covering token acquisition, the pro attach command, and enabling security services like ESM and Livepatch.

---

Ubuntu Pro is Canonical's extended support subscription for Ubuntu. On top of the standard Ubuntu package set, it adds Extended Security Maintenance (ESM) for thousands of additional packages, access to Livepatch (kernel updates without reboots), FIPS compliance tools, and security hardening automation.

For individuals and small teams, Ubuntu Pro is free for up to 5 machines through Canonical's personal token program. For enterprises, it is a paid subscription that comes with Canonical support.

## What Ubuntu Pro Adds

- **ESM-infra**: Security patches for Ubuntu's main and restricted repositories beyond the standard 5-year LTS window
- **ESM-apps**: Security patches for 23,000+ packages in the Ubuntu universe repository
- **Livepatch**: Kernel security patches applied without rebooting
- **FIPS**: FIPS 140 certified cryptographic modules for compliance
- **CIS hardening**: Automated security benchmarks
- **USG (Ubuntu Security Guide)**: Compliance automation for CIS and DISA-STIG
- **USGR**: Real-time USN (Ubuntu Security Notices) remediation

## Getting a Ubuntu Pro Token

### Free Personal Token (Up to 5 Machines)

1. Create or log into an Ubuntu One account at https://ubuntu.com/pro
2. Click on "Get Ubuntu Pro"
3. Choose "Personal" (free, 5 machines max)
4. Your token is displayed on the dashboard

### Enterprise Token

For enterprise subscriptions, tokens are available in the Ubuntu Pro portal after purchase. Contact Canonical for quotes on large deployments.

## Installing the ubuntu-advantage-tools

Ubuntu 20.04 and later include `ubuntu-advantage-tools` (the `pro` command), but keep it updated:

```bash
# Update to the latest version of ua-client
sudo apt update
sudo apt install --only-upgrade ubuntu-advantage-tools

# Or install if missing
sudo apt install -y ubuntu-advantage-tools

# Verify version
pro --version
```

## Attaching Ubuntu Pro

```bash
# Attach your server to Ubuntu Pro using your token
sudo pro attach <your-token-here>

# Example output:
# Attaching the machine...
# Enabling default service esm-infra
# Updating package lists
# Ubuntu Pro: ESM Infra enabled
# Enabling default service livepatch
# Installing Livepatch...
# Canonical livepatch enabled.
# This machine is now attached to 'Ubuntu Pro'
```

The attach command:
- Registers the machine with Canonical's systems
- Enables ESM-infra by default
- Enables Livepatch if the kernel is supported

## Checking Pro Status

```bash
# View current status and enabled services
pro status

# Detailed output
pro status --all

# Example output:
# SERVICE          ENTITLED  STATUS    DESCRIPTION
# anbox-cloud      yes       disabled  Scalable Android in the cloud
# cc-eal           yes       disabled  Common Criteria EAL2 Provisioning Packages
# esm-apps         yes       enabled   Expanded Security Maintenance for Applications
# esm-infra        yes       enabled   Expanded Security Maintenance for Infrastructure
# fips             yes       disabled  NIST-certified core packages
# fips-updates     yes       disabled  NIST-certified core packages with priority security updates
# livepatch        yes       enabled   Canonical Livepatch service
# usg              yes       disabled  Security compliance and audit tools
```

## Enabling and Disabling Services

```bash
# Enable a specific service
sudo pro enable esm-apps

# Enable FIPS (requires reboot)
sudo pro enable fips

# Enable CIS hardening tools
sudo pro enable usg

# Disable a service
sudo pro disable livepatch

# Enable with confirmation bypass (useful in scripts)
sudo pro enable esm-apps --assume-yes
```

## ESM Packages

With ESM enabled, you get security updates for packages that would otherwise stop receiving them:

```bash
# After enabling esm-apps, update package lists
sudo apt update

# Check which packages have ESM updates available
pro security-status

# Install ESM updates
sudo apt upgrade

# Show which installed packages have available ESM updates
apt list --upgradable 2>/dev/null | grep ESM
```

The `pro security-status` command is particularly useful - it gives a breakdown of which packages have available security fixes, which require Ubuntu Pro, and which are up to date:

```bash
sudo pro security-status

# Example output shows:
# 1023 packages installed:
#  743 packages from Ubuntu Main/Restricted repository
#  156 packages from Ubuntu Universe/Multiverse repository
#  124 packages from third-party sources
#
# To get more information about the security status of specific packages,
# run 'pro security-status --help' for a list of options.
```

## Attaching Pro in Automation

For automated server provisioning, pass the token via environment variable or configuration:

```bash
# In a script or cloud-init
PRO_TOKEN="${UBUNTU_PRO_TOKEN}"  # Set in environment or secrets manager

if [ -n "$PRO_TOKEN" ]; then
    sudo pro attach "$PRO_TOKEN"
fi
```

Via cloud-init:

```yaml
# cloud-config
ubuntu_advantage:
  token: <your-token>
  enable:
    - esm-infra
    - esm-apps
    - livepatch
```

Via Ansible:

```yaml
# ansible playbook task
- name: Attach Ubuntu Pro
  command: pro attach {{ ubuntu_pro_token }}
  args:
    creates: /var/lib/ubuntu-advantage/machine-token.json
  when: ubuntu_pro_token is defined
  become: yes
```

## Detaching Ubuntu Pro

```bash
# Detach the machine (removes Pro features, preserves system)
sudo pro detach

# After detaching:
# - ESM packages remain installed but won't receive further updates
# - Livepatch is disabled
# - FIPS modules remain if enabled (requires work to reverse)
```

## Fixing Issues with pro attach

### Machine Already Attached

```bash
# If the machine shows as already attached
pro status

# Detach and re-attach if needed
sudo pro detach
sudo pro attach <token>
```

### Token Invalid or Expired

```bash
# Check your token status in the Ubuntu Pro portal
# https://ubuntu.com/pro

# Tokens associated with the free personal tier have machine limits
# Check how many machines are already using the token
```

### Network Issues

```bash
# ubuntu-advantage-tools needs to reach:
# - contracts.canonical.com (HTTPS/443)
# - esm.ubuntu.com (HTTPS/443)

# Test connectivity
curl -s https://contracts.canonical.com/ | head -5

# If behind a proxy, configure it
export https_proxy="http://proxy.example.com:3128"
sudo pro attach <token>

# Persistent proxy configuration
sudo pro config set https_proxy http://proxy.example.com:3128
```

## Viewing Available Security Fixes

```bash
# List known CVEs affecting your system
sudo pro fix CVE-2023-XXXXX

# List USNs (Ubuntu Security Notices)
# pro fix can apply fixes for specific CVEs
sudo pro fix USN-XXXX-X

# Check if specific CVE is fixed on your system
pro fix CVE-2024-1234
```

## Managing Multiple Servers

For managing Pro status across a fleet, the `pro` command works well with automation:

```bash
#!/bin/bash
# check_pro_status.sh - Verify Pro is attached and services enabled

REQUIRED_SERVICES=("esm-infra" "esm-apps")

if ! pro status --format json | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d['attached'] else 1)"; then
    echo "ERROR: Machine not attached to Ubuntu Pro"
    exit 1
fi

for service in "${REQUIRED_SERVICES[@]}"; do
    status=$(pro status --format json | python3 -c "
import json, sys
d = json.load(sys.stdin)
for s in d['services']:
    if s['name'] == '$service':
        print(s['status'])
        break
")
    if [ "$status" != "enabled" ]; then
        echo "WARNING: $service is not enabled (status: $status)"
    else
        echo "OK: $service is enabled"
    fi
done
```

Ubuntu Pro's value proposition is strongest on servers that need to run beyond the standard LTS support window, those in environments requiring compliance certifications, or any production system where comprehensive security coverage across all installed packages matters.
