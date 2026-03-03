# How to Set Up Log Monitoring with Logwatch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Logwatch, Monitoring, System Administration

Description: Install and configure Logwatch on Ubuntu to automatically generate daily log summaries and email reports covering security events, service activity, and system health.

---

Logwatch is a log analysis tool that processes your system logs and generates readable summary reports. Rather than reading raw log files, Logwatch distills the key information - failed logins, service errors, disk activity, network events - into a consolidated report delivered by email or viewed on-demand. It's been around for decades and remains one of the most practical tools for staying informed about what's happening on your servers.

## Installing Logwatch

```bash
# Install logwatch and its dependencies
sudo apt update
sudo apt install logwatch

# Also install postfix or another MTA if you want email delivery
# (for a simple local setup, postfix with "Local only" config works)
sudo apt install postfix

# Verify installation
logwatch --version
ls /etc/logwatch/
```

## Understanding the Directory Structure

Logwatch's configuration spans several directories:

```bash
# Main configuration directory
ls /etc/logwatch/

# conf/   - custom configuration files (override defaults)
# scripts/ - custom filter scripts (rarely needed)

# System defaults (don't edit these directly)
ls /usr/share/logwatch/

# default.conf  - default configuration
# dist.conf/    - distribution-specific config
# scripts/      - built-in service filter scripts
# lib/          - Perl libraries

# View installed service filters
ls /usr/share/logwatch/scripts/services/
```

## Basic Configuration

The primary configuration file to edit is `/etc/logwatch/conf/logwatch.conf`:

```bash
sudo nano /etc/logwatch/conf/logwatch.conf
```

```bash
# /etc/logwatch/conf/logwatch.conf
# This file overrides /usr/share/logwatch/default.conf

# Where to send the report
MailTo = admin@example.com

# What address to send from
MailFrom = logwatch@yourhostname.example.com

# Print to stdout instead of email (useful for testing)
# Print = Yes

# Range of logs to process
# today, yesterday, or a number of days (7 = last 7 days)
Range = yesterday

# Detail level: Low, Med, High, or a number 0-10
Detail = Med

# Which services to include (use All for everything)
Service = All

# Format of the output
# text or html
Format = text

# Logfile path for logwatch's own log
# LogFile = /var/log/logwatch

# Mailer command
# mailer = "/usr/sbin/sendmail -t"
```

## Testing Logwatch

Run logwatch manually to verify it works before scheduling:

```bash
# Run and print to screen (don't email)
sudo logwatch --print

# Run for yesterday's logs
sudo logwatch --print --range yesterday

# Run with high detail
sudo logwatch --print --detail High

# Run for a specific service only
sudo logwatch --print --service sshd

# Run for specific range of days
sudo logwatch --print --range "between -7 days and today"

# Output as HTML
sudo logwatch --print --format html > /tmp/logwatch-report.html
```

## Understanding the Report

A typical Logwatch report includes sections like:

```text
 ################### Logwatch 7.6 (01/22/21) ####################
        Processing Initiated: Mon Mar  2 08:00:01 2026
        Date Range Processed: yesterday
                              ( 2026-Mar-01 )
                              Period is day.
        Detail Level of Output: 5
        Type of Output/Format: stdout / text
        Logfiles for Host: myserver.example.com
 ##################################################################

 --------------------- Postfix Begin ------------------------

    3.055K  Bytes accepted                             3,127
    3.055K  Bytes delivered                            3,127
   ========   ==================================================

    1   Accepted                                    100.00%
   -------   --------------------------------------------------
    1   Total                                       100.00%
   ========   ==================================================

    1   Delivered                                   100.00%
   -------   --------------------------------------------------

 ---------------------- Postfix End -------------------------


 --------------------- SSHD Begin --------------------------

 **Unmatched Entries**
 Disconnected from invalid user admin 192.168.1.50 port 45231

 Failed logins from:
    192.168.1.50 (unknown): 45 times

 ---------------------- SSHD End ---------------------------
```

## Configuring Email Delivery

Logwatch's main value is the daily email report. Configure postfix for sending:

```bash
# Simple postfix configuration for sending only
sudo dpkg-reconfigure postfix
# Choose: "Internet Site" for full sending, or "Satellite system"
# for relaying through another mail server

# Test email delivery
echo "Test email" | mail -s "Test" admin@example.com

# If using a relay/SMTP server, configure it
sudo nano /etc/postfix/main.cf
```

```bash
# In /etc/postfix/main.cf for relay through external SMTP:
relayhost = [smtp.example.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

## Scheduling Daily Reports

Logwatch installs a cron job automatically. Verify it:

```bash
# Check if logwatch cron job is installed
cat /etc/cron.daily/00logwatch

# This script runs logwatch daily, typically around midnight
# The exact time depends on when cron.daily runs (usually 6:25 AM)

# To run at a specific time, create a dedicated cron entry
sudo crontab -e
```

```bash
# Run logwatch at 7 AM daily and email the report
0 7 * * * /usr/sbin/logwatch --output mail --format text --detail Med
```

## Customizing Which Services to Include

Configure which log sources logwatch analyzes:

```bash
# Include specific services only
sudo nano /etc/logwatch/conf/logwatch.conf
```

```bash
# Include only these services
Service = sshd
Service = sudo
Service = cron
Service = kernel
Service = nginx
Service = postfix
Service = pam

