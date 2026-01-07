# How to Set Up Automatic Security Updates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Security, DevOps, Automation

Description: Configure automatic security updates on Ubuntu using unattended-upgrades and Canonical Livepatch for kernel patching without reboots.

---

Keeping your Ubuntu servers secure is one of the most critical responsibilities for any system administrator or DevOps engineer. Security vulnerabilities are discovered regularly, and attackers are quick to exploit unpatched systems. Manual updates, while thorough, are time-consuming and prone to human error or delay. This is where automatic security updates come in.

In this comprehensive guide, we will walk through setting up automatic security updates on Ubuntu using two powerful tools: **unattended-upgrades** for package updates and **Canonical Livepatch** for applying kernel security patches without requiring a reboot.

## Why Automatic Security Updates Matter

Before diving into the configuration, let's understand why automatic security updates are essential:

1. **Reduced Attack Window**: Vulnerabilities are patched as soon as updates are released
2. **Consistency**: All servers receive updates on the same schedule
3. **Reduced Human Error**: No chance of forgetting to apply critical patches
4. **Time Savings**: System administrators can focus on more important tasks
5. **Compliance**: Many security standards require timely patching

## Prerequisites

Before we begin, ensure you have:

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS (or newer)
- Root or sudo access to your system
- An active internet connection
- For Livepatch: An Ubuntu One account (free for up to 5 machines)

## Part 1: Installing and Configuring unattended-upgrades

### Step 1: Install the unattended-upgrades Package

The unattended-upgrades package automatically installs security updates. Install it along with the apt-listchanges package for better change tracking.

```bash
# Update package lists to ensure we get the latest version
sudo apt update

# Install unattended-upgrades and apt-listchanges
# apt-listchanges shows what changed before updates are applied
sudo apt install unattended-upgrades apt-listchanges -y
```

### Step 2: Enable Automatic Updates

Ubuntu provides a convenient way to configure automatic updates using the dpkg-reconfigure tool.

```bash
# Run the interactive configuration tool
# Select "Yes" when prompted to enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

This command creates a file at `/etc/apt/apt.conf.d/20auto-upgrades` with the following content:

```bash
# Check the auto-upgrades configuration file
cat /etc/apt/apt.conf.d/20auto-upgrades
```

Expected output:

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

### Step 3: Verify the Installation

Confirm that unattended-upgrades is properly installed and configured.

```bash
# Check if the unattended-upgrades service is active
sudo systemctl status unattended-upgrades

# Verify the package is installed correctly
apt-cache policy unattended-upgrades
```

## Part 2: Deep Dive into Configuration Files

The main configuration file for unattended-upgrades is located at `/etc/apt/apt.conf.d/50unattended-upgrades`. Let's explore each section in detail.

### Understanding the Main Configuration File

```bash
# Open the main configuration file for editing
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### Allowed Origins Configuration

The `Unattended-Upgrade::Allowed-Origins` section defines which repositories are allowed for automatic updates.

```conf
// Automatically upgrade packages from these origin patterns
// The format is: "origin:archive" or "origin:codename"
Unattended-Upgrade::Allowed-Origins {
    // Enable security updates for the Ubuntu base system
    "${distro_id}:${distro_codename}";

    // Enable security updates from the security repository (CRITICAL)
    "${distro_id}:${distro_codename}-security";

    // Enable updates from the updates repository (optional)
    // Uncomment the following line to include regular updates
    // "${distro_id}:${distro_codename}-updates";

    // Enable updates from the proposed repository (NOT recommended for production)
    // "${distro_id}:${distro_codename}-proposed";

    // Enable updates from the backports repository (optional)
    // "${distro_id}:${distro_codename}-backports";

    // Extended Security Maintenance (for Ubuntu Pro users)
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
```

### Package Blacklist Configuration

Sometimes you need to prevent certain packages from being automatically updated. This is especially important for production databases or applications that require careful upgrade planning.

