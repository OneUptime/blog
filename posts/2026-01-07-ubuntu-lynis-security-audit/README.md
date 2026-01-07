# How to Audit Ubuntu Servers with Lynis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Security, Lynis, Compliance, Auditing

Description: Audit Ubuntu server security with Lynis for comprehensive vulnerability scanning, compliance checking, and hardening recommendations.

---

## Introduction

Server security is a critical aspect of maintaining a reliable and trustworthy infrastructure. Whether you are managing a single Ubuntu server or an entire fleet, regular security audits help identify vulnerabilities, misconfigurations, and compliance gaps before they become serious issues.

Lynis is an open-source security auditing tool designed for Unix-based systems, including Linux, macOS, and BSD. It performs an extensive health scan of your system, checking for security issues, software vulnerabilities, configuration errors, and compliance with industry standards.

In this comprehensive guide, you will learn how to install Lynis on Ubuntu servers, run security audits, interpret the results, and implement hardening recommendations. We will also cover creating custom audit profiles and automating scans using cron jobs.

## Prerequisites

Before you begin, ensure you have:

- An Ubuntu server (18.04, 20.04, 22.04, or later)
- Root or sudo access to the server
- Basic familiarity with the Linux command line
- A terminal session connected to your server

## Understanding Lynis

Lynis performs a comprehensive security audit by examining various aspects of your system:

- **System tools and boot settings**: Boot loader configuration, authentication requirements
- **Kernel configuration**: Security modules, kernel parameters, hardware support
- **Memory and processes**: Running processes, memory protection features
- **Users and groups**: Account settings, password policies, authentication
- **Shells and consoles**: Available shells, console access restrictions
- **File systems**: Mount options, file permissions, disk encryption
- **Storage and NFS**: Storage devices, network file systems
- **Software packages**: Installed packages, package manager configuration
- **Networking**: Firewall configuration, network interfaces, open ports
- **Printers and spools**: Print services and configurations
- **Email and messaging**: Mail server configuration, messaging services
- **Firewalls**: iptables, nftables, ufw configuration
- **Web servers**: Apache, Nginx, and other web server configurations
- **SSH configuration**: SSH daemon settings, key management
- **SNMP and databases**: SNMP configuration, database security
- **LDAP and PHP**: Directory services, PHP configuration
- **Logging and files**: Log management, file integrity
- **Scheduled tasks**: Cron jobs, at jobs, systemd timers
- **Time and synchronization**: NTP configuration, time zone settings
- **Cryptography**: SSL/TLS configuration, certificate management
- **Virtualization and containers**: Docker, LXC, virtualization platforms
- **Security frameworks**: AppArmor, SELinux, security modules
- **Malware scanners**: Antivirus and malware detection tools
- **File integrity**: AIDE, Tripwire, file integrity monitoring

## Installing Lynis

There are several methods to install Lynis on Ubuntu. We will cover the most common approaches.

### Method 1: Installing from Ubuntu Repositories

The simplest way to install Lynis is through the default Ubuntu package repositories.

```bash
# Update the package index to ensure you have the latest package information
sudo apt update

# Install Lynis from the Ubuntu repositories
sudo apt install lynis -y

# Verify the installation by checking the version
lynis --version
```

Note: The version in Ubuntu repositories may not be the latest. For the most recent version, consider using the official Lynis repository.

### Method 2: Installing from the Official Lynis Repository

For the latest version with the most up-to-date security checks, add the official Lynis repository.

```bash
# Install required packages for adding repositories
sudo apt install apt-transport-https ca-certificates curl gnupg -y

# Add the Lynis signing key to verify package authenticity
sudo curl -fsSL https://packages.cisofy.com/keys/cisofy-software-public.key | sudo gpg --dearmor -o /usr/share/keyrings/cisofy-archive-keyring.gpg

# Add the Lynis repository to your sources list
echo "deb [signed-by=/usr/share/keyrings/cisofy-archive-keyring.gpg] https://packages.cisofy.com/community/lynis/deb/ stable main" | sudo tee /etc/apt/sources.list.d/cisofy-lynis.list

# Update package index with the new repository
sudo apt update

# Install the latest version of Lynis
sudo apt install lynis -y

# Confirm the installed version
lynis show version
```

### Method 3: Installing from Source (Git Clone)

