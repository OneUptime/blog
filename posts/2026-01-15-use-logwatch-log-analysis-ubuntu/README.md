# How to Use Logwatch for Log Analysis on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Linux, Logging, Log Analysis, Logwatch, System Administration, DevOps, Monitoring

Description: A comprehensive guide to installing, configuring, and using Logwatch for automated log analysis and daily system reports on Ubuntu servers.

---

System logs are the first place you look when something goes wrong. But manually combing through `/var/log/syslog`, `/var/log/auth.log`, and dozens of other log files every day is not practical. Logwatch automates this grunt work by parsing logs from various services, summarizing the important events, and delivering a clean report to your inbox or terminal. This guide covers everything from basic installation to advanced customization on Ubuntu.

## What is Logwatch?

Logwatch is a Perl-based log analysis tool that reads system logs, filters them through service-specific parsers, and generates human-readable summaries. It was designed for Unix and Linux administrators who need a quick daily overview without wading through raw log files.

### Common Use Cases

- **Daily security audits** - spot failed SSH logins, sudo abuse, and unauthorized access attempts.
- **Service health checks** - see errors from Apache, Nginx, Postfix, MySQL, and other daemons.
- **Disk and resource monitoring** - catch warnings about full partitions or hardware issues.
- **Compliance reporting** - maintain a record of system activity for audits.
- **Incident investigation** - quickly review what happened on a specific date range.

Logwatch shines when you have multiple servers and need a consistent, automated way to surface anomalies. It is not a replacement for real-time monitoring, but it complements dashboards by providing a periodic summary.

## Prerequisites

Before installing Logwatch, ensure you have:

- An Ubuntu server (20.04, 22.04, or 24.04 LTS recommended).
- Root or sudo access.
- A working mail transfer agent (MTA) if you want email reports (Postfix or similar).
- Basic familiarity with the command line.

Verify your Ubuntu version with the following command:

```bash
# Display Ubuntu version information
# This confirms you are running a supported LTS release
lsb_release -a
```

## Installation

Logwatch is available in the default Ubuntu repositories. Install it along with any dependencies using apt.

```bash
# Update the package index to ensure you get the latest version
sudo apt update

# Install Logwatch and recommended dependencies
# libdate-manip-perl provides date parsing capabilities used by Logwatch
sudo apt install logwatch libdate-manip-perl -y
```

If you plan to receive email reports, install and configure an MTA. Postfix is a popular choice.

```bash
# Install Postfix for sending email reports
# During installation, select "Internet Site" or "Local only" depending on your needs
sudo apt install postfix -y
```

Verify the installation by checking the Logwatch version:

```bash
# Confirm Logwatch is installed and display version information
logwatch --version
```

## Basic Usage and Command Options

Run Logwatch from the command line to generate an immediate report. By default, it analyzes logs from yesterday and outputs to the terminal.

```bash
# Generate a basic Logwatch report for yesterday's logs
# Output is printed to stdout (terminal)
sudo logwatch
```

### Commonly Used Options

The following command demonstrates several useful options. The `--detail` flag controls verbosity, `--range` specifies the time period, and `--output` determines where the report goes.

```bash
# Generate a high-detail report for today's logs and save to a file
# --detail High: Include maximum information in the report
# --range Today: Analyze logs from today instead of yesterday
# --output file: Write output to a file instead of stdout
# --filename: Specify the output file path
sudo logwatch --detail High --range Today --output file --filename /tmp/logwatch-report.txt
```

Here is a quick reference of the most important options:

```bash
# View all available command line options
logwatch --help

# Key options explained:
# --detail <level>    : Low, Med, High, or 0-10 (controls verbosity)
# --range <period>    : Today, Yesterday, "Between 1/1/2026 and 1/15/2026"
# --service <name>    : Filter to specific service (e.g., sshd, postfix)
# --output <type>     : stdout, file, or mail
# --format <type>     : text or html
# --mailto <address>  : Email recipient for mail output
# --logdir <path>     : Override default log directory
# --archives          : Include rotated/archived logs in analysis
```

### Analyzing Specific Date Ranges

The `--range` option accepts flexible date specifications. This is useful for investigating incidents that occurred on specific dates.