```conf
// List of packages to NOT automatically upgrade
// Use exact package names or Python-style regular expressions
Unattended-Upgrade::Package-Blacklist {
    // Prevent MySQL server from automatic updates (requires testing)
    "mysql-server";
    "mysql-server-8.0";

    // Prevent PostgreSQL from automatic updates
    "postgresql";
    "postgresql-14";

    // Prevent Docker from automatic updates (may affect running containers)
    "docker-ce";
    "docker-ce-cli";
    "containerd.io";

    // Prevent specific kernel versions from updating (if needed)
    // "linux-image-*";

    // Prevent Nginx from automatic updates (web server config changes)
    // "nginx";

    // Use regex to match multiple versions of a package
    // "libc6$";  // Matches only libc6, not libc6-dev

    // Match packages with specific patterns
    // "libmysql.*";  // All MySQL libraries
};
```

### Automatic Removal of Unused Dependencies

Configure whether to automatically remove packages that are no longer needed.

```conf
// Remove unused kernel packages after upgrade
// This prevents /boot from filling up over time
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused dependencies after upgrade (similar to apt autoremove)
// Set to true to keep your system clean
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Remove new unused dependencies after upgrade
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
```

### DevRelease Configuration

Control behavior for development releases.

```conf
// Automatically upgrade packages on development releases
// Set to "auto" to follow the normal behavior
// Set to "true" to force updates on dev releases
// Set to "false" to prevent updates on dev releases
Unattended-Upgrade::DevRelease "auto";
```

## Part 3: Email Notifications

Receiving notifications about automatic updates is crucial for maintaining visibility into your system's security posture.

### Step 1: Install a Mail Transfer Agent

First, install a mail transfer agent to send emails from your server.

```bash
# Install mailutils for the 'mail' command and postfix as MTA
# During installation, select "Internet Site" for most use cases
sudo apt install mailutils postfix -y
```

### Step 2: Configure Email Notifications

Edit the unattended-upgrades configuration to enable email notifications.

```conf
// Email address to receive upgrade notifications
// Replace with your actual email address
Unattended-Upgrade::Mail "admin@example.com";

// When to send email notifications:
// "always" - Send email for every upgrade (can be noisy)
// "only-on-error" - Only send email when something goes wrong (recommended)
// "on-change" - Send email when packages are upgraded or on errors
Unattended-Upgrade::MailReport "only-on-error";

// Alternative: Send email only on errors (deprecated but still works)
// Unattended-Upgrade::MailOnlyOnError "true";
```

### Step 3: Test Email Configuration

Verify that emails are working correctly.

```bash
# Send a test email to verify mail configuration
echo "Test email from $(hostname)" | mail -s "Unattended Upgrades Test" admin@example.com

# Check the mail log for any errors
sudo tail -20 /var/log/mail.log
```

### Step 4: Configure Postfix for External SMTP (Optional)

For better email deliverability, configure Postfix to use an external SMTP server.

```bash
# Edit the Postfix main configuration file
sudo nano /etc/postfix/main.cf
```

Add or modify the following lines for using Gmail SMTP as an example:

```conf
# Configure Postfix to relay through external SMTP
relayhost = [smtp.gmail.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_use_tls = yes
```

Create the password file:

```bash
# Create the SASL password file with your SMTP credentials
# Replace with your actual email and app password
echo "[smtp.gmail.com]:587 your-email@gmail.com:your-app-password" | sudo tee /etc/postfix/sasl_passwd

# Secure the password file
sudo chmod 600 /etc/postfix/sasl_passwd

# Create the hash database
sudo postmap /etc/postfix/sasl_passwd

# Restart Postfix to apply changes
sudo systemctl restart postfix
```

## Part 4: Automatic Reboot Configuration

Some updates, especially kernel updates, require a system reboot to take effect. You can configure unattended-upgrades to handle this automatically.

### Basic Automatic Reboot

