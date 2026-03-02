# How to Implement HIPAA Compliance on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HIPAA, Compliance, Security, Healthcare

Description: Configure Ubuntu Server to meet HIPAA technical safeguard requirements, covering access controls, audit logging, encryption, and integrity controls for protected health information.

---

HIPAA's Security Rule requires covered entities and business associates to implement technical safeguards protecting electronic protected health information (ePHI). Ubuntu servers storing or processing ePHI must be configured to meet these requirements. This guide covers the technical implementation - you'll still need to pair it with administrative and physical safeguards, and ideally have a qualified compliance professional review your specific setup.

## HIPAA Technical Safeguard Categories

HIPAA requires safeguards in four main areas:

1. **Access Controls** - Limit who can access ePHI
2. **Audit Controls** - Record access and activity
3. **Integrity Controls** - Ensure ePHI isn't altered or destroyed improperly
4. **Transmission Security** - Protect ePHI during network transmission

## System Hardening Foundation

Before addressing HIPAA-specific controls, harden the base system:

```bash
# Keep the system updated - critical for HIPAA
sudo apt update && sudo apt upgrade -y

# Install security tools
sudo apt install auditd audispd-plugins aide libpam-pwquality ufw fail2ban -y

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable cups
sudo systemctl stop bluetooth avahi-daemon cups
```

## Access Controls

### User Account Management

```bash
# Set strong password policy in /etc/security/pwquality.conf
sudo tee /etc/security/pwquality.conf << 'EOF'
# Minimum password length
minlen = 12

# Require at least one lowercase letter
lcredit = -1

# Require at least one uppercase letter
ucredit = -1

# Require at least one digit
dcredit = -1

# Require at least one special character
ocredit = -1

# Maximum consecutive repeated characters
maxrepeat = 3

# Reject if similar to username
usercheck = 1

# Reject common passwords
dictcheck = 1
EOF

# Configure password aging
sudo tee -a /etc/login.defs << 'EOF'
# HIPAA requires periodic password changes
PASS_MAX_DAYS   90
PASS_MIN_DAYS   1
PASS_WARN_AGE   14
EOF

# Apply to existing users
sudo chage -M 90 -m 1 -W 14 username
```

### Automatic Session Timeout

```bash
# Add to /etc/profile.d/hipaa-timeout.sh
sudo tee /etc/profile.d/hipaa-timeout.sh << 'EOF'
# HIPAA: Automatic logoff after 15 minutes of inactivity
readonly TMOUT=900
readonly HISTFILESIZE=10000
readonly HISTSIZE=10000
# Log all commands
export HISTTIMEFORMAT="%Y-%m-%d %T "
EOF

sudo chmod 644 /etc/profile.d/hipaa-timeout.sh
```

### SSH Hardening

```bash
# HIPAA-compliant SSH configuration
sudo tee /etc/ssh/sshd_config.d/hipaa.conf << 'EOF'
# Disable password authentication - use keys only
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no

# Disable empty passwords
PermitEmptyPasswords no

# Protocol and cipher restrictions
Protocol 2
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr
MACs hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521

# Session controls
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
MaxAuthTries 3

# Banner for unauthorized access notice
Banner /etc/ssh/hipaa-banner.txt
EOF

# Create HIPAA warning banner
sudo tee /etc/ssh/hipaa-banner.txt << 'EOF'
AUTHORIZED ACCESS ONLY
This system contains protected health information (PHI).
Unauthorized access is prohibited and monitored.
All activities on this system are logged.
EOF

sudo systemctl reload sshd
```

### Minimal Privilege Access

```bash
# Create a dedicated group for ePHI access
sudo groupadd ephi-access

# Grant access only to authorized users
sudo usermod -aG ephi-access authorized_user

# Restrict ePHI data directories to this group
sudo chown root:ephi-access /opt/ephi-data
sudo chmod 750 /opt/ephi-data

# Use ACLs for granular control
sudo apt install acl -y
sudo setfacl -m g:ephi-access:rx /opt/ephi-data
sudo getfacl /opt/ephi-data
```

## Audit Controls

HIPAA requires audit logs of who accessed or modified ePHI. The Linux audit system handles this:

```bash
# Configure auditd for HIPAA
sudo tee /etc/audit/rules.d/hipaa.rules << 'EOF'
# Delete existing rules and set failure mode
-D
-b 8192
-f 1

# Log all authentication events
-w /etc/passwd -p wa -k user_modification
-w /etc/shadow -p wa -k password_modification
-w /etc/group -p wa -k group_modification
-w /etc/sudoers -p wa -k sudoers_modification
-w /etc/sudoers.d/ -p wa -k sudoers_modification

# Log access to ePHI data directories
-w /opt/ephi-data/ -p rwxa -k ephi_access

# Log SSH authentication
-w /var/log/auth.log -p wa -k auth_log
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Log cron modifications
-w /etc/cron.d/ -p wa -k cron_modification
-w /var/spool/cron/ -p wa -k cron_modification

# Log privilege escalation
-w /usr/bin/sudo -p x -k priv_escalation
-w /bin/su -p x -k priv_escalation

# Log kernel module loading
-a always,exit -F arch=b64 -S init_module -S delete_module -k kernel_modules

# Log failed file access
-a always,exit -F arch=b64 -S open -F exit=-EACCES -k access_denied
-a always,exit -F arch=b64 -S open -F exit=-EPERM -k access_denied

# Make rules immutable (require reboot to change)
-e 2
EOF

# Apply the rules
sudo augenrules --load
sudo systemctl enable auditd
sudo systemctl restart auditd
```

