# How to Run CIS Benchmark Audits on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CIS Benchmark, Security Hardening, Compliance, Audit

Description: Run CIS benchmark security audits on Ubuntu using Lynis and manual checks to identify hardening gaps, measure compliance, and systematically harden your servers.

---

The CIS (Center for Internet Security) Benchmarks are industry-standard security configuration guides. For Ubuntu, CIS publishes a detailed benchmark document with hundreds of specific checks organized into two levels: Level 1 (recommended for most environments) and Level 2 (additional hardening for high-security environments). Regularly auditing your servers against these benchmarks catches security gaps before attackers do.

## Understanding CIS Benchmark Structure

CIS benchmarks for Ubuntu are organized into sections:
- **Section 1**: Initial Setup (filesystem configuration, updates, software)
- **Section 2**: Services (disabled unnecessary services)
- **Section 3**: Network Configuration
- **Section 4**: Logging and Auditing
- **Section 5**: Access Control (PAM, SSH, user accounts)
- **Section 6**: System Maintenance

Each check is scored (whether it affects the benchmark score) and has remediation steps.

## Installing Lynis for Automated Auditing

Lynis is an open-source security auditing tool that checks many CIS benchmark items automatically:

```bash
# Install from the CISOfy repository for the latest version
wget -O - https://packages.cisofy.com/keys/cisofy-software-public.key | sudo apt-key add -
echo "deb https://packages.cisofy.com/community/lynis/deb/ stable main" | \
  sudo tee /etc/apt/sources.list.d/cisofy-lynis.list
sudo apt update
sudo apt install lynis -y

# Or install from Ubuntu repos (may be older version)
sudo apt install lynis -y
```

## Running a Lynis Audit

```bash
# Full system audit
sudo lynis audit system

# Audit with specific profile (create custom profiles for your environment)
sudo lynis audit system --profile /etc/lynis/custom.prf

# Generate a report file
sudo lynis audit system --report-file /var/log/lynis-report.dat

# Run in non-interactive mode for CI/CD pipelines
sudo lynis audit system --quick
```

The audit takes a few minutes and produces output like:

```text
================================================================================
  Lynis Security Audit

  Version     : 3.0.8
  Key file    : /etc/lynis/lynis.key (not found)
  Tests       : 265
  Plugins     : 0

================================================================================

[+] Initializing program
------------------------------------
- Detecting OS...                                           [ UBUNTU ]
- Checking profiles...                                      [ DONE ]

[+] System tools
------------------------------------
- Scanning available tools...
- Checking system binaries...                               [ DONE ]

...

================================================================================
  Lynis security scan details:

  Hardening index : 63 [############        ]
  Tests performed : 265
  Plugins enabled : 0

  Components:
  - Firewall               [V]
  - Malware scanner        [X]

  Lynis Modules:
  - Compliance Status      [?]
  - Security Audit         [V]
  - Vulnerability Scan     [V]

  Files:
  - Test and debug information      : /var/log/lynis.log
  - Report data                     : /var/log/lynis-report.dat
```

## Understanding Lynis Output

Check the results for warnings and suggestions:

```bash
# View only warnings
sudo lynis audit system 2>&1 | grep -A2 "^\[ Warning \]"

# View suggestions
sudo lynis audit system 2>&1 | grep "Suggestion:"

# Get the detailed report
cat /var/log/lynis-report.dat | grep -E "warning|suggestion" | head -30
```

## Manual CIS Checks by Section

### Section 1: Filesystem Configuration

```bash
# 1.1.1 - Check that cramfs, freevxfs, jffs2, hfs, hfsplus, squashfs, udf are disabled
for module in cramfs freevxfs jffs2 hfs hfsplus udf; do
    result=$(modprobe -n -v $module 2>&1)
    if echo "$result" | grep -q "install /bin/true"; then
        echo "PASS: $module is disabled"
    else
        echo "FAIL: $module is NOT disabled"
        echo "  Fix: echo 'install $module /bin/true' >> /etc/modprobe.d/CIS.conf"
    fi
done

# 1.1.2 - Verify /tmp is a separate partition
findmnt /tmp > /dev/null && echo "PASS: /tmp is a separate mount" || echo "FAIL: /tmp is NOT a separate mount"

# 1.1.3 - Verify nodev option on /tmp
findmnt /tmp | grep -q "nodev" && echo "PASS: nodev set on /tmp" || echo "FAIL: nodev NOT set on /tmp"
```

### Section 2: Services

```bash
# 2.1 - Check inetd services are not installed
dpkg -l openbsd-inetd xinetd 2>/dev/null | grep -E "^ii" && \
    echo "FAIL: inetd service installed" || echo "PASS: inetd not installed"

# 2.2 - Check time synchronization
systemctl is-active chrony ntp systemd-timesyncd 2>/dev/null | grep -q "^active" && \
    echo "PASS: Time sync active" || echo "FAIL: No time sync running"

# Check for unnecessary services
for svc in avahi-daemon cups isc-dhcp-server ldap nfs-server rpcbind bind9 vsftpd apache2 dovecot samba squid snmpd; do
    if systemctl is-active "$svc" >/dev/null 2>&1; then
        echo "WARNING: $svc is running - disable if not needed"
    fi
done
```

### Section 3: Network Configuration