```bash
# Analyze logs from the past 7 days
# Useful for weekly security reviews
sudo logwatch --detail Med --range "between -7 days and -1 days"

# Analyze logs from a specific date range
# Format: "Between MM/DD/YYYY and MM/DD/YYYY"
sudo logwatch --detail High --range "Between 1/1/2026 and 1/10/2026"

# Analyze only today's logs with high verbosity
sudo logwatch --detail 10 --range Today
```

## Configuration File (logwatch.conf)

Logwatch uses a hierarchical configuration system. The main configuration file is located at `/usr/share/logwatch/default.conf/logwatch.conf`, but you should create a local override at `/etc/logwatch/conf/logwatch.conf` to preserve your settings across package updates.

```bash
# Create the local configuration directory if it does not exist
sudo mkdir -p /etc/logwatch/conf

# Copy the default configuration to the local override location
# This file will persist across package updates
sudo cp /usr/share/logwatch/default.conf/logwatch.conf /etc/logwatch/conf/logwatch.conf
```

Edit the local configuration file to customize Logwatch behavior:

```bash
# Open the configuration file for editing
sudo nano /etc/logwatch/conf/logwatch.conf
```

Here is an example configuration with detailed comments explaining each option:

```ini
# /etc/logwatch/conf/logwatch.conf
# Local Logwatch configuration - overrides default settings

# Output destination: stdout (terminal), mail, or file
# Use "mail" for daily automated reports sent via email
Output = mail

# Email recipient for reports when Output = mail
# Use a distribution list for team visibility
MailTo = admin@example.com

# Email sender address (requires valid MTA configuration)
MailFrom = logwatch@yourserver.example.com

# Report detail level: Low, Med, High, or numeric 0-10
# Higher values include more information but create longer reports
Detail = Med

# Default services to include: All, or a comma-separated list
# Use "All" to analyze all available services
Service = All

# Date range to analyze: Today, Yesterday, or custom range
# Yesterday is typical for daily cron jobs that run after midnight
Range = Yesterday

# Output format: text or html
# HTML provides better formatting for email clients
Format = html

# Archive processing: Yes or No
# Set to Yes to include rotated logs (e.g., syslog.1, auth.log.1.gz)
Archives = No

# Log directory location (rarely needs changing)
LogDir = /var/log

# Temporary directory for processing
TmpDir = /var/cache/logwatch

# Hostlimit: filter to specific hostname in multi-host environments
# HostLimit = yourserver
```

## Detail Levels

The detail level controls how much information appears in reports. Logwatch supports three named levels and a numeric scale from 0 to 10.

| Level | Numeric | Description |
|-------|---------|-------------|
| Low   | 0-3     | Critical errors and security events only |
| Med   | 4-7     | Important events plus warnings |
| High  | 8-10    | Everything including informational messages |

Compare the output at different detail levels to find the right balance for your needs:

```bash
# Low detail: Only critical events, minimal noise
# Best for executives or when you just want to know if something is broken
sudo logwatch --detail Low --range Yesterday --output stdout

# Medium detail: Balanced view of important events
# Recommended for daily operational reviews
sudo logwatch --detail Med --range Yesterday --output stdout

# High detail: Complete information for deep investigation
# Use when troubleshooting specific issues
sudo logwatch --detail High --range Yesterday --output stdout

# Numeric detail level for fine-grained control
# Level 5 is roughly equivalent to Med
sudo logwatch --detail 5 --range Yesterday --output stdout
```

## Service Filters

Logwatch can report on specific services instead of everything. This is useful when you only care about particular daemons or want to investigate a specific service.

```bash
# List all services Logwatch knows about
# Each service has a corresponding filter script
ls /usr/share/logwatch/scripts/services/
```

Generate reports for specific services:

```bash
# Report only on SSH authentication events
# Useful for security audits focusing on remote access
sudo logwatch --service sshd --detail High --range Yesterday

# Report only on HTTP server activity (Apache or Nginx)
sudo logwatch --service http --detail Med --range Yesterday

# Report on multiple specific services
# Separate service names with --service flag or in config file
sudo logwatch --service sshd --service postfix --service pam_unix --detail High

# Exclude specific services from an "All" report
# Useful when a noisy service drowns out important events
sudo logwatch --service All --service "-zz-disk_space" --detail Med
```