```conf
// Automatically reboot the system if required after an upgrade
// WARNING: This will cause downtime - plan accordingly
Unattended-Upgrade::Automatic-Reboot "true";

// Time to perform the automatic reboot (24-hour format)
// Choose a time during your maintenance window
// "02:00" means 2:00 AM server time
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

// Reboot even if users are logged in
// Set to false if you want to prevent reboot when users are active
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
```

### Creating a Reboot Notification Script

Create a script to notify administrators before an automatic reboot occurs.

```bash
# Create a directory for custom scripts
sudo mkdir -p /usr/local/bin

# Create the pre-reboot notification script
sudo nano /usr/local/bin/notify-before-reboot.sh
```

Add the following content to the script:

```bash
#!/bin/bash

# Pre-reboot notification script for unattended-upgrades
# Sends notification before automatic reboot occurs

# Configuration
ADMIN_EMAIL="admin@example.com"
HOSTNAME=$(hostname)
REBOOT_TIME="02:00"
LOG_FILE="/var/log/unattended-upgrades/unattended-upgrades.log"

# Check if reboot is required
if [ -f /var/run/reboot-required ]; then
    # Get list of packages requiring reboot
    PACKAGES=""
    if [ -f /var/run/reboot-required.pkgs ]; then
        PACKAGES=$(cat /var/run/reboot-required.pkgs)
    fi

    # Send notification email
    cat <<EOF | mail -s "Reboot Required on $HOSTNAME" "$ADMIN_EMAIL"
Automatic Reboot Notification

Server: $HOSTNAME
Scheduled Reboot Time: $REBOOT_TIME

The following packages require a reboot:
$PACKAGES

Recent upgrade activity:
$(tail -50 "$LOG_FILE" 2>/dev/null || echo "Log file not available")

This is an automated message from unattended-upgrades.
EOF

    echo "$(date): Reboot notification sent to $ADMIN_EMAIL" >> /var/log/reboot-notifications.log
fi
```

Make the script executable and add it to cron:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/notify-before-reboot.sh

# Add a cron job to run before the scheduled reboot time
# This example runs at 1:30 AM, 30 minutes before the 2:00 AM reboot
(crontab -l 2>/dev/null; echo "30 1 * * * /usr/local/bin/notify-before-reboot.sh") | crontab -
```

## Part 5: Canonical Livepatch for Kernel Updates

Canonical Livepatch is a service that applies critical kernel patches without requiring a system reboot. This is invaluable for production servers where uptime is critical.

### Understanding Livepatch

Livepatch uses a technology called "kernel live patching" to:

- Apply security fixes to the running kernel in memory
- Eliminate the need for immediate reboots after kernel updates
- Reduce planned downtime significantly
- Provide protection against kernel-level vulnerabilities faster

### Step 1: Get a Livepatch Token

Before enabling Livepatch, you need to obtain a token from Canonical.

```bash
# Option 1: If you have Ubuntu Pro subscription
# The token is available in your Ubuntu Pro dashboard

# Option 2: For free personal use (up to 5 machines)
# Visit: https://ubuntu.com/security/livepatch
# Create an Ubuntu One account and get your token
```

### Step 2: Enable Livepatch Using ubuntu-advantage

For Ubuntu 20.04 and later, use the `ubuntu-advantage` (ua) or `pro` tool.

```bash
# Check if ubuntu-advantage-tools is installed
sudo apt install ubuntu-advantage-tools -y

# Attach your machine to Ubuntu Pro with your token
# Replace YOUR_TOKEN with your actual Livepatch token
sudo pro attach YOUR_TOKEN

# Alternatively, for older syntax
# sudo ua attach YOUR_TOKEN
```

### Step 3: Enable Livepatch Service

Once attached to Ubuntu Pro, enable the Livepatch service.

```bash
# Enable Livepatch service
sudo pro enable livepatch