# Or exclude specific services from "All"
Service = All
Service = "-zz-network"   # Exclude network service (prepend with -)
Service = "-zz-sys"
```

## Creating Custom Service Filters

Logwatch has built-in filters for common services. For custom applications:

```bash
# Create a custom logwatch filter for a custom application
sudo mkdir -p /etc/logwatch/scripts/services
sudo nano /etc/logwatch/scripts/services/myapp
```

```perl
#!/usr/bin/perl
##########################################################
# Logwatch filter for myapp
##########################################################

my %errors;
my %warnings;
my $start_count = 0;
my $stop_count = 0;

while (defined($_ = <STDIN>)) {
    chomp;

    # Count application starts
    if (/Application started/) {
        $start_count++;
        next;
    }

    # Count clean stops
    if (/Application stopped/) {
        $stop_count++;
        next;
    }

    # Capture errors
    if (/ERROR: (.+)/) {
        $errors{$1}++;
        next;
    }

    # Capture warnings
    if (/WARNING: (.+)/) {
        $warnings{$1}++;
        next;
    }
}

# Generate report
if ($start_count > 0) {
    print "Application starts: $start_count\n";
}
if ($stop_count > 0) {
    print "Application stops: $stop_count\n";
}

if (%errors) {
    print "\nErrors:\n";
    foreach my $err (sort { $errors{$b} <=> $errors{$a} } keys %errors) {
        printf "   %4d  %s\n", $errors{$err}, $err;
    }
}

if (%warnings) {
    print "\nWarnings:\n";
    foreach my $warn (sort { $warnings{$b} <=> $warnings{$a} } keys %warnings) {
        printf "   %4d  %s\n", $warnings{$warn}, $warn;
    }
}
```

Create the log file configuration:

```bash
sudo nano /etc/logwatch/conf/services/myapp.conf
```

```bash
# Logwatch service configuration for myapp
Title = "MyApp"
LogFile = myapp
```

```bash
sudo nano /etc/logwatch/conf/logfiles/myapp.conf
```

```bash
# Log file for myapp service
LogFile = /var/log/myapp/application.log
LogFile = /var/log/myapp/application.log.*
Archive = /var/log/myapp/application.log.*.gz
```

## Adjusting Detail Levels

The detail level controls verbosity. Different sections respond differently:

```bash
# Low detail (just summary statistics)
sudo logwatch --print --detail Low

# Medium detail (default - summary + notable events)
sudo logwatch --print --detail Med

# High detail (verbose - all events)
sudo logwatch --print --detail High

# Numeric levels: 0 (low) to 10 (maximum)
sudo logwatch --print --detail 7
```

## Configuring Report Archives

Save reports locally in addition to emailing them:

```bash
# Save reports to a directory
sudo mkdir -p /var/log/logwatch-reports
sudo chown root:adm /var/log/logwatch-reports

# Add to crontab to save reports
sudo crontab -e
```

```bash
# Daily logwatch - email and save to file
0 7 * * * /usr/sbin/logwatch --output mail --detail Med && \
          /usr/sbin/logwatch --output file --filename /var/log/logwatch-reports/$(date +%Y-%m-%d).txt --detail Med
```

```bash
# Rotate logwatch report archives
sudo nano /etc/logrotate.d/logwatch-reports
```

```bash
/var/log/logwatch-reports/*.txt {
    weekly
    rotate 12
    compress
    missingok
    notifempty
}
```

## Customizing the Report Format

Create custom templates for the report header/footer:

```bash
# Override the logwatch message header
sudo mkdir -p /etc/logwatch/conf
sudo nano /etc/logwatch/conf/override.conf
```

```bash
# Custom subject line
MailSubject = "[$(hostname)] Logwatch Report for $date$"

# Include hostname in from address
MailFrom = "logwatch@$(hostname -f)"
```

## Verifying Logwatch is Working

```bash
# Check cron.daily ran logwatch (in the last 24h)
ls -la /var/log/syslog | head -3
grep logwatch /var/log/syslog | tail -5

# Check cron ran the job
grep CRON /var/log/syslog | grep logwatch | tail -5

# Force an immediate test run
sudo logwatch --print --range today | head -100

# Check mail queue (if emails aren't arriving)
mailq
sudo postfix status
```

## Common Logwatch Issues

**Logwatch not sending email:**
```bash
# Test mail system directly
echo "Test" | mail -s "Test Subject" your@email.com

# Check mail logs
tail -50 /var/log/mail.log

# Check postfix queue
mailq
```

**Missing service sections:**
```bash
# Check if the log file exists
ls /var/log/nginx/

# Check if logwatch has a filter for it
ls /usr/share/logwatch/scripts/services/ | grep nginx

# Install additional logwatch filters if available
sudo apt search logwatch
```

Logwatch transforms the tedious task of reviewing logs into a manageable daily email. Even on servers with centralized logging, having a per-server summary that highlights anomalies is valuable for catching issues that might get lost in a large aggregated log stream.