```bash
# 3.1.1 - IP forwarding
sysctl net.ipv4.ip_forward | grep -q "= 0" && \
    echo "PASS: IP forwarding disabled" || echo "FAIL: IP forwarding enabled"

# 3.1.2 - Packet redirect sending
sysctl net.ipv4.conf.all.send_redirects | grep -q "= 0" && \
    echo "PASS: Packet redirects disabled" || echo "FAIL: Packet redirects enabled"

# 3.2 - ICMP checks
sysctl net.ipv4.icmp_echo_ignore_broadcasts | grep -q "= 1" && \
    echo "PASS: ICMP broadcast echo disabled" || echo "FAIL: ICMP broadcast echo enabled"

sysctl net.ipv4.icmp_ignore_bogus_error_responses | grep -q "= 1" && \
    echo "PASS: Bogus ICMP responses ignored" || echo "FAIL: Bogus ICMP responses NOT ignored"
```

### Section 4: Logging and Auditing

```bash
# 4.1.1 - Ensure auditd is installed
dpkg -l auditd | grep -q "^ii" && echo "PASS: auditd installed" || echo "FAIL: auditd NOT installed"

# 4.1.2 - Ensure auditd service is enabled
systemctl is-enabled auditd | grep -q "enabled" && \
    echo "PASS: auditd enabled" || echo "FAIL: auditd NOT enabled"

# 4.2.1 - rsyslog is installed
dpkg -l rsyslog | grep -q "^ii" && echo "PASS: rsyslog installed" || echo "FAIL: rsyslog NOT installed"

# Check log permissions
ls -la /var/log/syslog | awk '{print $1}' | grep -q "^-rw-r-----" && \
    echo "PASS: syslog permissions correct" || echo "FAIL: syslog permissions too open"
```

### Section 5: Access Control

```bash
# 5.1.1 - cron daemon is enabled
systemctl is-enabled cron | grep -q "enabled" && \
    echo "PASS: cron enabled" || echo "FAIL: cron NOT enabled"

# 5.2 - SSH configuration checks
check_sshd() {
    local param=$1
    local expected=$2
    local value=$(sudo sshd -T 2>/dev/null | grep -i "^${param}" | awk '{print $2}')
    if [ "$value" = "$expected" ]; then
        echo "PASS: SSH ${param}=${value}"
    else
        echo "FAIL: SSH ${param}=${value} (expected: ${expected})"
    fi
}

check_sshd "permittopening" "no" 2>/dev/null
check_sshd "permitrootlogin" "no"
check_sshd "passwordauthentication" "no"
check_sshd "permitemptypasswords" "no"
check_sshd "x11forwarding" "no"
check_sshd "maxauthtries" "4"
check_sshd "ignorerhosts" "yes"
check_sshd "hostsbasedauthentication" "no"

# 5.3 - Password policy
grep -q "^PASS_MAX_DAYS\s*90" /etc/login.defs && \
    echo "PASS: Password max days <= 90" || echo "FAIL: Password max days not set to 90"

grep -q "^PASS_MIN_DAYS\s*[1-9]" /etc/login.defs && \
    echo "PASS: Password min days >= 1" || echo "FAIL: Password min days not set"
```

## Creating a CIS Audit Script

Bundle all checks into a single scoring script:

```bash
cat << 'SCRIPT' | sudo tee /usr/local/bin/cis-audit.sh
#!/bin/bash
# CIS Ubuntu Benchmark Audit Script - Level 1 subset
# Run with: sudo /usr/local/bin/cis-audit.sh

PASS=0
FAIL=0
WARN=0

pass() { echo "PASS: $1"; ((PASS++)); }
fail() { echo "FAIL: $1"; ((FAIL++)); }
warn() { echo "WARN: $1"; ((WARN++)); }

echo "=== CIS Ubuntu Benchmark Audit ==="
echo "Host: $(hostname -f)"
echo "Date: $(date)"
echo ""

# 1.1 - Filesystem modules
for mod in cramfs freevxfs jffs2 hfs hfsplus udf; do
    modprobe -n -v "$mod" 2>&1 | grep -q "install /bin/true" && pass "$mod disabled" || fail "$mod not disabled"
done

# 3.1 - Network kernel parameters
for param in "net.ipv4.ip_forward=0" "net.ipv4.conf.all.send_redirects=0" "net.ipv4.icmp_echo_ignore_broadcasts=1"; do
    key=$(echo "$param" | cut -d= -f1)
    val=$(echo "$param" | cut -d= -f2)
    sysctl "$key" 2>/dev/null | grep -q "= $val" && pass "$key=$val" || fail "$key not set to $val"
done

# 4.1 - Auditd
systemctl is-enabled auditd 2>/dev/null | grep -q "enabled" && pass "auditd enabled" || fail "auditd not enabled"

# 5.2 - SSH
sshd -T 2>/dev/null | grep -qi "^PermitRootLogin no" && pass "SSH PermitRootLogin no" || fail "SSH PermitRootLogin not disabled"
sshd -T 2>/dev/null | grep -qi "^PasswordAuthentication no" && pass "SSH PasswordAuthentication no" || fail "SSH PasswordAuthentication not disabled"

# Summary
echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "WARN: $WARN"
echo "Score: $((PASS * 100 / (PASS + FAIL + WARN)))%"
SCRIPT

sudo chmod +x /usr/local/bin/cis-audit.sh
sudo /usr/local/bin/cis-audit.sh
```

## Remediation Priorities

After running audits, prioritize fixes:

1. **Critical (fix immediately)**: Root login permitted, no firewall, world-writable files in /etc
2. **High**: Password policy not set, audit logging disabled, unnecessary services running
3. **Medium**: SSH hardening gaps, sysctl parameters not tuned
4. **Low**: Disabled kernel modules, minor permission adjustments

Run audits after every major configuration change and on a monthly schedule as part of your security review cycle.
