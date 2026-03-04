# How to Set Up Logwatch for Daily Log Summaries on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Logwatch, Logging, Monitoring, Linux

Description: Learn how to install and configure Logwatch on RHEL to generate daily summaries of system logs and receive them by email or save them to files.

---

Reading through raw log files every day is tedious and easy to skip. Logwatch solves this by parsing your logs and producing a clean, human-readable summary of what happened on your system. It covers everything from SSH login attempts to disk usage warnings, and it can email you the report automatically each morning.

## What Logwatch Reports

Logwatch processes logs from various services and generates categorized summaries:

```mermaid
graph TD
    A[Logwatch] --> B[/var/log/secure]
    A --> C[/var/log/messages]
    A --> D[/var/log/maillog]
    A --> E[/var/log/httpd/]
    A --> F[journald]
    A --> G[Other Log Sources]
    B --> H[Daily Summary Report]
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I[Email]
    H --> J[File]
    H --> K[stdout]
```

## Step 1: Install Logwatch

Logwatch is available in the EPEL repository:

```bash
# Enable EPEL repository if not already enabled
sudo dnf install epel-release -y

# Install Logwatch and its dependencies
sudo dnf install logwatch -y
```

## Step 2: Run Logwatch Manually

Before configuring automated reports, test it manually:

```bash
# Generate a report for today and display it on screen
sudo logwatch --output stdout --range today

# Generate a detailed report
sudo logwatch --output stdout --detail high --range today

# Generate a report for yesterday
sudo logwatch --output stdout --range yesterday

# Report for the last 7 days
sudo logwatch --output stdout --range "between -7 days and today"
```

## Step 3: Configure Logwatch

The main configuration file is at `/etc/logwatch/conf/logwatch.conf`. If it does not exist, create it to override defaults:

```bash
# Create the local configuration directory
sudo mkdir -p /etc/logwatch/conf

# Create or edit the configuration file
sudo vi /etc/logwatch/conf/logwatch.conf
```

Add the following settings:

```ini
# Output type: stdout, mail, or file
Output = mail

# Who receives the email report
MailTo = admin@example.com

# Who the email appears to be from
MailFrom = logwatch@example.com

# Detail level: Low (0), Med (5), High (10)
Detail = Med

# Time range for the report
Range = yesterday

# Mail transfer agent to use
mailer = "/usr/sbin/sendmail -t"

# Services to report on (All for everything)
Service = All

# Log directory
LogDir = /var/log

# Temporary directory for processing
TmpDir = /var/cache/logwatch
```

## Step 4: Set Up Email Delivery

For Logwatch to send emails, you need a working mail setup. The simplest option is to configure Postfix as a relay:

```bash
# Install Postfix (usually already installed)
sudo dnf install postfix -y

# Start and enable Postfix
sudo systemctl enable --now postfix
```

If you use an external SMTP relay:

```bash
# Edit Postfix configuration
sudo vi /etc/postfix/main.cf
```

Add or modify:

```ini
# Set the relay host (your mail server)
relayhost = [smtp.example.com]:587

# Enable SASL authentication if required
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

```bash
# Create the SASL password file if using authentication
echo "[smtp.example.com]:587 user@example.com:password" | sudo tee /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd*

# Restart Postfix
sudo systemctl restart postfix
```

## Step 5: Save Reports to a File Instead

If you prefer file-based reports instead of email:

```bash
# Edit the configuration
sudo vi /etc/logwatch/conf/logwatch.conf
```

```ini
# Output to file instead of email
Output = file

# Specify the output file path
Filename = /var/log/logwatch/daily-report.log
```

Create the output directory:

```bash
sudo mkdir -p /var/log/logwatch
```

## Step 6: Configure the Daily Cron Job

Logwatch installs a daily cron job automatically. Verify it exists:

```bash
# Check for the logwatch cron job
ls -la /etc/cron.daily/0logwatch

# View the cron script
cat /etc/cron.daily/0logwatch
```

If you want to customize the schedule (for example, run it at 7 AM instead of whenever cron.daily runs):

```bash
# Disable the default daily cron job
sudo chmod -x /etc/cron.daily/0logwatch

# Create a custom cron entry
sudo vi /etc/cron.d/logwatch
```

```bash
# Run Logwatch every day at 7:00 AM
0 7 * * * root /usr/sbin/logwatch --output mail --mailto admin@example.com --detail high
```

## Step 7: Customize Service Reports

You can control which services Logwatch reports on:

```bash
# Report only on specific services
sudo logwatch --output stdout --service sshd --service sudo --service pam_unix

# Exclude specific services
sudo logwatch --output stdout --service All --service "-zz-network"
```

To permanently exclude services, create override files:

```bash
# Create a directory for local service overrides
sudo mkdir -p /etc/logwatch/conf/services

# Disable a service report entirely
echo "Title = " | sudo tee /etc/logwatch/conf/services/sendmail.conf
```

## Step 8: Create Custom Log Groups

You can define custom log groups for application-specific reporting:

```bash
# Create a custom log group for your application
sudo mkdir -p /etc/logwatch/conf/logfiles
sudo vi /etc/logwatch/conf/logfiles/myapp.conf
```

```ini
# Define log files for the custom group
LogFile = /var/log/myapp/*.log

# Archive location for rotated logs
Archive = /var/log/myapp/*.log.*.gz

# Apply a date filter
*ApplystdDate
```

## Example Report Output

A typical Logwatch report looks like this:

```bash
################### Logwatch 7.7 (03/07/22) ####################
        Processing Initiated: Wed Mar 4 07:00:01 2026
        Date Range Processed: yesterday
                              (2026-Mar-03)
        Detail Level of Output: Med
        Type of Output/Format: mail / text
        Logfiles for Host: server1.example.com
 ##################################################################

 --------------------- SSHD Begin ------------------------
  Users logging in through sshd:
     admin:
        192.168.1.10: 5 times
     deploy:
        10.0.0.50: 2 times

  Failed logins from:
     192.168.1.200 (unknown.example.com): 23 times
 ---------------------- SSHD End -------------------------

 --------------------- Sudo Begin ------------------------
  admin => root
     /bin/systemctl restart nginx  : 3 times
 ---------------------- Sudo End -------------------------

 --------------------- Disk Space Begin ------------------
  Filesystem      Size  Used Avail Use% Mounted on
  /dev/sda1        50G   32G   18G  64% /
 ---------------------- Disk Space End -------------------
```

## Troubleshooting

```bash
# Test email delivery
echo "Test email from Logwatch" | mail -s "Logwatch Test" admin@example.com

# Run Logwatch in debug mode
sudo logwatch --output stdout --detail high --debug high --range today 2>&1 | head -100

# Check if cron is running
sudo systemctl status crond

# View cron logs for any errors
sudo journalctl -u crond --no-pager -n 20
```

## Summary

Logwatch on RHEL provides automated daily log summaries that save you from manually reviewing raw logs. Install it from EPEL, configure the detail level and output method (email or file), and let the daily cron job handle the rest. Customize which services are reported and at what detail level to get exactly the information you need each morning.