Common service names on Ubuntu systems:

- `sshd` - SSH daemon authentication
- `pam_unix` - PAM authentication (sudo, login)
- `postfix` - Mail server
- `http` - Apache/Nginx web server
- `kernel` - Kernel messages
- `cron` - Scheduled tasks
- `dpkg` - Package management
- `iptables` - Firewall
- `fail2ban` - Intrusion prevention
- `systemd` - Systemd journal

## Custom Log File Definitions

Logwatch uses log file groups to map service parsers to actual log files. You can create custom definitions for applications that Logwatch does not recognize out of the box.

Log file group definitions live in `/usr/share/logwatch/default.conf/logfiles/`. Create custom definitions in `/etc/logwatch/conf/logfiles/` to add new log sources.

```bash
# Create a custom log file group for a Node.js application
# This tells Logwatch where to find the logs
sudo nano /etc/logwatch/conf/logfiles/myapp.conf
```

Example log file group configuration:

```ini
# /etc/logwatch/conf/logfiles/myapp.conf
# Define log file locations for a custom application

# Title displayed in reports
Title = "My Node.js Application"

# Primary log file location
# Supports wildcards for multiple files
LogFile = /var/log/myapp/*.log

# Include rotated/archived logs when --archives is enabled
# Pattern for gzipped rotated logs
Archive = /var/log/myapp/*.log.*.gz

# Alternative: archived logs with numeric suffix
Archive = /var/log/myapp/*.log.[0-9]

# Expand date codes in log file names
# Useful for logs named with dates like myapp-2026-01-15.log
# *ExpandRepeats
```

You can also define multiple log files in a single group:

```ini
# /etc/logwatch/conf/logfiles/webapp.conf
# Combine multiple log sources into one logical group

Title = "Web Application Stack"

# Include Nginx access logs
LogFile = /var/log/nginx/access.log

# Include Nginx error logs
LogFile = /var/log/nginx/error.log

# Include application-specific logs
LogFile = /var/log/webapp/application.log

# Include archived versions
Archive = /var/log/nginx/access.log.*.gz
Archive = /var/log/nginx/error.log.*.gz
Archive = /var/log/webapp/application.log.*.gz
```

## Email Report Configuration

Email reports are Logwatch's primary use case. Configure your MTA and Logwatch settings to receive automated daily summaries.

First, ensure Postfix (or your preferred MTA) is configured correctly:

```bash
# Test mail delivery with a simple message
# If this works, Logwatch email will work too
echo "Test email from $(hostname)" | mail -s "Logwatch Test" admin@example.com
```

Configure Logwatch for email delivery by editing the configuration file:

```ini
# /etc/logwatch/conf/logwatch.conf
# Email configuration settings

# Send output via email
Output = mail

# Primary recipient - can be a distribution list
MailTo = sysadmin@example.com

# Carbon copy additional recipients (comma-separated)
# MailTo = sysadmin@example.com, security@example.com

# Sender address - should be a valid address for reply-to
MailFrom = Logwatch@yourserver.example.com

# Use HTML format for better readability in email clients
Format = html

# Include hostname in email subject for multi-server environments
# Subject line will be: "Logwatch for <hostname>"
```

Test the email configuration manually:

```bash
# Send a test report via email
# This verifies both Logwatch and MTA configuration
sudo logwatch --output mail --mailto admin@example.com --detail Med --range Yesterday

# Send an HTML-formatted email report
sudo logwatch --output mail --mailto admin@example.com --format html --detail High
```

For multi-server environments, include the hostname in the subject line by editing the report header. Create a custom header file:

```bash
# Create a custom header template
sudo nano /etc/logwatch/conf/header.txt
```

## Scheduling Daily Reports with Cron

Automate Logwatch reports by adding a cron job. Ubuntu installs a default daily cron job at `/etc/cron.daily/00logwatch`, but you may want to customize it.

Check the default cron job:

```bash
# View the default Logwatch cron script
cat /etc/cron.daily/00logwatch
```

The default script typically looks like this:

