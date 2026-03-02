# How to Set Up FedRAMP-Compliant Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FedRAMP, Compliance, Security, Government

Description: Configure Ubuntu servers to meet FedRAMP Moderate security baseline requirements, covering NIST 800-53 controls, STIG hardening, FIPS 140-2 mode, and audit logging for federal cloud compliance.

---

FedRAMP (Federal Risk and Authorization Management Program) is the US government framework for authorizing cloud services used by federal agencies. Systems seeking FedRAMP authorization must implement controls from NIST SP 800-53. Ubuntu Server can be configured to meet FedRAMP Moderate baseline requirements, though full authorization requires documentation, third-party assessment, and ongoing continuous monitoring beyond what any single configuration guide can cover.

This post covers the technical hardening controls most relevant to Ubuntu servers in FedRAMP environments.

## Understanding FedRAMP Baselines

FedRAMP has three impact levels:
- **Low** - Information that, if compromised, has limited impact
- **Moderate** - Most federal systems fall here (~325 controls)
- **High** - Systems handling sensitive national security data

This guide targets Moderate baseline controls. Key control families relevant to Ubuntu hardening: AC (Access Control), AU (Audit and Accountability), CM (Configuration Management), IA (Identification and Authentication), SC (System and Communications Protection), SI (System and Information Integrity).

## Enabling FIPS 140-2 Mode

FedRAMP requires FIPS 140-2 validated cryptographic modules for cryptographic operations:

```bash
# Install Ubuntu's FIPS packages
# Note: FIPS mode is available in Ubuntu Pro/Advantage
sudo ua enable fips

# Or manually install FIPS kernel and cryptographic modules
sudo apt install ubuntu-fips -y

# After installation, reboot to activate FIPS kernel
sudo reboot

# Verify FIPS mode is active after reboot
cat /proc/sys/crypto/fips_enabled
# Should output: 1

# Check FIPS-enabled OpenSSL
openssl version -a | grep -i fips
```

On non-Ubuntu Pro systems, you can partially enforce FIPS-compliant settings:

```bash
# Install FIPS-compliant cryptographic tools
sudo apt install libssl1.1 strongswan -y

# Configure OpenSSL to use FIPS module
sudo nano /etc/ssl/openssl.cnf
```

```ini
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect

[provider_sect]
fips = fips_sect
default = default_sect

[fips_sect]
activate = 1

[default_sect]
activate = 1
```

## Access Control (AC Family)

### AC-2: Account Management

```bash
# Create a system for centralized account management
sudo apt install sssd -y

# Configure password policy in /etc/security/pwquality.conf
sudo tee /etc/security/pwquality.conf << 'EOF'
minlen = 15
dcredit = -1
ucredit = -1
lcredit = -1
ocredit = -1
maxrepeat = 3
gecoscheck = 1
dictcheck = 1
EOF

# Set account lockout - lock after 3 failed attempts (AC-7)
sudo tee /etc/pam.d/common-auth-fedramp << 'EOF'
auth required pam_faillock.so preauth audit silent deny=3 unlock_time=1800
auth [default=die] pam_faillock.so authfail audit deny=3 unlock_time=1800
auth sufficient pam_unix.so
auth [default=die] pam_faillock.so authsucc audit deny=3 unlock_time=1800
EOF

# Configure faillock
sudo tee /etc/security/faillock.conf << 'EOF'
deny = 3
fail_interval = 900
unlock_time = 1800
audit
even_deny_root = true
EOF
```

### AC-17: Remote Access

```bash
# FIPS-compliant SSH configuration
sudo tee /etc/ssh/sshd_config.d/fedramp.conf << 'EOF'
# Only FIPS-approved ciphers
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Only FIPS-approved MACs
MACs hmac-sha2-512,hmac-sha2-256

# Only FIPS-approved KEX algorithms
KexAlgorithms ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

# Disable root login (AC-6 least privilege)
PermitRootLogin no

# Disable password authentication (use PIV/CAC or keys)
PasswordAuthentication no
PubkeyAuthentication yes

# Session controls
ClientAliveInterval 600
ClientAliveCountMax 0
LoginGraceTime 60
MaxAuthTries 3
MaxSessions 10

# Enable login banner (AC-8)
Banner /etc/issue.net

# Restrict to authorized users
AllowGroups fedramp-users

# Logging
LogLevel VERBOSE
SyslogFacility AUTH
EOF

# FedRAMP required banner text (US Government systems)
sudo tee /etc/issue.net << 'EOF'
You are accessing a U.S. Government (USG) Information System (IS) that is
provided for USG-authorized use only. By using this IS (which includes any
device attached to this IS), you consent to the following conditions:

-The USG routinely intercepts and monitors communications on this IS for
purposes including, but not limited to, penetration testing, COMSEC monitoring,
network operations and defense, personnel misconduct (PM), law enforcement (LE),
and counterintelligence (CI) investigations.

-At any time, the USG may inspect and seize data stored on this IS.

-Communications using, or data stored on, this IS are not private, are subject
to routine monitoring, interception, and search, and may be disclosed or used for
any USG-authorized purpose.
EOF

sudo systemctl reload sshd
```

## Audit and Accountability (AU Family)

### AU-2, AU-3, AU-12: Audit Events