# Verify Livepatch is running
sudo pro status
```

Expected output:

```
SERVICE          ENTITLED  STATUS       DESCRIPTION
esm-apps         yes       enabled      Expanded Security Maintenance for Applications
esm-infra        yes       enabled      Expanded Security Maintenance for Infrastructure
livepatch        yes       enabled      Canonical Livepatch service
```

### Step 4: Verify Livepatch Status

Check that Livepatch is actively protecting your kernel.

```bash
# Check detailed Livepatch status
sudo canonical-livepatch status --verbose
```

Example output:

```yaml
client-version: "9.7.5"
architecture: x86_64
cpu-model: Intel(R) Xeon(R) CPU E5-2686 v4 @ 2.30GHz
last-check: 2026-01-07T10:30:00Z
boot-time: 2026-01-01T00:00:00Z
uptime: 518400
status:
  - kernel: 5.15.0-91.101-generic
    running: true
    livepatch:
      checkState: checked
      patchState: applied
      version: "91.2"
      fixes: "CVE-2023-XXXXX, CVE-2024-XXXXX"
```

### Step 5: Configure Livepatch Settings

Customize Livepatch behavior using the configuration file.

```bash
# View current Livepatch configuration
sudo canonical-livepatch config

# Set the check interval (in seconds, minimum 60)
# This determines how often Livepatch checks for new patches
sudo canonical-livepatch config check-interval=3600

# Enable or disable automatic patch application
sudo canonical-livepatch config auto-refresh=true
```

### Livepatch for Air-Gapped Environments

For environments without direct internet access, you can configure a Livepatch proxy.

```bash
# Configure HTTP proxy for Livepatch
sudo canonical-livepatch config http-proxy=http://proxy.example.com:8080

# Configure HTTPS proxy
sudo canonical-livepatch config https-proxy=https://proxy.example.com:8080

# Verify proxy configuration
sudo canonical-livepatch config
```

## Part 6: Monitoring Update Status

Keeping track of automatic updates is essential for security compliance and troubleshooting.

### Checking unattended-upgrades Logs

```bash
# View the main unattended-upgrades log
sudo cat /var/log/unattended-upgrades/unattended-upgrades.log

# View only the last 50 lines for recent activity
sudo tail -50 /var/log/unattended-upgrades/unattended-upgrades.log

# Monitor the log in real-time
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log
```

### Checking dpkg Logs

```bash
# View package installation history
sudo cat /var/log/dpkg.log

# Filter for today's updates only
sudo grep "$(date +%Y-%m-%d)" /var/log/dpkg.log

# View only installed/upgraded packages
sudo grep " install \| upgrade " /var/log/dpkg.log | tail -30
```

### Creating a Monitoring Script

Create a comprehensive monitoring script for your update status.

```bash
# Create the monitoring script
sudo nano /usr/local/bin/check-update-status.sh
```

Add the following content:

```bash
#!/bin/bash

# Comprehensive update status monitoring script
# Displays the status of automatic updates and Livepatch

echo "=========================================="
echo "Ubuntu Automatic Updates Status Report"
echo "Generated: $(date)"
echo "Hostname: $(hostname)"
echo "=========================================="
echo ""

# System Information
echo "=== System Information ==="
echo "Ubuntu Version: $(lsb_release -ds)"
echo "Kernel Version: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo ""

# Check if reboot is required
echo "=== Reboot Status ==="
if [ -f /var/run/reboot-required ]; then
    echo "REBOOT REQUIRED!"
    if [ -f /var/run/reboot-required.pkgs ]; then
        echo "Packages requiring reboot:"
        cat /var/run/reboot-required.pkgs
    fi
else
    echo "No reboot required"
fi
echo ""

# unattended-upgrades status
echo "=== unattended-upgrades Service Status ==="
systemctl is-active unattended-upgrades >/dev/null 2>&1 && echo "Service: Active" || echo "Service: Inactive"
echo ""