```bash
#!/bin/bash
# /etc/cron.daily/00logwatch
# Daily Logwatch report script

# Check if logwatch is installed
test -x /usr/sbin/logwatch || exit 0

# Execute logwatch with default settings from config file
# The --output mail setting in logwatch.conf triggers email delivery
/usr/sbin/logwatch --output mail
```

Create a custom cron job for more control over timing:

```bash
# Edit the root user's crontab
sudo crontab -e
```

Add cron entries for different report schedules:

```bash
# Daily report at 6:00 AM - includes yesterday's logs
# Runs after log rotation (typically at midnight) to capture complete day
0 6 * * * /usr/sbin/logwatch --output mail --mailto admin@example.com --detail Med --range Yesterday

# Weekly summary every Monday at 7:00 AM - includes past 7 days
# Provides a broader view of system activity
0 7 * * 1 /usr/sbin/logwatch --output mail --mailto admin@example.com --detail High --range "between -7 days and -1 days"

# Hourly security check for SSH - high-detail, email on anomalies
# Useful for detecting brute force attacks quickly
0 * * * * /usr/sbin/logwatch --service sshd --output mail --mailto security@example.com --detail High --range "between -1 hours and now"

# Monthly report on the 1st at 8:00 AM
0 8 1 * * /usr/sbin/logwatch --output mail --mailto admin@example.com --detail High --range "between -30 days and -1 days"
```

Alternatively, create a custom script in `/etc/cron.daily/`:

```bash
# Create a custom daily script
sudo nano /etc/cron.daily/logwatch-custom
```

Example custom daily script with enhanced features:

```bash
#!/bin/bash
# /etc/cron.daily/logwatch-custom
# Custom Logwatch daily report with enhanced options

# Exit if Logwatch is not installed
if [ ! -x /usr/sbin/logwatch ]; then
    exit 0
fi

# Configuration
MAILTO="admin@example.com"
DETAIL="Med"
FORMAT="html"
RANGE="Yesterday"

# Generate hostname-specific subject
HOSTNAME=$(hostname -f)

# Run Logwatch with custom settings
# Archives included for complete log coverage after rotation
/usr/sbin/logwatch \
    --output mail \
    --mailto "$MAILTO" \
    --detail "$DETAIL" \
    --format "$FORMAT" \
    --range "$RANGE" \
    --archives

# Log execution for troubleshooting
logger "Logwatch daily report sent to $MAILTO"
```

Make the script executable:

```bash
# Set executable permission on the custom script
sudo chmod +x /etc/cron.daily/logwatch-custom
```

## Custom Service Scripts

For applications that Logwatch does not support natively, create custom service scripts. These are Perl scripts that parse log files and extract relevant information.

Service scripts live in `/usr/share/logwatch/scripts/services/`. Create custom scripts in `/etc/logwatch/scripts/services/`.

First, create the service configuration file:

```bash
# Create the services configuration directory
sudo mkdir -p /etc/logwatch/conf/services

# Create the service definition
sudo nano /etc/logwatch/conf/services/myapp.conf
```

Service configuration file:

```ini
# /etc/logwatch/conf/services/myapp.conf
# Service definition for custom application

# Title displayed in Logwatch reports
Title = "My Application"

# Log file group to analyze (defined in logfiles/myapp.conf)
LogFile = myapp

# Detail levels supported by this service filter
# Lower numbers = less detail, higher = more detail
*OnlyService = myapp
*OnlyContains = error,warning,critical
```

Now create the service script that parses the logs:

```bash
# Create the scripts directory
sudo mkdir -p /etc/logwatch/scripts/services

# Create the service parser script
sudo nano /etc/logwatch/scripts/services/myapp
```

Example custom service script in Perl:

