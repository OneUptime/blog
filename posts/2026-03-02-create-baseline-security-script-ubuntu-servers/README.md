# How to Create a Baseline Security Script for Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, System Administration, Scripting

Description: Build a reusable baseline security script for Ubuntu servers that enforces consistent hardening across all new deployments in your infrastructure.

---

Every time a new Ubuntu server spins up, there is a gap between the stock configuration and a reasonably secure state. Closing that gap manually is tedious and inconsistent. A baseline security script solves this by encoding your organization's minimum security requirements into an executable form that runs once at provisioning time, or on demand for drift detection.

## What a Baseline Script Should Cover

A useful baseline security script covers:

- Package updates and unnecessary software removal
- User account and authentication policies
- SSH configuration
- Firewall setup
- File permission hardening
- Kernel parameter tuning
- Basic audit logging

The goal is not to replace a full CIS Benchmark audit but to bring every server to a consistent, acceptable minimum before anything else runs on it.

## Script Structure and Conventions

Organize the script with clear sections, idempotent operations, and logging from the start. An idempotent script can run multiple times without breaking things it already configured.

```bash
#!/bin/bash
# Ubuntu Server Baseline Security Script
# Run as root at provisioning or on demand

set -uo pipefail

SCRIPT_VERSION="1.2"
LOG="/var/log/baseline-security.log"
ERRORS=0

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

ok() { echo -e "${GREEN}[OK]${NC} $*"; log "OK: $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; log "WARN: $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; log "FAIL: $*"; ERRORS=$((ERRORS + 1)); }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root"
    exit 1
fi

log "=== Baseline Security Script v${SCRIPT_VERSION} starting on $(hostname) ==="
```

## Update the System

```bash
update_system() {
    log "--- Package Updates ---"

    # Update package lists
    if apt-get update -qq; then
        ok "Package lists updated"
    else
        fail "apt-get update failed"
        return
    fi

    # Apply security updates only (safer for production systems)
    if apt-get upgrade -y -o Dpkg::Options::="--force-confdef" \
       -o Dpkg::Options::="--force-confold" \
       --only-upgrade 2>/dev/null; then
        ok "System packages updated"
    else
        warn "Some packages could not be updated"
    fi

    # Install essential security tools
    local packages=(
        ufw            # Firewall
        fail2ban       # Brute force protection
        auditd         # Audit logging
        unattended-upgrades  # Automatic security updates
        apt-listchanges # Show changelogs for updates
        rkhunter       # Rootkit detection
        libpam-pwquality # Password quality enforcement
    )

    apt-get install -y "${packages[@]}" >> "$LOG" 2>&1 && \
        ok "Security packages installed" || \
        fail "Failed to install some security packages"
}
```

## Remove Unnecessary Software

```bash
remove_unnecessary() {
    log "--- Removing Unnecessary Software ---"

    local to_remove=(
        telnet
        rsh-client
        rsh-redone-client
        nis
        talk
        talkd
        xinetd
    )

    for pkg in "${to_remove[@]}"; do
        if dpkg -l "$pkg" 2>/dev/null | grep -q "^ii"; then
            apt-get purge -y "$pkg" >> "$LOG" 2>&1 && \
                ok "Removed: $pkg" || \
                warn "Could not remove: $pkg"
        fi
    done
}
```

## Configure SSH

```bash
harden_ssh() {
    log "--- SSH Configuration ---"

    local sshd_config="/etc/ssh/sshd_config.d/baseline.conf"

    cat > "$sshd_config" << 'EOF'
# Baseline security SSH settings
Protocol 2

# Disable root login
PermitRootLogin no

# Disable password authentication - use keys only
# Uncomment when keys are configured
# PasswordAuthentication no

# Limit authentication attempts
MaxAuthTries 4

# Disconnect idle sessions after 10 minutes
ClientAliveInterval 600
ClientAliveCountMax 0

# Disable dangerous features
PermitEmptyPasswords no
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitUserEnvironment no

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group14-sha256

# Limit SSH to specific ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com

# Use strong MACs
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Log authentication events
LogLevel VERBOSE

# Restrict access time (login grace period)
LoginGraceTime 30
EOF

    # Test the configuration before restarting
    if sshd -t 2>/dev/null; then
        systemctl restart sshd && ok "SSH hardened and restarted" || fail "SSH restart failed"
    else
        fail "SSH configuration test failed - check $sshd_config"
    fi
}
```