# Recent updates
echo "=== Recent Updates (last 7 days) ==="
if [ -f /var/log/unattended-upgrades/unattended-upgrades.log ]; then
    grep -E "$(date +%Y-%m-)" /var/log/unattended-upgrades/unattended-upgrades.log | tail -20
else
    echo "No unattended-upgrades log found"
fi
echo ""

# Pending security updates
echo "=== Pending Security Updates ==="
apt list --upgradable 2>/dev/null | grep -i security | head -20 || echo "No pending security updates"
echo ""

# Livepatch status
echo "=== Canonical Livepatch Status ==="
if command -v canonical-livepatch >/dev/null 2>&1; then
    sudo canonical-livepatch status 2>/dev/null || echo "Livepatch not configured"
else
    echo "Livepatch not installed"
fi
echo ""

# APT timer status
echo "=== APT Update Timer Status ==="
systemctl status apt-daily.timer --no-pager | head -10
echo ""

echo "=== APT Upgrade Timer Status ==="
systemctl status apt-daily-upgrade.timer --no-pager | head -10
echo ""

echo "=========================================="
echo "End of Status Report"
echo "=========================================="
```

Make the script executable:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/check-update-status.sh

# Run the script to test
sudo /usr/local/bin/check-update-status.sh
```

### Setting Up Scheduled Status Reports

Configure a cron job to email status reports regularly.

```bash
# Add a weekly status report to cron
# This runs every Monday at 8:00 AM
(crontab -l 2>/dev/null; echo "0 8 * * 1 /usr/local/bin/check-update-status.sh | mail -s 'Weekly Update Status Report - \$(hostname)' admin@example.com") | crontab -
```

## Part 7: Testing Your Configuration

Before relying on automatic updates in production, thoroughly test your configuration.

### Dry Run Testing

```bash
# Perform a dry run to see what would be updated
# This does NOT actually install any updates
sudo unattended-upgrades --dry-run --debug
```

### Force an Update Run

```bash
# Force unattended-upgrades to run immediately
# Useful for testing your configuration
sudo unattended-upgrades --debug
```

### Testing Email Notifications

```bash
# Create a test scenario by temporarily modifying the configuration
# to send emails on every run, then restore afterward

# Backup the original configuration
sudo cp /etc/apt/apt.conf.d/50unattended-upgrades /etc/apt/apt.conf.d/50unattended-upgrades.bak

# Run with debug to test
sudo unattended-upgrades --debug

# Restore the original configuration
sudo mv /etc/apt/apt.conf.d/50unattended-upgrades.bak /etc/apt/apt.conf.d/50unattended-upgrades
```

## Part 8: Troubleshooting Common Issues

### Issue: Updates Not Running Automatically

```bash
# Check if the timers are enabled and running
systemctl status apt-daily.timer
systemctl status apt-daily-upgrade.timer

# Enable the timers if they're disabled
sudo systemctl enable apt-daily.timer
sudo systemctl enable apt-daily-upgrade.timer

# Start the timers
sudo systemctl start apt-daily.timer
sudo systemctl start apt-daily-upgrade.timer
```

### Issue: Package Lock Errors

```bash
# Check for processes holding the apt lock
sudo lsof /var/lib/dpkg/lock-frontend

# Wait for the lock to be released, or kill the process if it's stuck
# WARNING: Only kill if you're sure the process is hung
sudo kill -9 <PID>

# Remove stale lock files (use with caution)
sudo rm /var/lib/dpkg/lock-frontend
sudo rm /var/lib/apt/lists/lock
sudo rm /var/cache/apt/archives/lock

# Reconfigure dpkg
sudo dpkg --configure -a
```

### Issue: Email Notifications Not Working

```bash
# Check Postfix status
sudo systemctl status postfix

# View mail queue
mailq

# Check mail logs for errors
sudo tail -50 /var/log/mail.log

# Test sending email manually
echo "Test" | mail -s "Test Subject" admin@example.com
```

### Issue: Livepatch Not Applying Patches