```perl
#!/usr/bin/perl
# /etc/logwatch/scripts/services/myapp
# Custom Logwatch service script for parsing application logs

# This script reads log lines from STDIN and produces a summary report
# Logwatch passes relevant log lines after filtering by the logfile group

use strict;
use warnings;

# Initialize counters for different event types
my %errors;          # Hash to count error messages
my %warnings;        # Hash to count warning messages
my $total_lines = 0; # Total log lines processed
my $error_count = 0; # Total errors
my $warning_count = 0; # Total warnings

# Detail level from Logwatch (0-10)
my $detail = $ENV{'LOGWATCH_DETAIL_LEVEL'} || 5;

# Process each log line passed by Logwatch
while (defined(my $line = <STDIN>)) {
    chomp($line);
    $total_lines++;

    # Extract errors - adjust regex to match your log format
    # Example: [2026-01-15 10:30:00] ERROR: Database connection failed
    if ($line =~ /ERROR[:\s]+(.+)/i) {
        my $error_msg = $1;
        $errors{$error_msg}++;
        $error_count++;
    }

    # Extract warnings
    # Example: [2026-01-15 10:30:00] WARNING: High memory usage detected
    if ($line =~ /WARNING[:\s]+(.+)/i) {
        my $warning_msg = $1;
        $warnings{$warning_msg}++;
        $warning_count++;
    }
}

# Output summary report
# This is what appears in the Logwatch report

if ($total_lines > 0) {
    print "\n";
    print "  Total log lines processed: $total_lines\n";
    print "\n";

    # Report errors (always shown)
    if ($error_count > 0) {
        print "  ========== Errors ($error_count total) ==========\n";
        foreach my $msg (sort { $errors{$b} <=> $errors{$a} } keys %errors) {
            print "    $errors{$msg} time(s): $msg\n";
        }
        print "\n";
    }

    # Report warnings (shown at medium detail and above)
    if ($warning_count > 0 && $detail >= 5) {
        print "  ========== Warnings ($warning_count total) ==========\n";
        foreach my $msg (sort { $warnings{$b} <=> $warnings{$a} } keys %warnings) {
            print "    $warnings{$msg} time(s): $msg\n";
        }
        print "\n";
    }

    # Summary line
    if ($error_count == 0 && $warning_count == 0) {
        print "  No errors or warnings detected.\n";
    }
}

exit 0;
```

Make the script executable:

```bash
# Set executable permission on the service script
sudo chmod +x /etc/logwatch/scripts/services/myapp

# Test the custom service script
sudo logwatch --service myapp --detail High --range Today
```

## Output Formats (Text and HTML)

Logwatch supports text and HTML output formats. HTML provides better formatting for email clients, while text is ideal for terminal viewing and log files.

### Text Output

Text format is the default and works well for terminal viewing and archiving:

```bash
# Generate a text report to stdout
sudo logwatch --format text --detail Med --range Yesterday

# Save a text report to a file for archiving
sudo logwatch --format text --output file --filename /var/log/logwatch/report-$(date +%Y-%m-%d).txt

# Create a directory for archived reports
sudo mkdir -p /var/log/logwatch
```

### HTML Output

HTML format is better for email reports and web viewing:

```bash
# Generate an HTML report and save to file
sudo logwatch --format html --output file --filename /tmp/logwatch-report.html

# Send an HTML report via email
sudo logwatch --format html --output mail --mailto admin@example.com

# View the HTML report in a browser (on a desktop system)
# xdg-open /tmp/logwatch-report.html
```

Configure HTML as the default format in your configuration file:

```ini
# /etc/logwatch/conf/logwatch.conf
# Use HTML format for all reports
Format = html
```

Example cron job to archive HTML reports and serve via web:

```bash
#!/bin/bash
# /etc/cron.daily/logwatch-html-archive
# Generate and archive HTML Logwatch reports

# Configuration
REPORT_DIR="/var/www/html/logwatch"
DAYS_TO_KEEP=30

# Create report directory if it does not exist
mkdir -p "$REPORT_DIR"

# Generate today's report with yesterday's logs
REPORT_DATE=$(date -d "yesterday" +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/logwatch-$REPORT_DATE.html"

/usr/sbin/logwatch \
    --format html \
    --output file \
    --filename "$REPORT_FILE" \
    --detail High \
    --range Yesterday \
    --archives

# Create a symbolic link to the latest report
ln -sf "$REPORT_FILE" "$REPORT_DIR/latest.html"

# Generate an index page listing all reports
cat > "$REPORT_DIR/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Logwatch Reports</title></head>
<body>
<h1>Logwatch Reports</h1>
<ul>
HTMLEOF

# List reports in reverse chronological order
for report in $(ls -r "$REPORT_DIR"/logwatch-*.html 2>/dev/null); do
    filename=$(basename "$report")
    echo "<li><a href=\"$filename\">$filename</a></li>" >> "$REPORT_DIR/index.html"
done

cat >> "$REPORT_DIR/index.html" << 'HTMLEOF'
</ul>
</body>
</html>
HTMLEOF

# Clean up old reports
find "$REPORT_DIR" -name "logwatch-*.html" -mtime +$DAYS_TO_KEEP -delete

logger "Logwatch HTML report archived: $REPORT_FILE"
```