For maximum flexibility and the ability to run Lynis without installation, you can clone the repository directly.

```bash
# Navigate to the opt directory for third-party software
cd /opt

# Clone the Lynis repository from GitHub
sudo git clone https://github.com/CISOfy/lynis.git

# Navigate to the Lynis directory
cd lynis

# Run Lynis directly without installation
sudo ./lynis audit system
```

### Verifying Installation

After installation, verify that Lynis is properly installed and check its version.

```bash
# Display Lynis version information
lynis show version

# Display detailed version and build information
lynis --version

# Show available Lynis commands and options
lynis show commands
```

## Running Your First Security Audit

Now that Lynis is installed, let us run a comprehensive security audit of your Ubuntu server.

### Basic System Audit

The primary command for auditing your system is `lynis audit system`.

```bash
# Run a full system audit with root privileges
# The sudo command ensures Lynis has access to all system files and configurations
sudo lynis audit system
```

During the audit, Lynis will display real-time progress as it checks various system components. The output uses color coding:

- **Green**: Passed checks or secure configurations
- **Yellow**: Suggestions or warnings that should be reviewed
- **Red**: Potential security issues that require attention
- **White**: Informational messages

### Quick Audit Mode

For a faster audit that skips some detailed checks, use the quick option.

```bash
# Run a quick system audit that skips some non-essential checks
sudo lynis audit system --quick
```

### Audit with Specific Tests Only

You can run specific test categories if you want to focus on particular areas.

```bash
# Show all available test groups
lynis show groups

# Run only authentication-related tests
sudo lynis audit system --tests-from-group authentication

# Run only firewall-related tests
sudo lynis audit system --tests-from-group firewalls

# Run only SSH-related tests
sudo lynis audit system --tests-from-group ssh
```

### Pentest Mode

Lynis includes a penetration testing mode that performs additional checks from an attacker's perspective.

```bash
# Run audit in penetration testing mode
# This mode includes additional checks that simulate an attacker's perspective
sudo lynis audit system --pentest
```

### Forensics Mode

For incident response scenarios, use forensics mode to gather detailed system information.

```bash
# Run audit in forensics mode for incident response
sudo lynis audit system --forensics
```

## Understanding Audit Results

After the audit completes, Lynis provides a comprehensive summary. Understanding this output is crucial for improving your server's security posture.

### Audit Report Sections

The audit report is divided into several key sections:

```bash
# View the main log file containing detailed audit results
sudo cat /var/log/lynis.log

# View the report file with structured findings
sudo cat /var/log/lynis-report.dat
```

### Hardening Index

The hardening index is a numerical score representing your system's overall security posture.

```bash
# Extract the hardening index from the report
sudo grep "hardening_index" /var/log/lynis-report.dat
```

The hardening index scale:

- **0-49**: Poor security posture, immediate attention required
- **50-69**: Fair security, significant improvements needed
- **70-79**: Good security, some improvements recommended
- **80-89**: Strong security posture
- **90-100**: Excellent security posture

### Viewing Warnings and Suggestions

Lynis categorizes findings into warnings (high priority) and suggestions (recommended improvements).

```bash
# Extract all warnings from the report
sudo grep "^warning\[\]" /var/log/lynis-report.dat

# Extract all suggestions from the report
sudo grep "^suggestion\[\]" /var/log/lynis-report.dat

# Count the total number of warnings
sudo grep -c "^warning\[\]" /var/log/lynis-report.dat

# Count the total number of suggestions
sudo grep -c "^suggestion\[\]" /var/log/lynis-report.dat
```

### Parsing the Report File

The report file uses a key-value format that can be parsed for automation.

```bash
# Create a script to parse and display key findings
cat << 'EOF' > /tmp/parse_lynis_report.sh
#!/bin/bash

# Parse Lynis report and display key security metrics
REPORT_FILE="/var/log/lynis-report.dat"

echo "=== Lynis Security Audit Summary ==="
echo ""

# Display hardening index
echo "Hardening Index:"
grep "hardening_index" $REPORT_FILE | cut -d'=' -f2

echo ""
echo "Warnings Found:"
grep "^warning\[\]" $REPORT_FILE | cut -d'|' -f2

echo ""
echo "Top Suggestions:"
grep "^suggestion\[\]" $REPORT_FILE | head -10 | cut -d'|' -f2

echo ""
echo "Installed Packages Count:"
grep "installed_packages" $REPORT_FILE | cut -d'=' -f2
EOF

# Make the script executable and run it
chmod +x /tmp/parse_lynis_report.sh
sudo /tmp/parse_lynis_report.sh
```

