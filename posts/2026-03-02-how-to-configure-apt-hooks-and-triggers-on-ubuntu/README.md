# How to Configure APT Hooks and Triggers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Automation, Linux

Description: Learn how to configure APT hooks and dpkg triggers on Ubuntu to automate tasks before and after package installations, upgrades, and removals.

---

APT provides hook mechanisms that let you run custom scripts at specific points in the package management lifecycle before it invokes dpkg. These hooks are useful for automating post-install configuration, enforcing policies (like blocking installation of specific packages), sending notifications when packages are updated, and triggering configuration management runs after package changes. This guide covers the main hook types available on Ubuntu and practical examples of each.

## Types of Hooks

Ubuntu's package management pipeline has several hook points:

- **APT Update Pre-Invoke** - Runs before APT updates package indexes
- **APT Update Post-Invoke** - Runs after APT updates package indexes
- **APT Update Post-Invoke-Success** - Runs after successful package index updates only
- **DPkg Pre-Invoke** - Runs before APT invokes dpkg
- **DPkg Pre-Install-Pkgs** - Runs before dpkg installs packages, receives `.deb` filenames on stdin by default
- **DPkg Post-Invoke** - Runs after dpkg operations complete

These are configured in `/etc/apt/apt.conf.d/` files using APT's configuration syntax.

## DPkg Post-Invoke Hooks

Post-invoke hooks run after APT invokes dpkg for package install, upgrade, and removal operations. They're suitable for tasks like notifying monitoring systems, running configuration management, or logging package changes.

### Basic Configuration

```bash
# Create an APT configuration file for hooks

sudo tee /etc/apt/apt.conf.d/99local-hooks << 'EOF'
// Run after apt-get invokes dpkg for package operations
DPkg::Post-Invoke {
    "if [ -x /usr/local/bin/apt-post-hook.sh ]; then /usr/local/bin/apt-post-hook.sh; fi";
};

// Run after successful apt-get update operations only
APT::Update::Post-Invoke-Success {
    "if [ -x /usr/local/bin/after-apt-update.sh ]; then /usr/local/bin/after-apt-update.sh; fi";
};
EOF
```

### Logging Package Changes

```bash
#!/bin/bash
# /usr/local/bin/apt-post-hook.sh
# Logs all package installations, upgrades, and removals

LOG_FILE="/var/log/apt-package-history.log"
HOSTNAME=$(hostname -f)

# Get recently changed packages from dpkg log
RECENT_CHANGES=$(tail -20 /var/log/dpkg.log | \
    grep -E "(install|upgrade|remove)" | \
    awk '{print $3, $4, $5}')

if [[ -n "$RECENT_CHANGES" ]]; then
    echo "=== Package changes on $HOSTNAME at $(date) ===" >> "$LOG_FILE"
    echo "$RECENT_CHANGES" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/apt-post-hook.sh
```

### Sending Slack Notifications on Package Updates

```bash
#!/bin/bash
# /usr/local/bin/notify-security-updates.sh
# Sends a notification when security packages are updated

SLACK_WEBHOOK="https://hooks.slack.com/services/xxx/yyy/zzz"
HOSTNAME=$(hostname -f)

# Check if any security-related packages were recently updated
SECURITY_UPDATES=$(grep "upgrade" /var/log/dpkg.log | \
    tail -50 | \
    grep -E "(openssl|openssh|linux-image|glibc|libc6|sudo|curl|wget)" | \
    awk '{print $4, $5, "->",$6}')

if [[ -n "$SECURITY_UPDATES" ]]; then
    MESSAGE="Security package updates on *${HOSTNAME}*:\n```${SECURITY_UPDATES}```"
    PAYLOAD=$(printf '%s' "$MESSAGE" | \
        python3 -c 'import json, sys; print(json.dumps({"text": sys.stdin.read()}))')

    curl -s -X POST "$SLACK_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD"
fi
```

```bash
# /etc/apt/apt.conf.d/99security-notifications
DPkg::Post-Invoke {
    "if [ -x /usr/local/bin/notify-security-updates.sh ]; then /usr/local/bin/notify-security-updates.sh 2>/dev/null; fi";
};
```

## DPkg Pre-Install-Pkgs Hooks for Policy Enforcement

