# How to Enable Ubuntu Pro USN Fix for Security Patches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Pro, Security, USN, CVE Remediation

Description: Learn how to use the Ubuntu Pro USN fix feature to identify and remediate specific security vulnerabilities by CVE or USN number on Ubuntu servers.

---

Ubuntu Security Notices (USNs) are the official advisories Canonical publishes when security vulnerabilities are fixed in Ubuntu packages. Ubuntu Pro's `pro fix` command provides a targeted way to check whether a specific USN or CVE affects your system and, if it does, fix it in a single command.

This is more precise than running `apt upgrade` blindly - you can fix a specific CVE without touching the rest of your packages, which is valuable when change control policies require minimizing the scope of modifications during patch cycles.

## Understanding USNs and CVEs

- **CVE**: Common Vulnerabilities and Exposures. The industry-standard identifier for vulnerabilities (e.g., CVE-2024-1234)
- **USN**: Ubuntu Security Notice. Canonical's advisory that one or more CVEs have been fixed in Ubuntu packages (e.g., USN-6234-1)

A single USN often covers multiple CVEs. The `pro fix` command works with both.

## Installing and Updating ubuntu-advantage-tools

```bash
# The pro fix command requires ubuntu-advantage-tools
sudo apt update
sudo apt install --only-upgrade ubuntu-advantage-tools

# Verify the version
pro --version
# Needs to be 27.x or later for full fix functionality
```

## Checking if a CVE Affects Your System

```bash
# Check a specific CVE
sudo pro fix CVE-2024-1234

# Check a specific USN
sudo pro fix USN-6234-1
```

When you run this command, `pro fix` does the following:
1. Looks up the CVE/USN in Canonical's security database
2. Checks which packages are affected
3. Checks if those packages are installed on your system
4. Reports what needs to be done to fix it (standard apt upgrade, ESM package, or Ubuntu Pro required)

## Understanding pro fix Output

```bash
sudo pro fix CVE-2024-1086
```

Example output scenarios:

**Scenario 1: Already Fixed**
```
CVE-2024-1086: Linux kernel vulnerability
https://ubuntu.com/security/CVE-2024-1086

1 affected source package is installed: linux
(1/1) linux:
A fix is available in Ubuntu standard updates.
The update is already installed.

CVE-2024-1086 is resolved.
```

**Scenario 2: Fix Available via Standard Updates**
```
CVE-2024-1086: Linux kernel vulnerability
https://ubuntu.com/security/CVE-2024-1086

1 affected source package is installed: linux
(1/1) linux:
A fix is available in Ubuntu standard updates.
Found Linux kernel USN: USN-6725-2
Package upgrades available:
- linux-image-5.15.0-102-generic

Do you want to try upgrading now? (y/N)
```

**Scenario 3: Requires Ubuntu Pro (ESM)**
```
CVE-2024-XXXX: OpenSSL vulnerability
https://ubuntu.com/security/CVE-2024-XXXX

1 affected source package is installed: openssl
(1/1) openssl:
A fix is available in Ubuntu Pro: ESM Apps.
Ubuntu Pro with 'esm-apps' enabled is required for a fix.
pro enable esm-apps

Do you want to enable 'esm-apps' to apply the fix? (y/N)
```

## Applying Fixes

```bash
# Check and apply a specific CVE fix
sudo pro fix CVE-2024-1234

# Apply without interactive prompts (good for scripting)
# Note: as of recent versions, --no-prompt is available
sudo pro fix CVE-2024-1234 --no-prompt

# For a USN
sudo pro fix USN-6234-1
```

## Checking Multiple CVEs at Once

```bash
#!/bin/bash
# check_cves.sh - Check a list of CVEs against this system

CVE_LIST=(
    "CVE-2024-1086"
    "CVE-2024-0646"
    "CVE-2023-6931"
    "CVE-2023-46813"
)

echo "CVE Status Report for $(hostname)"
echo "Date: $(date)"
echo "---"

for cve in "${CVE_LIST[@]}"; do
    echo -n "$cve: "

    result=$(sudo pro fix "$cve" --no-prompt 2>&1)

    if echo "$result" | grep -q "is resolved"; then
        echo "RESOLVED"
    elif echo "$result" | grep -q "not affected"; then
        echo "NOT AFFECTED"
    elif echo "$result" | grep -q "esm-apps\|esm-infra"; then
        echo "REQUIRES ESM"
    elif echo "$result" | grep -q "upgrade"; then
        echo "FIX AVAILABLE"
    else
        echo "UNKNOWN"
    fi
done
```