### Understanding Test Results

Each test in Lynis has a unique identifier. You can look up specific tests for more information.

```bash
# Show details about a specific test
lynis show details FIRE-4513

# List all available tests
lynis show tests

# Show tests in a specific category
lynis show tests | grep SSH
```

## Hardening Index Deep Dive

The hardening index is calculated based on the results of all performed tests. Let us explore how to interpret and improve this score.

### Factors Affecting the Hardening Index

```bash
# Create a script to analyze hardening factors
cat << 'EOF' > /tmp/analyze_hardening.sh
#!/bin/bash

# Analyze factors contributing to the hardening index
REPORT_FILE="/var/log/lynis-report.dat"

echo "=== Hardening Index Analysis ==="

# Count different result types
PASSED=$(grep -c "^test_result\[\]=OK" $REPORT_FILE 2>/dev/null || echo "0")
WARNING=$(grep -c "^test_result\[\]=WARNING" $REPORT_FILE 2>/dev/null || echo "0")
SUGGESTION=$(grep -c "^suggestion\[\]" $REPORT_FILE 2>/dev/null || echo "0")

echo "Tests Passed: $PASSED"
echo "Warnings: $WARNING"
echo "Suggestions: $SUGGESTION"

# Display the hardening index
echo ""
echo "Current Hardening Index:"
grep "hardening_index" $REPORT_FILE | cut -d'=' -f2

# Show security frameworks in use
echo ""
echo "Security Frameworks Detected:"
grep "framework\[\]" $REPORT_FILE | cut -d'=' -f2
EOF

chmod +x /tmp/analyze_hardening.sh
sudo /tmp/analyze_hardening.sh
```

### Tracking Hardening Progress Over Time

Monitor your security improvements by saving and comparing audit results.

```bash
# Create a directory to store historical audit reports
sudo mkdir -p /var/log/lynis-history

# Create a script to archive audit results with timestamps
cat << 'EOF' > /usr/local/bin/lynis-archive.sh
#!/bin/bash

# Archive Lynis audit results with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_DIR="/var/log/lynis-history"

# Run the audit
lynis audit system --quiet

# Archive the results
cp /var/log/lynis.log "$ARCHIVE_DIR/lynis_$TIMESTAMP.log"
cp /var/log/lynis-report.dat "$ARCHIVE_DIR/lynis-report_$TIMESTAMP.dat"

# Extract and save the hardening index
HARDENING_INDEX=$(grep "hardening_index" /var/log/lynis-report.dat | cut -d'=' -f2)
echo "$TIMESTAMP,$HARDENING_INDEX" >> "$ARCHIVE_DIR/hardening_history.csv"

echo "Audit archived: $TIMESTAMP"
echo "Hardening Index: $HARDENING_INDEX"
EOF

sudo chmod +x /usr/local/bin/lynis-archive.sh
```

## Addressing Common Findings

Let us address some of the most common security findings that Lynis reports on Ubuntu servers.

### SSH Hardening

SSH is often one of the first areas where Lynis finds room for improvement.

```bash
# Backup the current SSH configuration before making changes
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create a hardened SSH configuration
# This configuration implements security best practices
sudo tee /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# Disable root login over SSH for security
PermitRootLogin no

# Use only SSH Protocol 2 (more secure)
Protocol 2

# Set maximum authentication attempts
MaxAuthTries 3

# Disable password authentication (use key-based auth instead)
# Uncomment the following line only if you have SSH keys configured
# PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Enable public key authentication
PubkeyAuthentication yes

# Disable X11 forwarding unless needed
X11Forwarding no

# Set login grace time (time allowed for authentication)
LoginGraceTime 60

# Limit SSH access to specific users (uncomment and modify as needed)
# AllowUsers your_username

# Use strong ciphers only
Ciphers aes256-gcm@openssh.com,chacha20-poly1305@openssh.com,aes256-ctr

# Use strong MACs only
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512

# Log SSH activity
LogLevel VERBOSE

# Disable TCP forwarding unless needed
AllowTcpForwarding no

# Disable agent forwarding unless needed
AllowAgentForwarding no
EOF

# Validate the SSH configuration before applying
sudo sshd -t

# If validation passes, restart SSH service
sudo systemctl restart sshd
```