```bash
# Check Livepatch status for errors
sudo canonical-livepatch status --verbose

# Refresh Livepatch manually
sudo canonical-livepatch refresh

# Check if the kernel is supported
sudo canonical-livepatch supported
```

## Part 9: Security Best Practices

### Principle of Least Privilege

```bash
# Ensure unattended-upgrades runs with minimal privileges
# The service already runs as root, but limit access to config files
sudo chmod 644 /etc/apt/apt.conf.d/50unattended-upgrades
sudo chmod 644 /etc/apt/apt.conf.d/20auto-upgrades
```

### Backup Before Updates

```bash
# Create a simple pre-update backup script
sudo nano /etc/apt/apt.conf.d/05backup
```

Add the following content to create snapshots before updates:

```conf
// Run a backup script before unattended-upgrades
// Uncomment and configure the path to your backup script
// DPkg::Pre-Invoke {"/usr/local/bin/pre-update-backup.sh"};
```

### Security Audit Logging

```bash
# Enable detailed logging for audit purposes
# Add to /etc/apt/apt.conf.d/50unattended-upgrades

// Enable detailed debug logging
Unattended-Upgrade::Debug "false";

// Log to syslog for centralized logging
Unattended-Upgrade::SyslogEnable "true";

// Set syslog facility
Unattended-Upgrade::SyslogFacility "daemon";
```

## Part 10: Complete Configuration Example

Here is a complete, production-ready configuration file:

```bash
# Create or replace the configuration file
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Complete configuration:

```conf
// Unattended-Upgrade::Allowed-Origins
// Origins from which to automatically install upgrades
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

// Packages to NOT automatically upgrade
Unattended-Upgrade::Package-Blacklist {
    // Database servers - require careful upgrade planning
    "mysql-server";
    "postgresql";
    "mongodb-org";

    // Container runtime - may affect running containers
    "docker-ce";
    "containerd.io";
};

// Split the upgrade into the smallest possible chunks
// This helps to avoid locking the system for extended periods
Unattended-Upgrade::MinimalSteps "true";

// Send email notification
Unattended-Upgrade::Mail "admin@example.com";

// Only send email on error
Unattended-Upgrade::MailReport "only-on-error";

// Remove unused kernel packages
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Automatic reboot if required
Unattended-Upgrade::Automatic-Reboot "true";

// Automatic reboot time
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

// Do not reboot if users are logged in
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";

// Enable syslog logging
Unattended-Upgrade::SyslogEnable "true";

// Syslog facility
Unattended-Upgrade::SyslogFacility "daemon";
```

## Conclusion

Automatic security updates are a critical component of any robust security strategy. By implementing unattended-upgrades and Canonical Livepatch, you can ensure your Ubuntu systems receive timely security patches while minimizing downtime and administrative overhead.

Key takeaways from this guide:

1. **unattended-upgrades** provides automated package updates with fine-grained control over which packages are updated
2. **Canonical Livepatch** eliminates the need for reboots after kernel security updates
3. **Email notifications** keep you informed about update activity and potential issues
4. **Package blacklisting** allows you to exclude sensitive applications from automatic updates
5. **Monitoring and logging** are essential for security compliance and troubleshooting

Remember to:

- Test your configuration in a non-production environment first
- Monitor logs regularly for any update failures
- Keep your blacklist up to date as your infrastructure changes
- Review and update your reboot schedule based on your maintenance windows

With these tools properly configured, your Ubuntu systems will automatically stay protected against the latest security vulnerabilities, giving you peace of mind and more time to focus on other important tasks.

## Additional Resources

- [Ubuntu Automatic Updates Documentation](https://help.ubuntu.com/community/AutomaticSecurityUpdates)
- [Canonical Livepatch Service](https://ubuntu.com/security/livepatch)
- [Ubuntu Pro Documentation](https://ubuntu.com/pro/docs)
- [unattended-upgrades GitHub Repository](https://github.com/mvo5/unattended-upgrades)