## Configure the Firewall

```bash
configure_firewall() {
    log "--- Firewall Configuration ---"

    # Reset UFW to defaults
    ufw --force reset >> "$LOG" 2>&1

    # Default policies
    ufw default deny incoming >> "$LOG" 2>&1
    ufw default allow outgoing >> "$LOG" 2>&1

    # Allow SSH - change port if not using 22
    ufw allow 22/tcp >> "$LOG" 2>&1

    # Enable the firewall
    ufw --force enable >> "$LOG" 2>&1 && \
        ok "Firewall enabled with default-deny incoming" || \
        fail "Firewall configuration failed"

    # Show current rules
    ufw status numbered >> "$LOG" 2>&1
}
```

## Enforce Password Policy

```bash
configure_passwords() {
    log "--- Password Policy ---"

    # Configure PAM password quality
    cat > /etc/security/pwquality.conf << 'EOF'
# Minimum password length
minlen = 12

# Require at least one digit
dcredit = -1

# Require at least one uppercase letter
ucredit = -1

# Require at least one special character
ocredit = -1

# Require at least one lowercase letter
lcredit = -1

# Maximum 3 consecutive identical characters
maxrepeat = 3
EOF

    ok "Password quality policy configured"

    # Set login.defs password aging
    sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs
    sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   7/' /etc/login.defs
    sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE   14/' /etc/login.defs

    ok "Password aging policy configured"
}
```

## Harden Kernel Parameters

```bash
harden_kernel() {
    log "--- Kernel Parameters ---"

    cat > /etc/sysctl.d/99-baseline-security.conf << 'EOF'
# Protect against SYN flood attacks
net.ipv4.tcp_syncookies = 1

# Disable IP forwarding (not a router)
net.ipv4.ip_forward = 0

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Enable reverse path filtering (anti-spoofing)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore broadcast pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP errors
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Randomize virtual address space (ASLR)
kernel.randomize_va_space = 2

# Restrict core dumps
fs.suid_dumpable = 0

# Restrict dmesg to root
kernel.dmesg_restrict = 1

# Hide kernel pointers
kernel.kptr_restrict = 2
EOF

    sysctl --system >> "$LOG" 2>&1 && \
        ok "Kernel parameters applied" || \
        fail "Some kernel parameters could not be applied"
}
```

## Configure Automatic Security Updates

```bash
configure_auto_updates() {
    log "--- Automatic Updates ---"

    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

// Automatically fix broken packages
Unattended-Upgrade::AutoFixInterruptedDpkg "true";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Reboot if required (at 3am)
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Email on errors
// Unattended-Upgrade::Mail "admin@example.com";
EOF

    cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

    systemctl enable unattended-upgrades >> "$LOG" 2>&1 && \
        ok "Automatic security updates configured" || \
        fail "Could not enable automatic updates"
}
```

## Generate a Summary Report

```bash
print_summary() {
    log "--- Baseline Security Script Complete ---"
    echo ""
    echo "=============================="
    echo "Baseline Security Summary"
    echo "Host: $(hostname)"
    echo "Date: $(date)"
    echo "=============================="

    if [[ $ERRORS -eq 0 ]]; then
        echo -e "${GREEN}All checks passed. System baseline applied.${NC}"
    else
        echo -e "${RED}Completed with $ERRORS error(s). Review $LOG for details.${NC}"
    fi

    echo ""
    echo "Next steps:"
    echo "  1. Review $LOG for any warnings"
    echo "  2. Run 'lynis audit system' for a full audit"
    echo "  3. Verify SSH key login works before disabling password auth"
    echo "  4. Add application-specific firewall rules as needed"
}

# Run all sections
update_system
remove_unnecessary
harden_ssh
configure_firewall
configure_passwords
harden_kernel
configure_auto_updates
print_summary
```

## Usage

```bash
# Download or copy the script to the server
sudo chmod 700 /root/baseline-security.sh

# Run on a fresh server
sudo /root/baseline-security.sh

# Review the log
cat /var/log/baseline-security.log
```

A baseline script like this runs in about 5 minutes on a fresh Ubuntu server and brings it from stock configuration to a defensible state. Keep it in version control, review it quarterly against updated CIS benchmarks, and test any changes in a staging environment before rolling them out to production.
