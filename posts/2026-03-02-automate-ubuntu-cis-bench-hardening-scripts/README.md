# How to Automate Ubuntu CIS Bench Hardening with Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, CIS Benchmark, Hardening, Automation

Description: Automate CIS Benchmark hardening on Ubuntu servers using shell scripts, reducing manual effort while ensuring consistent security compliance across deployments.

---

The CIS (Center for Internet Security) Ubuntu Benchmark is a detailed set of security configuration recommendations. Following it manually on every server is error-prone and time-consuming. Automating the hardening process with scripts ensures consistency, speeds up deployments, and makes it easy to verify compliance after the fact.

## Understanding CIS Benchmark Levels

The CIS Benchmark defines two profiles:

- **Level 1** - Basic security hardening that does not impact functionality. Safe to apply to most production servers.
- **Level 2** - Defense-in-depth measures that may require application-specific adjustments. More restrictive.

For most servers, Level 1 is the starting point. Level 2 settings require testing before applying to production.

## Setting Up the Hardening Script Structure

Organize the hardening script into sections matching the CIS benchmark chapters. This makes auditing and selective application straightforward.

```bash
# Create a working directory for hardening scripts
sudo mkdir -p /opt/hardening/{scripts,logs,reports}
sudo chmod 700 /opt/hardening

# Create the main hardening script
sudo nano /opt/hardening/scripts/cis-harden.sh
```

Start with a header and utility functions:

```bash
#!/bin/bash
# CIS Ubuntu 22.04 LTS Benchmark Hardening Script
# Version: 1.0
# Run as root

set -euo pipefail

LOG_FILE="/opt/hardening/logs/hardening-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="/opt/hardening/reports/compliance-$(date +%Y%m%d).txt"

# Logging function
log() {
    echo "[$(date +%Y-%m-%dT%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

# Apply a hardening setting with logging
apply() {
    local description="$1"
    shift
    log "APPLYING: $description"
    "$@" && log "SUCCESS: $description" || log "FAILED: $description"
}
```

## Section 1 - Filesystem Configuration

```bash
# Harden filesystem mount options and disable unused filesystems

harden_filesystems() {
    log "=== Section 1: Filesystem Configuration ==="

    # Disable unused and potentially dangerous filesystems
    local disabled_fs=(cramfs freevxfs jffs2 hfs hfsplus squashfs udf)

    for fs in "${disabled_fs[@]}"; do
        if ! grep -q "install $fs /bin/true" /etc/modprobe.d/cis-hardening.conf 2>/dev/null; then
            echo "install $fs /bin/true" >> /etc/modprobe.d/cis-hardening.conf
            log "Disabled filesystem module: $fs"
        fi
    done

    # Set restrictive options on /tmp
    if grep -q " /tmp " /etc/fstab; then
        log "/tmp already in fstab"
    else
        # Use systemd tmpfs for /tmp
        systemctl enable tmp.mount
        log "Enabled systemd tmp.mount"
    fi

    # Set nodev, nosuid, noexec on /tmp via systemd override
    mkdir -p /etc/systemd/system/tmp.mount.d/
    cat > /etc/systemd/system/tmp.mount.d/options.conf << 'EOF'
[Mount]
Options=mode=1777,strictatime,nosuid,nodev,noexec
EOF

    systemctl daemon-reload

    log "Filesystem hardening complete"
}
```

## Section 2 - Services

```bash
# Disable unnecessary network services

harden_services() {
    log "=== Section 2: Services ==="

    # Services that should be disabled if not needed
    local unnecessary_services=(
        avahi-daemon
        cups
        isc-dhcp-server
        isc-dhcp-server6
        slapd
        nfs-server
        rpcbind
        bind9
        vsftpd
        dovecot
        smbd
        squid
        snmpd
        xinetd
    )

    for svc in "${unnecessary_services[@]}"; do
        if systemctl is-enabled "$svc" 2>/dev/null | grep -q "enabled"; then
            apply "Disabling $svc" systemctl disable --now "$svc"
        else
            log "SKIP: $svc not enabled"
        fi
    done
}
```

## Section 3 - Network Configuration

```bash
harden_network() {
    log "=== Section 3: Network Configuration ==="

    # Write sysctl hardening parameters
    cat > /etc/sysctl.d/60-cis-hardening.conf << 'EOF'
# CIS Benchmark - Network Hardening

# Disable IP forwarding (unless this is a router)
net.ipv4.ip_forward = 0

# Disable packet forwarding for IPv6
net.ipv6.conf.all.forwarding = 0

# Disable sending of redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable accepting source-routed packets
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Enable TCP SYN cookies to protect against SYN flood attacks
net.ipv4.tcp_syncookies = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF

    apply "Loading sysctl parameters" sysctl --system

    log "Network hardening complete"
}
```