## Security Status Overview

Instead of checking individual CVEs, get a system-wide security overview:

```bash
# Full security status report
sudo pro security-status

# This shows:
# - Total installed packages
# - Packages with available security updates
# - Packages requiring Ubuntu Pro for updates
# - Packages from third-party sources

# Example output:
# 1,247 packages installed:
#  743 packages from Ubuntu Main/Restricted repository
#  156 packages from Ubuntu Universe/Multiverse repository
#  124 packages from third-party sources
#
# Main/Restricted packages:
#  743 packages from Ubuntu Main are up to date.
#
# Universe/Multiverse packages:
#  10 packages from Ubuntu Universe/Multiverse can be upgraded with
#     ubuntu-security-status pro --format group
```

```bash
# Get details on what needs upgrading
sudo pro security-status --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)

packages = data.get('packages', [])
needing_update = [p for p in packages if p.get('status') != 'up-to-date']

for pkg in sorted(needing_update, key=lambda x: x.get('name', '')):
    print(f\"{pkg['name']}: {pkg.get('status')} (via {pkg.get('service', 'standard')})\")
"
```

## Automating Security Patch Reporting

For regular compliance reporting, run this as a scheduled job:

```bash
#!/bin/bash
# weekly_security_report.sh
# Generates a security status report for compliance

REPORT_FILE="/var/reports/security_$(hostname)_$(date +%Y%m%d).txt"
mkdir -p /var/reports

{
    echo "=== Security Patch Status Report ==="
    echo "Host: $(hostname -f)"
    echo "Date: $(date -u)"
    echo "Ubuntu: $(lsb_release -ds)"
    echo ""

    echo "=== Ubuntu Pro Status ==="
    pro status 2>/dev/null

    echo ""
    echo "=== Security Status Overview ==="
    pro security-status 2>/dev/null

    echo ""
    echo "=== Pending Package Updates ==="
    apt-get -s upgrade 2>/dev/null | grep "^Inst" | head -50

    echo ""
    echo "=== Security Updates Count ==="
    echo "Standard: $(apt-get -s upgrade 2>/dev/null | grep -c '^Inst')"
    echo "Security: $(apt-get -s upgrade 2>/dev/null | grep -c '^Inst.*security')"

} > "$REPORT_FILE"

echo "Report: $REPORT_FILE"

# Optionally email the report
# mail -s "Security Report: $(hostname)" ops@example.com < "$REPORT_FILE"
```

## Fixing All Available Security Issues

```bash
# Apply all standard security updates
sudo apt update
sudo apt upgrade -y

# Apply ESM security updates (requires esm to be enabled)
sudo pro enable esm-apps esm-infra  # If not already enabled
sudo apt update
sudo apt upgrade -y

# After upgrades, check remaining issues
sudo pro security-status
```

## pro fix in CI/CD and Automation

For automated environments:

```bash
# Check if a specific CVE is fixed before deploying
pro_check_cve() {
    local cve="$1"
    local result

    result=$(pro fix "$cve" --no-prompt 2>&1)

    if echo "$result" | grep -q "is resolved\|not affected"; then
        return 0  # Fixed or not affected
    else
        echo "WARNING: $cve may not be resolved"
        echo "$result"
        return 1
    fi
}

# Use in deployment scripts
CRITICAL_CVES=("CVE-2024-1086" "CVE-2023-46813")

for cve in "${CRITICAL_CVES[@]}"; do
    if ! pro_check_cve "$cve"; then
        echo "Deployment blocked: $cve not resolved"
        exit 1
    fi
done

echo "All critical CVEs resolved, proceeding with deployment"
```

## When pro fix Cannot Resolve a CVE

Some CVEs may not have a fix available:

```bash
sudo pro fix CVE-2024-XXXX
# Output: "A fix is not yet available."
```

In this case:
- Check Ubuntu's security page for the CVE for updates
- Apply mitigating controls (firewall rules, disabling affected features)
- Subscribe to USN notifications for when a fix becomes available

```bash
# Subscribe to Ubuntu security announcements
# https://lists.ubuntu.com/mailman/listinfo/ubuntu-security-announce
# Or use the Ubuntu security tracker:
# https://ubuntu.com/security/cve
```

The `pro fix` workflow is most valuable during incident response when you need to quickly determine whether a publicized vulnerability affects your servers and remediate it with minimal disruption to other packages. Combined with the security-status overview, it gives you a clear picture of your patch state at any given time.