### Kernel Hardening

Apply kernel security parameters to improve system resilience.

```bash
# Create a sysctl configuration file for security hardening
sudo tee /etc/sysctl.d/99-security-hardening.conf << 'EOF'
# Kernel security hardening parameters

# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Ignore ICMP broadcast requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP responses
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Do not send ICMP redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Log martian packets (packets with impossible addresses)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Disable IPv6 if not needed (uncomment if applicable)
# net.ipv6.conf.all.disable_ipv6 = 1
# net.ipv6.conf.default.disable_ipv6 = 1

# Restrict kernel pointer exposure
kernel.kptr_restrict = 2

# Restrict access to kernel logs
kernel.dmesg_restrict = 1

# Enable address space layout randomization (ASLR)
kernel.randomize_va_space = 2

# Restrict ptrace scope
kernel.yama.ptrace_scope = 1

# Protect against hardlink and symlink attacks
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF

# Apply the new sysctl settings
sudo sysctl --system
```

### Firewall Configuration

Ensure UFW (Uncomplicated Firewall) is properly configured.

```bash
# Check if UFW is installed
sudo apt install ufw -y

# Set default policies - deny all incoming, allow all outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH connections (IMPORTANT: do this before enabling UFW)
sudo ufw allow ssh

# Allow specific services as needed (examples)
# sudo ufw allow http
# sudo ufw allow https
# sudo ufw allow 8080/tcp

# Enable logging
sudo ufw logging on

# Enable the firewall
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

### File Permissions Hardening

Correct file permissions for sensitive system files.

```bash
# Secure passwd and shadow files
sudo chmod 644 /etc/passwd
sudo chmod 600 /etc/shadow
sudo chmod 644 /etc/group
sudo chmod 600 /etc/gshadow

# Secure SSH directory and keys
sudo chmod 700 /root/.ssh 2>/dev/null || true
sudo chmod 600 /root/.ssh/authorized_keys 2>/dev/null || true

# Secure cron directories
sudo chmod 700 /etc/cron.d
sudo chmod 700 /etc/cron.daily
sudo chmod 700 /etc/cron.hourly
sudo chmod 700 /etc/cron.monthly
sudo chmod 700 /etc/cron.weekly

# Restrict access to crontab
sudo chmod 600 /etc/crontab

# Secure grub configuration
sudo chmod 600 /boot/grub/grub.cfg 2>/dev/null || true
```

### Password Policy Configuration

Implement strong password policies.

```bash
# Install libpam-pwquality for password quality checking
sudo apt install libpam-pwquality -y

# Configure password quality requirements
sudo tee /etc/security/pwquality.conf << 'EOF'
# Minimum password length
minlen = 14

# Require at least one digit
dcredit = -1

# Require at least one uppercase letter
ucredit = -1

# Require at least one lowercase letter
lcredit = -1

# Require at least one special character
ocredit = -1

# Maximum number of consecutive same characters
maxrepeat = 3

# Reject passwords containing the username
usercheck = 1

# Enforce password complexity
enforcing = 1
EOF

# Configure password aging policies
sudo tee /etc/login.defs.d/password-policy.conf << 'EOF' 2>/dev/null || \
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs && \
sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   7/' /etc/login.defs && \
sudo sed -i 's/^PASS_WARN_AGE.*/PASS_WARN_AGE   14/' /etc/login.defs
```

### Disabling Unused Services

Identify and disable unnecessary services to reduce attack surface.

```bash
# List all enabled services
systemctl list-unit-files --state=enabled

# Create a script to identify potentially unnecessary services
cat << 'EOF' > /tmp/check_services.sh
#!/bin/bash

# List of commonly unnecessary services on a server
UNNECESSARY_SERVICES=(
    "cups"
    "avahi-daemon"
    "bluetooth"
    "ModemManager"
    "whoopsie"
    "apport"
)

echo "Checking for potentially unnecessary services..."
echo ""

for service in "${UNNECESSARY_SERVICES[@]}"; do
    if systemctl is-enabled "$service" 2>/dev/null | grep -q "enabled"; then
        echo "Found enabled: $service"
        echo "  To disable: sudo systemctl disable --now $service"
    fi