## Troubleshooting

### Common Issues and Solutions

**Logwatch produces no output or empty reports:**

```bash
# Check if log files exist and have content
ls -la /var/log/syslog /var/log/auth.log

# Verify Logwatch can read the log files
sudo logwatch --debug High --range Today 2>&1 | head -100

# Check if the date range has any logs
sudo logwatch --range "Between 1/10/2026 and 1/15/2026" --detail High
```

**Email reports are not being delivered:**

```bash
# Test basic mail delivery
echo "Test" | mail -s "Test" admin@example.com

# Check mail queue for stuck messages
mailq

# View mail logs for delivery errors
sudo tail -50 /var/log/mail.log

# Verify Postfix is running
sudo systemctl status postfix
```

**Custom service is not appearing in reports:**

```bash
# Verify the log file group configuration
cat /etc/logwatch/conf/logfiles/myapp.conf

# Check if the log file exists and has content
ls -la /var/log/myapp/

# Test the service script directly
cat /var/log/myapp/application.log | /etc/logwatch/scripts/services/myapp

# Run Logwatch with debug output
sudo logwatch --service myapp --debug High 2>&1 | less
```

**Permission errors when running Logwatch:**

```bash
# Logwatch needs root access to read system logs
# Always run with sudo for full access
sudo logwatch --detail High --range Yesterday

# Check file permissions on log files
ls -la /var/log/*.log

# Verify Logwatch script permissions
ls -la /usr/share/logwatch/scripts/services/
```

**Reports are too long or contain too much noise:**

```bash
# Reduce detail level
sudo logwatch --detail Low --range Yesterday

# Exclude noisy services
sudo logwatch --service All --service "-zz-disk_space" --service "-http"

# Create a custom configuration to permanently exclude services
echo "Service = -zz-disk_space" | sudo tee -a /etc/logwatch/conf/logwatch.conf
```

### Debug Mode

Use debug mode to troubleshoot configuration and parsing issues:

```bash
# Run with maximum debug output
# Debug levels: Low, Med, High
sudo logwatch --debug High --range Today 2>&1 | less

# Debug a specific service
sudo logwatch --debug High --service sshd --range Today 2>&1 | less

# Save debug output to a file for analysis
sudo logwatch --debug High --range Yesterday > /tmp/logwatch-debug.txt 2>&1
```

### Checking Configuration

Verify your configuration is being read correctly:

```bash
# Display effective configuration
sudo logwatch --debug Med 2>&1 | grep -i "config"

# List available log file groups
ls /usr/share/logwatch/default.conf/logfiles/
ls /etc/logwatch/conf/logfiles/ 2>/dev/null

# List available services
ls /usr/share/logwatch/scripts/services/
ls /etc/logwatch/scripts/services/ 2>/dev/null
```

---

## Scale Beyond Logwatch with OneUptime

Logwatch excels at summarizing logs from individual servers, but modern infrastructure often spans dozens or hundreds of nodes across multiple cloud providers, Kubernetes clusters, and edge locations. Manually configuring Logwatch on each server and aggregating reports becomes unwieldy at scale.

[OneUptime](https://oneuptime.com) complements Logwatch by providing centralized log aggregation, real-time search, and alerting across your entire infrastructure. Ship logs from all your servers to a single platform where you can:

- Search and filter logs in real-time across all services.
- Set up log monitors that alert your on-call team when error rates spike.
- Correlate logs with metrics and traces using OpenTelemetry.
- Create dashboards that visualize log patterns over time.
- Retain logs for compliance with configurable retention policies.

Use Logwatch for quick daily summaries on individual servers, and OneUptime for the unified observability layer that ties everything together. When an incident occurs, you will have both the high-level overview from Logwatch and the detailed drill-down capability from OneUptime to resolve issues faster.