### Shipping Audit Logs Off-Server

```bash
# Install rsyslog for log forwarding
sudo apt install rsyslog -y

# Configure audit log forwarding to SIEM
sudo tee /etc/rsyslog.d/90-hipaa-audit.conf << 'EOF'
# Forward auth and audit logs to SIEM
if $programname == 'sudo' then @@siem.internal.example.com:514
if $programname == 'sshd' then @@siem.internal.example.com:514
auth.*;authpriv.* @@siem.internal.example.com:514
EOF

sudo systemctl restart rsyslog
```

## Integrity Controls

### File Integrity Monitoring with AIDE

```bash
# Initialize AIDE database (do this after securing the system)
sudo aide --init

# Move the generated database to the active location
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Configure AIDE in /etc/aide/aide.conf
sudo nano /etc/aide/aide.conf
```

```conf
# AIDE configuration for HIPAA
# Database locations
database_in=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new
database_new=file:/var/lib/aide/aide.db.new

# Log location
report_url=file:/var/log/aide/aide.log
report_url=stdout

# Check these directories for ePHI systems
/opt/ephi-data p+i+n+u+g+s+b+m+sha512
/etc p+i+n+u+g+s+b+m+sha512
/bin p+i+n+u+g+s+b+m+sha512
/sbin p+i+n+u+g+s+b+m+sha512

# Exclude volatile paths
!/proc
!/sys
!/var/log
!/tmp
```

```bash
# Run AIDE check daily
sudo tee /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
/usr/bin/aide --check >> /var/log/aide/aide.log 2>&1
if [ $? -ne 0 ]; then
    echo "AIDE integrity check FAILED - possible file modification" | \
      mail -s "HIPAA INTEGRITY ALERT - $(hostname)" security@example.com
fi
EOF
sudo chmod +x /etc/cron.daily/aide-check
```

## Encryption at Rest

ePHI must be encrypted when stored:

```bash
# For a data directory, use LUKS encryption
# During initial setup:
sudo apt install cryptsetup -y

# Create an encrypted volume (for a separate partition or disk)
sudo cryptsetup luksFormat /dev/sdb1

# Open the encrypted volume
sudo cryptsetup luksOpen /dev/sdb1 ephi-data

# Create filesystem and mount
sudo mkfs.ext4 /dev/mapper/ephi-data
sudo mount /dev/mapper/ephi-data /opt/ephi-data

# For existing data, use eCryptfs for directory-level encryption
sudo apt install ecryptfs-utils -y
sudo mount -t ecryptfs /opt/ephi-data /opt/ephi-data
```

## Transmission Security

```bash
# Enforce TLS 1.2+ for any services handling ePHI
# For nginx handling ePHI:
sudo tee /etc/nginx/snippets/hipaa-ssl.conf << 'EOF'
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
add_header Strict-Transport-Security "max-age=31536000" always;
EOF
```

## Log Retention

HIPAA requires audit logs be retained for at least 6 years:

```bash
# Configure logrotate for long retention
sudo tee /etc/logrotate.d/hipaa-audit << 'EOF'
/var/log/audit/audit.log {
    rotate 2190
    daily
    compress
    missingok
    notifempty
    postrotate
        /usr/sbin/service auditd restart > /dev/null 2>&1 || true
    endscript
}
EOF
```

## Automated Compliance Checking

Run a daily check script to verify key controls are in place:

```bash
#!/bin/bash
# /usr/local/bin/hipaa-check.sh - Daily HIPAA compliance verification

PASS=0
FAIL=0

check() {
    if eval "$2" > /dev/null 2>&1; then
        echo "PASS: $1"
        ((PASS++))
    else
        echo "FAIL: $1"
        ((FAIL++))
    fi
}

check "auditd running" "systemctl is-active auditd"
check "SSH root login disabled" "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf"
check "Password authentication disabled" "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf"
check "UFW active" "ufw status | grep -q 'Status: active'"
check "fail2ban running" "systemctl is-active fail2ban"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -gt 0 ] && exit 1 || exit 0
```

HIPAA compliance is an ongoing process, not a one-time configuration. Regular audits, staff training, incident response procedures, and business associate agreements are all required alongside these technical controls.