done
EOF

chmod +x /tmp/check_services.sh
/tmp/check_services.sh

# Example: Disable a specific unnecessary service
# sudo systemctl disable --now cups
```

### Configuring Automatic Updates

Enable automatic security updates to keep your system patched.

```bash
# Install unattended-upgrades package
sudo apt install unattended-upgrades apt-listchanges -y

# Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure unattended-upgrades
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Remove unused kernel packages
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Automatically reboot if required (set time as needed)
Unattended-Upgrade::Automatic-Reboot "false";

// Enable email notifications (optional)
// Unattended-Upgrade::Mail "admin@example.com";
EOF

# Enable automatic updates timer
sudo systemctl enable apt-daily.timer
sudo systemctl enable apt-daily-upgrade.timer
```

## Custom Audit Profiles

Lynis supports custom profiles to tailor audits to your specific requirements.

### Creating a Custom Profile

```bash
# Create a directory for custom Lynis profiles
sudo mkdir -p /etc/lynis/custom

# Create a custom audit profile
sudo tee /etc/lynis/custom/production-server.prf << 'EOF'
#################################################################################
#
# Custom Lynis Profile: Production Server
# Description: Security audit profile for production Ubuntu servers
#
#################################################################################

# Profile name
config:profile_name:Production Server Audit

# Skip certain tests that are not applicable
skip-test=FILE-6310
skip-test=PKGS-7392

# Enable specific test groups
test-group=authentication
test-group=boot_services
test-group=firewalls
test-group=networking
test-group=ssh
test-group=storage
test-group=webservers

# Compliance frameworks to check against
compliance-standards=cis,hipaa,pci-dss

# Custom settings
config:show_tool_tips:no
config:pause_between_tests:0
config:show_report_solution:yes

# Logging settings
config:log_tests_incorrect_os:no

# Plugin settings
plugin=default

# Skip development tools checks (not relevant for production)
skip-test=TOOL-5002

#################################################################################
EOF
```

### Using Custom Profiles

```bash
# Run audit with custom profile
sudo lynis audit system --profile /etc/lynis/custom/production-server.prf

# Combine with other options
sudo lynis audit system --profile /etc/lynis/custom/production-server.prf --quick
```

### Creating Compliance-Focused Profiles

```bash
# Create a CIS benchmark focused profile
sudo tee /etc/lynis/custom/cis-benchmark.prf << 'EOF'
#################################################################################
#
# Custom Lynis Profile: CIS Benchmark Compliance
# Description: Profile focused on CIS Ubuntu benchmark checks
#
#################################################################################

config:profile_name:CIS Benchmark Audit

# Focus on CIS-related compliance
compliance-standards=cis

# Enable verbose output for compliance checks
config:show_report_solution:yes
config:compressed_uploads:no

# Test categories relevant to CIS benchmarks
test-group=authentication
test-group=boot_services
test-group=firewalls
test-group=kernel
test-group=logging
test-group=networking
test-group=storage

# Additional hardening checks
config:test_skip_always:no

#################################################################################
EOF

# Run CIS benchmark focused audit
sudo lynis audit system --profile /etc/lynis/custom/cis-benchmark.prf
```

### Profile for Web Servers

```bash
# Create a web server focused profile
sudo tee /etc/lynis/custom/webserver.prf << 'EOF'
#################################################################################
#
# Custom Lynis Profile: Web Server
# Description: Security audit profile for Ubuntu web servers
#
#################################################################################

config:profile_name:Web Server Audit

# Focus on web server relevant test groups
test-group=authentication
test-group=firewalls
test-group=networking
test-group=webservers
test-group=ssh
test-group=logging

# Include PHP checks if applicable
test-group=php

# Skip tests not relevant to web servers
skip-test=MAIL-8820
skip-test=PRNT-2307
skip-test=PRNT-2308

# Enable detailed web server analysis
config:show_report_solution:yes

#################################################################################
EOF
```

## Automated Scanning with Cron

Setting up automated security audits ensures regular monitoring of your server's security posture.

### Basic Cron Job Setup

```bash
# Create a script for automated Lynis audits
sudo tee /usr/local/bin/lynis-scheduled-audit.sh << 'EOF'
#!/bin/bash