```bash
# Comprehensive audit configuration for FedRAMP
sudo tee /etc/audit/rules.d/fedramp.rules << 'EOF'
# Buffer size and failure mode
-b 16384
-f 2

# AU-14: Session Auditing
-a always,exit -F arch=b64 -S execve -k exec_commands

# Identity and authentication events
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# Privilege escalation
-w /usr/bin/sudo -p x -k priv_esc
-w /bin/su -p x -k priv_esc
-a always,exit -F arch=b64 -S setuid -F a1=0 -F exe=/bin/bash -k priv_esc

# Login/logout events
-w /var/log/lastlog -p wa -k logins
-w /var/run/utmp -p wa -k session
-w /var/log/btmp -p wa -k session
-w /var/log/wtmp -p wa -k session

# Privileged commands (AU-9)
-a always,exit -F arch=b64 -S mount -F auid>=1000 -F auid!=4294967295 -k privileged_mount
-a always,exit -F arch=b64 -S umount2 -F auid>=1000 -F auid!=4294967295 -k privileged_umount

# File access failures (AC-3)
-a always,exit -F arch=b64 -S open,openat,truncate,ftruncate -F exit=-EACCES -F auid>=1000 -k access_denied
-a always,exit -F arch=b64 -S open,openat,truncate,ftruncate -F exit=-EPERM -F auid>=1000 -k access_denied

# System administration
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers
-w /sbin/auditctl -p x -k audit_tools
-w /sbin/auditd -p x -k audit_tools

# Network configuration changes
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k network_config
-w /etc/hosts -p wa -k network_config
-w /etc/netplan/ -p wa -k network_config
-w /etc/resolv.conf -p wa -k network_config

# Kernel module loading
-a always,exit -F arch=b64 -S init_module -S delete_module -S finit_module -k kernel_modules

# Make audit rules immutable
-e 2
EOF

sudo augenrules --load
sudo systemctl enable auditd
sudo systemctl restart auditd
```

### AU-9: Audit Log Protection

```bash
# Protect audit logs from modification
sudo chown root:root /var/log/audit/audit.log
sudo chmod 600 /var/log/audit/audit.log

# Configure auditd to write to remote log server (AU-9(2))
sudo tee /etc/audisp/plugins.d/au-remote.conf << 'EOF'
active = yes
direction = out
path = /sbin/audisp-remote
type = always
EOF

sudo tee /etc/audisp/audisp-remote.conf << 'EOF'
remote_server = siem.agency.gov
port = 60
transport = tcp
mode = immediate
queue_depth = 10000
EOF

sudo systemctl restart auditd
```

## Configuration Management (CM Family)

### CM-6: Configuration Settings (STIGs)

DISA STIGs for Ubuntu provide specific configuration benchmarks that align with FedRAMP:

```bash
# Install OpenSCAP for STIG assessment
sudo apt install openscap-scanner scap-security-guide -y

# List available profiles for Ubuntu
oscap info /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml | grep "Profile"

# Run STIG assessment
sudo oscap xccdf eval \
    --profile xccdf_org.ssgproject.content_profile_stig \
    --report /tmp/stig-report.html \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml

# Apply STIG profile (use with caution on production)
sudo oscap xccdf eval \
    --remediate \
    --profile xccdf_org.ssgproject.content_profile_stig \
    /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### CM-7: Least Functionality

```bash
# Disable unnecessary services
for SERVICE in bluetooth cups avahi-daemon nfs-server rpcbind; do
    sudo systemctl disable "$SERVICE" --now 2>/dev/null || true
done

# Remove unnecessary packages
sudo apt purge telnet rsh-client rsh-redone-client ftp -y
sudo apt autoremove -y

# Check for unnecessary SUID/SGID files
find / -perm /4000 -o -perm /2000 2>/dev/null | \
  grep -v proc | \
  tee /var/log/fedramp/suid-sgid-files.txt
```

## System and Information Integrity (SI Family)

```bash
# Install and configure AIDE for file integrity monitoring (SI-7)
sudo apt install aide -y

sudo aide --init
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Daily integrity check
sudo tee /etc/cron.daily/aide-fedramp << 'EOF'
#!/bin/bash
LOG="/var/log/fedramp/aide-$(date +%Y%m%d).log"
/usr/bin/aide --check > "$LOG" 2>&1
if [ $? -ne 0 ]; then
    logger -p auth.crit -t AIDE "File integrity check FAILED - see $LOG"
fi
EOF
sudo chmod +x /etc/cron.daily/aide-fedramp
```

## Continuous Monitoring

FedRAMP requires continuous monitoring (ConMon). Automate compliance checks:

```bash
#!/bin/bash
# /usr/local/bin/fedramp-conmon.sh - Daily compliance scan

mkdir -p /var/log/fedramp/conmon

DATE=$(date +%Y%m%d)
REPORT="/var/log/fedramp/conmon/report-$DATE.txt"

echo "FedRAMP ConMon Report - $(date)" > "$REPORT"
echo "System: $(hostname)" >> "$REPORT"
echo "" >> "$REPORT"

# Check FIPS mode
echo "FIPS Mode: $(cat /proc/sys/crypto/fips_enabled)" >> "$REPORT"

# Check auditd
echo "Auditd Status: $(systemctl is-active auditd)" >> "$REPORT"

# Check failed logins (last 24 hours)
echo "Failed Login Attempts (24h): $(grep "authentication failure" /var/log/auth.log | grep "$(date +%b\ %d)" | wc -l)" >> "$REPORT"

# Scan for vulnerabilities
sudo apt-get update -qq
UPGRADABLE=$(apt list --upgradable 2>/dev/null | grep -v "Listing" | wc -l)
echo "Available Security Updates: $UPGRADABLE" >> "$REPORT"

cat "$REPORT"
```

FedRAMP authorization is not achieved by configuration alone. It requires a System Security Plan (SSP), security controls assessment by a 3PAO, Plan of Action and Milestones (POA&M) for gaps, and ongoing continuous monitoring reports. The technical controls here form the foundation, but the documentation and process work is equally important.