Pre-install hooks run after APT has resolved and downloaded packages but before it invokes dpkg. Use them to enforce policies based on the packages that are about to be installed or upgraded.

### Blocking Package Installation

```bash
# /etc/apt/apt.conf.d/99blocked-packages
// Run before dpkg installs packages to check for blocked packages
DPkg::Pre-Install-Pkgs {
    "if [ -x /usr/local/bin/check-package-policy.sh ]; then /usr/local/bin/check-package-policy.sh; fi";
};
```

```bash
#!/bin/bash
# /usr/local/bin/check-package-policy.sh
# Blocks installation of packages that violate company policy

# List of blocked packages
BLOCKED_PACKAGES=(
    "telnet"      # Insecure - use SSH instead
    "rsh-client"  # Insecure legacy tool
    "talk"        # Obsolete
)

# Get package names from the .deb filenames APT passes on stdin
PENDING_PACKAGES=$(
    while read -r deb_path; do
        dpkg-deb -f "$deb_path" Package 2>/dev/null
    done
)

for PKG in "${BLOCKED_PACKAGES[@]}"; do
    if echo "$PENDING_PACKAGES" | grep -Fxq "$PKG"; then
        echo "ERROR: Installation of '$PKG' is blocked by company policy." >&2
        echo "Use an approved alternative instead." >&2
        exit 1
    fi
done
```

## DPkg Pre-Install-Pkgs Hook

This hook receives the `.deb` filenames for packages being installed or upgraded on stdin before dpkg processes them. It's powerful for logging, auditing, or making decisions based on what's being changed. APT also supports newer `Pre-Install-Pkgs` protocol versions for more detailed package action data, but the default protocol sends one `.deb` path per line.

```bash
# /etc/apt/apt.conf.d/99dpkg-pre-hook
DPkg::Pre-Install-Pkgs {
    "/usr/local/bin/dpkg-pre-install.sh";
};
```

```bash
#!/bin/bash
# /usr/local/bin/dpkg-pre-install.sh
# Receives .deb filenames on stdin before installation
# Default input format: one .deb path per line

LOG_FILE="/var/log/dpkg-pre-install.log"

echo "=== Pre-install check at $(date) ===" >> "$LOG_FILE"

while read -r deb_path; do
    PACKAGE=$(dpkg-deb -f "$deb_path" Package 2>/dev/null)
    VERSION=$(dpkg-deb -f "$deb_path" Version 2>/dev/null)

    echo "install-or-upgrade $PACKAGE $VERSION ($deb_path)" >> "$LOG_FILE"

    # Example: Alert when kernel packages are being upgraded
    if echo "$PACKAGE" | grep -q "linux-image"; then
        echo "$(date): Kernel package being installed or upgraded: $PACKAGE $VERSION" | \
            logger -t dpkg-hook
    fi
done

exit 0  # Must exit 0 to allow the installation to proceed
        # Non-zero exit aborts the installation
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/dpkg-pre-install.sh
```

## Running Configuration Management After Package Changes

A common and valuable use case is triggering a Puppet, Ansible, or Salt run after package changes:

```bash
#!/bin/bash
# /usr/local/bin/apt-trigger-config-management.sh
# Triggers a configuration management run after package changes

LOCK_FILE="/var/lock/apt-config-management.lock"
LOG_FILE="/var/log/apt-config-management.log"

echo "$(date): Package change detected, triggering config management" >> "$LOG_FILE"

# Run Ansible in the background to avoid blocking apt
if command -v ansible-pull &>/dev/null; then
    nohup flock -n "$LOCK_FILE" ansible-pull \
        -U https://git.example.com/infra/ansible.git \
        --limit "$(hostname)" \
        >> "$LOG_FILE" 2>&1 &
    echo "$(date): Ansible pull triggered (PID: $!)" >> "$LOG_FILE"
fi
```

```bash
# /etc/apt/apt.conf.d/99config-management
DPkg::Post-Invoke {
    "if [ -x /usr/local/bin/apt-trigger-config-management.sh ]; then /usr/local/bin/apt-trigger-config-management.sh; fi";
};
```

## APT Update Post-Invoke-Success Hooks