#################################################################################
# Lynis Scheduled Audit Script
# Description: Automated security audit with reporting
#################################################################################

# Configuration
REPORT_DIR="/var/log/lynis-reports"
EMAIL_RECIPIENT="admin@example.com"
HOSTNAME=$(hostname)
DATE=$(date +%Y-%m-%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/lynis_report_$DATE.txt"

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Run Lynis audit and capture output
echo "=== Lynis Security Audit Report ===" > "$REPORT_FILE"
echo "Host: $HOSTNAME" >> "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "=================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run the audit
lynis audit system --quiet --no-colors >> "$REPORT_FILE" 2>&1

# Extract key metrics
echo "" >> "$REPORT_FILE"
echo "=== Summary ===" >> "$REPORT_FILE"
HARDENING_INDEX=$(grep "hardening_index" /var/log/lynis-report.dat | cut -d'=' -f2)
echo "Hardening Index: $HARDENING_INDEX" >> "$REPORT_FILE"

WARNING_COUNT=$(grep -c "^warning\[\]" /var/log/lynis-report.dat)
echo "Warnings: $WARNING_COUNT" >> "$REPORT_FILE"

SUGGESTION_COUNT=$(grep -c "^suggestion\[\]" /var/log/lynis-report.dat)
echo "Suggestions: $SUGGESTION_COUNT" >> "$REPORT_FILE"

# Archive the detailed report files
cp /var/log/lynis.log "$REPORT_DIR/lynis_detailed_$DATE.log"
cp /var/log/lynis-report.dat "$REPORT_DIR/lynis_data_$DATE.dat"

# Send email notification if mail is configured
if command -v mail &> /dev/null; then
    echo "Lynis audit completed on $HOSTNAME. Hardening Index: $HARDENING_INDEX" | \
    mail -s "Lynis Security Audit - $HOSTNAME - $DATE" "$EMAIL_RECIPIENT"
fi

# Cleanup old reports (keep last 30 days)
find "$REPORT_DIR" -name "lynis_*" -mtime +30 -delete

echo "Audit completed. Report saved to: $REPORT_FILE"
EOF

# Make the script executable
sudo chmod +x /usr/local/bin/lynis-scheduled-audit.sh
```

### Setting Up the Cron Job

```bash
# Edit root's crontab to add the scheduled audit
sudo crontab -e

# Add one of the following lines to schedule audits:

# Run daily at 2:00 AM
# 0 2 * * * /usr/local/bin/lynis-scheduled-audit.sh

# Run weekly on Sunday at 3:00 AM
# 0 3 * * 0 /usr/local/bin/lynis-scheduled-audit.sh

# Run monthly on the 1st at 4:00 AM
# 0 4 1 * * /usr/local/bin/lynis-scheduled-audit.sh
```

### Alternative: Using Systemd Timer

For more reliable scheduling, use systemd timers instead of cron.

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/lynis-audit.service << 'EOF'
[Unit]
Description=Lynis Security Audit
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/lynis-scheduled-audit.sh
StandardOutput=journal
StandardError=journal
EOF

# Create the systemd timer file
sudo tee /etc/systemd/system/lynis-audit.timer << 'EOF'
[Unit]
Description=Run Lynis Security Audit Weekly

[Timer]
# Run every Sunday at 3:00 AM
OnCalendar=Sun *-*-* 03:00:00
# Add randomized delay up to 1 hour to prevent thundering herd
RandomizedDelaySec=3600
# Persist timer across reboots
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload systemd daemon to recognize new units
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable lynis-audit.timer
sudo systemctl start lynis-audit.timer

# Verify timer status
sudo systemctl list-timers | grep lynis
```

### Monitoring Cron Job Output

```bash
# Create a comprehensive monitoring script
sudo tee /usr/local/bin/lynis-monitor.sh << 'EOF'
#!/bin/bash

#################################################################################
# Lynis Monitoring Script
# Description: Monitor Lynis audit results and alert on issues
#################################################################################

REPORT_FILE="/var/log/lynis-report.dat"
ALERT_THRESHOLD=70

# Check if report file exists
if [ ! -f "$REPORT_FILE" ]; then
    echo "ERROR: Lynis report file not found. Run an audit first."
    exit 1
fi

# Get the hardening index
HARDENING_INDEX=$(grep "hardening_index" "$REPORT_FILE" | cut -d'=' -f2)

echo "Current Hardening Index: $HARDENING_INDEX"

# Alert if below threshold
if [ "$HARDENING_INDEX" -lt "$ALERT_THRESHOLD" ]; then
    echo "ALERT: Hardening index ($HARDENING_INDEX) is below threshold ($ALERT_THRESHOLD)"

    # Show critical warnings
    echo ""
    echo "Critical Warnings:"
    grep "^warning\[\]" "$REPORT_FILE" | cut -d'|' -f2 | head -5

    exit 1
fi

echo "Security posture is acceptable."
exit 0
EOF

sudo chmod +x /usr/local/bin/lynis-monitor.sh
```

## Integrating Lynis with Monitoring Systems

### Exporting Results for External Monitoring

```bash
# Create a script to export Lynis results in JSON format
sudo tee /usr/local/bin/lynis-export-json.sh << 'EOF'
#!/bin/bash

#################################################################################
# Lynis JSON Export Script
# Description: Export Lynis results in JSON format for monitoring integration
#################################################################################

REPORT_FILE="/var/log/lynis-report.dat"
OUTPUT_FILE="/var/log/lynis-metrics.json"

# Extract metrics
HARDENING_INDEX=$(grep "hardening_index" "$REPORT_FILE" | cut -d'=' -f2)
WARNING_COUNT=$(grep -c "^warning\[\]" "$REPORT_FILE")
SUGGESTION_COUNT=$(grep -c "^suggestion\[\]" "$REPORT_FILE")
HOSTNAME=$(hostname)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Generate JSON output
cat << JSONEOF > "$OUTPUT_FILE"
{
  "hostname": "$HOSTNAME",
  "timestamp": "$TIMESTAMP",
  "hardening_index": $HARDENING_INDEX,
  "warning_count": $WARNING_COUNT,
  "suggestion_count": $SUGGESTION_COUNT,
  "status": "$([ $HARDENING_INDEX -ge 70 ] && echo 'pass' || echo 'fail')"
}
JSONEOF

echo "Metrics exported to $OUTPUT_FILE"
cat "$OUTPUT_FILE"
EOF

sudo chmod +x /usr/local/bin/lynis-export-json.sh
```

### Integration with Prometheus (Optional)

```bash
# Create a script to expose Lynis metrics for Prometheus
sudo tee /usr/local/bin/lynis-prometheus-exporter.sh << 'EOF'
#!/bin/bash

#################################################################################
# Lynis Prometheus Exporter
# Description: Export Lynis metrics in Prometheus format
#################################################################################

REPORT_FILE="/var/log/lynis-report.dat"
METRICS_FILE="/var/lib/node_exporter/textfile_collector/lynis.prom"

# Ensure directory exists
mkdir -p /var/lib/node_exporter/textfile_collector

# Extract metrics
HARDENING_INDEX=$(grep "hardening_index" "$REPORT_FILE" 2>/dev/null | cut -d'=' -f2 || echo "0")
WARNING_COUNT=$(grep -c "^warning\[\]" "$REPORT_FILE" 2>/dev/null || echo "0")
SUGGESTION_COUNT=$(grep -c "^suggestion\[\]" "$REPORT_FILE" 2>/dev/null || echo "0")

# Write Prometheus format metrics
cat << PROMEOF > "$METRICS_FILE"
# HELP lynis_hardening_index Lynis security hardening index score
# TYPE lynis_hardening_index gauge
lynis_hardening_index $HARDENING_INDEX

# HELP lynis_warning_count Number of warnings from Lynis audit
# TYPE lynis_warning_count gauge
lynis_warning_count $WARNING_COUNT

# HELP lynis_suggestion_count Number of suggestions from Lynis audit
# TYPE lynis_suggestion_count gauge
lynis_suggestion_count $SUGGESTION_COUNT

# HELP lynis_last_audit_timestamp Unix timestamp of last Lynis audit
# TYPE lynis_last_audit_timestamp gauge
lynis_last_audit_timestamp $(date +%s)
PROMEOF

echo "Prometheus metrics written to $METRICS_FILE"
EOF

sudo chmod +x /usr/local/bin/lynis-prometheus-exporter.sh
```

## Best Practices and Tips

### Regular Audit Schedule

Establish a consistent audit schedule based on your security requirements:

```bash
# Production servers: Weekly audits
# Development servers: Monthly audits
# After major changes: Immediate audit

# Example: Create a post-deployment audit hook
sudo tee /usr/local/bin/post-deploy-audit.sh << 'EOF'
#!/bin/bash
# Run after deployments to verify security posture
echo "Running post-deployment security audit..."
lynis audit system --quick --quiet
SCORE=$(grep "hardening_index" /var/log/lynis-report.dat | cut -d'=' -f2)
echo "Post-deployment hardening index: $SCORE"
if [ "$SCORE" -lt 70 ]; then
    echo "WARNING: Security score dropped below threshold!"
    exit 1
fi
EOF
sudo chmod +x /usr/local/bin/post-deploy-audit.sh
```

### Baseline Comparison

Compare audit results against a known-good baseline.

```bash
# Create a baseline after initial hardening
sudo cp /var/log/lynis-report.dat /var/log/lynis-baseline.dat

# Create a comparison script
sudo tee /usr/local/bin/lynis-compare-baseline.sh << 'EOF'
#!/bin/bash

BASELINE="/var/log/lynis-baseline.dat"
CURRENT="/var/log/lynis-report.dat"

echo "=== Baseline Comparison ==="

BASELINE_SCORE=$(grep "hardening_index" "$BASELINE" | cut -d'=' -f2)
CURRENT_SCORE=$(grep "hardening_index" "$CURRENT" | cut -d'=' -f2)

echo "Baseline Score: $BASELINE_SCORE"
echo "Current Score: $CURRENT_SCORE"

DIFF=$((CURRENT_SCORE - BASELINE_SCORE))

if [ $DIFF -gt 0 ]; then
    echo "Status: IMPROVED by $DIFF points"
elif [ $DIFF -lt 0 ]; then
    echo "Status: DEGRADED by ${DIFF#-} points"
else
    echo "Status: UNCHANGED"
fi
EOF

sudo chmod +x /usr/local/bin/lynis-compare-baseline.sh
```

### Documentation and Remediation Tracking

Keep track of findings and remediation efforts.

```bash
# Create a remediation tracking file
sudo tee /etc/lynis/remediation-log.md << 'EOF'
# Lynis Remediation Log

## Format
- Date: [DATE]
- Finding: [FINDING ID]
- Description: [DESCRIPTION]
- Action Taken: [ACTION]
- Status: [PENDING/COMPLETE/WONTFIX]

## Entries

### Example Entry
- Date: 2026-01-07
- Finding: SSH-7408
- Description: SSH root login enabled
- Action Taken: Disabled root login in /etc/ssh/sshd_config
- Status: COMPLETE

EOF
```

## Conclusion

Lynis is an invaluable tool for maintaining the security posture of your Ubuntu servers. By following this guide, you have learned how to:

1. Install Lynis using multiple methods
2. Run comprehensive security audits
3. Interpret the hardening index and audit results
4. Address common security findings
5. Create custom audit profiles tailored to your needs
6. Automate security scanning with cron and systemd timers

Regular security audits with Lynis should be an integral part of your server maintenance routine. Combined with proper hardening measures, automated updates, and continuous monitoring, you can maintain a robust security posture for your Ubuntu infrastructure.

Remember that security is an ongoing process. New vulnerabilities are discovered regularly, and your systems require continuous attention to remain protected. Use Lynis as part of a comprehensive security strategy that includes regular updates, access control reviews, and incident response planning.

## Additional Resources

- [Lynis Official Documentation](https://cisofy.com/documentation/lynis/)
- [CIS Ubuntu Benchmarks](https://www.cisecurity.org/benchmark/ubuntu_linux)
- [Ubuntu Security Guide](https://ubuntu.com/security)
- [Linux Security Hardening](https://www.linux.com/training-tutorials/linux-security-hardening/)

## Related OneUptime Features

OneUptime provides comprehensive monitoring capabilities that complement your Lynis security audits:

- **Server Monitoring**: Track server health and performance metrics
- **Alert Management**: Receive notifications when security scores drop
- **Incident Management**: Track and manage security incidents
- **Status Pages**: Communicate security status to stakeholders

Integrate your Lynis audit results with OneUptime for a complete observability solution that includes security monitoring alongside performance and availability monitoring.