## Section 4 - Logging and Auditing

```bash
harden_logging() {
    log "=== Section 4: Logging and Auditing ==="

    # Ensure auditd is installed and running
    if ! dpkg -l auditd 2>/dev/null | grep -q "^ii"; then
        apply "Installing auditd" apt-get install -y auditd audispd-plugins
    fi

    # Write CIS audit rules
    cat > /etc/audit/rules.d/cis-hardening.rules << 'EOF'
# Delete all existing rules
-D

# Set buffer size
-b 8192

# Ensure auditd does not fail silently
-f 1

# Monitor logins and authentication
-w /var/log/lastlog -p wa -k logins
-w /var/run/faillock -p wa -k logins

# Monitor privileged command execution
-a always,exit -F path=/usr/bin/passwd -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged
-a always,exit -F path=/usr/bin/sudo -F perm=x -F auid>=1000 -F auid!=4294967295 -k privileged

# Monitor system calls related to file deletion
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -k delete

# Monitor sudoers file changes
-w /etc/sudoers -p wa -k scope
-w /etc/sudoers.d/ -p wa -k scope
EOF

    apply "Enabling auditd" systemctl enable --now auditd
    apply "Loading audit rules" augenrules --load

    log "Logging hardening complete"
}
```

## Section 5 - Access Control

```bash
harden_access() {
    log "=== Section 5: Access Control ==="

    # Set strong password policy
    cat > /etc/security/pwquality.conf << 'EOF'
# CIS Benchmark password quality requirements
minlen = 14
minclass = 4
maxrepeat = 3
maxsequence = 3
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
EOF

    # Configure PAM password settings
    # Set account lockout
    if ! grep -q "pam_faillock" /etc/pam.d/common-auth; then
        sed -i '/pam_unix.so/i auth required pam_faillock.so preauth silent audit deny=5 unlock_time=900' /etc/pam.d/common-auth
        log "Configured account lockout via pam_faillock"
    fi

    # SSH hardening
    cat > /etc/ssh/sshd_config.d/cis-hardening.conf << 'EOF'
# CIS Benchmark SSH configuration
Protocol 2
PermitRootLogin no
MaxAuthTries 4
IgnoreRhosts yes
HostbasedAuthentication no
PermitEmptyPasswords no
PermitUserEnvironment no
ClientAliveInterval 300
ClientAliveCountMax 0
LoginGraceTime 60
AllowTcpForwarding no
X11Forwarding no
AllowAgentForwarding no
EOF

    apply "Restarting sshd" systemctl restart sshd

    log "Access control hardening complete"
}
```

## Main Execution and Reporting

```bash
# Run all hardening sections and generate a report

main() {
    log "Starting CIS Ubuntu Hardening - $(date)"
    log "System: $(uname -a)"

    harden_filesystems
    harden_services
    harden_network
    harden_logging
    harden_access

    log "Hardening complete. Log file: $LOG_FILE"
    echo "Hardening complete. Run Lynis or OpenSCAP to verify compliance."
}

main "$@"
```

## Run the Script Safely

```bash
# Make executable
sudo chmod 700 /opt/hardening/scripts/cis-harden.sh

# Test on a non-production system first
# Run a dry-run by reviewing what each section does

# Apply hardening
sudo /opt/hardening/scripts/cis-harden.sh

# Review the log
cat /opt/hardening/logs/hardening-*.log | tail -100
```

## Automate with Ansible for Scale

For fleet-wide hardening, wrapping these scripts in Ansible tasks is more maintainable than running the shell script directly on each host:

```yaml
# site.yml
- name: Apply CIS hardening
  hosts: all
  become: true
  tasks:
    - name: Copy hardening script
      copy:
        src: cis-harden.sh
        dest: /opt/hardening/scripts/cis-harden.sh
        mode: '0700'

    - name: Run CIS hardening
      command: /opt/hardening/scripts/cis-harden.sh
      register: hardening_result

    - name: Fetch hardening log
      fetch:
        src: /opt/hardening/logs/hardening-latest.log
        dest: "reports/{{ inventory_hostname }}-hardening.log"
        flat: yes
```

Automating CIS hardening removes the human error factor from a critical security process. Once the script is tested and validated on a staging system, rolling it out across an entire fleet takes minutes rather than days.