This hook runs specifically after a successful `apt-get update` and is useful for checking whether security updates are available:

```bash
#!/bin/bash
# /usr/local/bin/check-security-updates.sh
# Called after apt-get update to check for pending security updates

REPORT_FILE="/var/run/pending-security-updates"

# Count pending security updates
SECURITY_COUNT=$(apt-get --just-print upgrade 2>/dev/null | \
    grep "^Inst " | \
    grep -i "security" | \
    wc -l)

if [[ "$SECURITY_COUNT" -gt 0 ]]; then
    echo "$SECURITY_COUNT" > "$REPORT_FILE"
    echo "$(date): $SECURITY_COUNT security updates pending" | \
        logger -t apt-hook
else
    rm -f "$REPORT_FILE"
fi
```

```bash
# /etc/apt/apt.conf.d/99security-check
APT::Update::Post-Invoke-Success {
    "if [ -x /usr/local/bin/check-security-updates.sh ]; then /usr/local/bin/check-security-updates.sh; fi";
};
```

## Creating a Comprehensive Audit Hook

Combine multiple features into an audit log that captures all package changes with context:

```bash
#!/bin/bash
# /usr/local/bin/apt-audit-hook.sh
# Creates a structured audit trail of all package changes

AUDIT_LOG="/var/log/apt-audit.json"
HOSTNAME=$(hostname -f)

# Get the invoking process and user for audit context
CALLER_PID=$$
CALLER_CMD=$(cat /proc/$PPID/cmdline 2>/dev/null | tr '\0' ' ' | head -c 100)
CALLER_USER=$(stat -c %U /proc/$PPID 2>/dev/null || echo "unknown")
SUDO_USER="${SUDO_USER:-$USER}"

json_escape() {
    python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()), end="")'
}

# Extract recent dpkg operations
RECENT_OPS=$(grep "$(date '+%Y-%m-%d')" /var/log/dpkg.log 2>/dev/null | \
    grep -E "(install |upgrade |remove |purge )" | \
    tail -20 | \
    while IFS=' ' read -r date time action pkg ver1 ver2; do
        echo "  {\"time\":\"$date $time\",\"action\":\"$action\",\"package\":\"$pkg\"}"
    done | \
    paste -sd, -)

# Write JSON audit entry
cat >> "$AUDIT_LOG" << EOF
{"timestamp":"$(date -Iseconds)","host":$(printf '%s' "$HOSTNAME" | json_escape),"user":$(printf '%s' "$SUDO_USER" | json_escape),"caller":$(printf '%s' "$CALLER_CMD" | json_escape),"operations":[$RECENT_OPS]}
EOF
```

```bash
# /etc/apt/apt.conf.d/99audit
DPkg::Post-Invoke {
    "if [ -x /usr/local/bin/apt-audit-hook.sh ]; then /usr/local/bin/apt-audit-hook.sh; fi";
};
```

## Testing Hooks

Always test hooks before deploying them:

```bash
# Test a hook script directly
sudo /usr/local/bin/apt-post-hook.sh

# Test with a dry-run apt operation
sudo apt-get -s install wget  # -s means simulate, no actual changes

# Check if hooks are configured correctly
apt-config dump | grep -E "(Pre-Invoke|Post-Invoke)"

# Enable debug mode to see hook execution
sudo apt-get install -o Debug::pkgDPkgPM=1 --reinstall wget 2>&1 | \
  grep -E "(hook|invoke)"
```

## Common Pitfalls

- **Hooks that fail exit non-zero**: If a Pre-Invoke or Pre-Install-Pkgs hook exits with a non-zero code, APT aborts the operation. Be careful with error handling in hooks that should be advisory only.
- **Long-running hooks block apt**: APT waits for hook scripts to complete. Use `nohup` and `&` to run long operations in the background.
- **Sensitive data in logs**: Hook scripts often log package names and versions. Ensure log files have appropriate permissions if they might contain version info that reveals vulnerabilities.
- **Hook ordering**: Multiple hook files in `/etc/apt/apt.conf.d/` execute alphabetically. Name files with numeric prefixes to control order.

APT hooks provide a lightweight automation layer on top of package management that integrates well with existing workflows without requiring additional daemons or agents.
