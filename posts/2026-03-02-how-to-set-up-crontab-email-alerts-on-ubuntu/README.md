# How to Set Up Crontab Email Alerts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Email, Automation

Description: Learn how to configure crontab email alerts on Ubuntu so you receive notifications when scheduled jobs produce output or encounter errors.

---

Cron is one of the most reliable job schedulers on Linux, but by default it runs jobs silently. If a nightly backup fails or a maintenance script throws an error, you will not know unless you check log files manually - and most people do not check log files manually until something breaks visibly. The good news is that cron has built-in email notification support. When configured correctly, it emails you the output of any job that produces output, which effectively means you hear about failures without writing any custom monitoring code.

## How Cron Email Notifications Work

Cron sends email when a job produces any output on stdout or stderr. If a job runs and produces no output at all, no email is sent. This behavior has an important practical implication: if you want to get emails only on errors, suppress stdout but let stderr through. If you want to get emails on every run, let the job produce some output.

The email is sent using the system mail command, which relies on a local MTA (Mail Transfer Agent) being configured.

## Installing a Mail Transfer Agent

For most Ubuntu servers, Postfix is the right choice. You can configure it to relay mail through an external SMTP server (Gmail, SendGrid, your company's mail server):

```bash
sudo apt update
sudo apt install postfix mailutils -y
```

During installation, choose "Internet Site" if your server has a resolvable hostname and can send mail directly, or "Satellite System" if you want to relay through another server (the more common case for cloud servers).

For most cloud servers where port 25 is blocked by the provider, relay through an external SMTP service is the practical approach.

## Configuring Postfix to Relay Through Gmail

If you have a Gmail account or Google Workspace account, you can use it as a relay:

```bash
# Install SASL authentication libraries
sudo apt install libsasl2-modules -y

# Edit the Postfix main configuration
sudo nano /etc/postfix/main.cf
```

Add or update these settings at the end of `main.cf`:

```ini
# Relay host configuration
relayhost = [smtp.gmail.com]:587

# SASL authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
```

Create the SASL password file:

```bash
sudo nano /etc/postfix/sasl_passwd
```

```
[smtp.gmail.com]:587 your-email@gmail.com:your-app-password
```

Note: For Gmail, you must use an App Password, not your regular account password. Generate one at myaccount.google.com > Security > 2-Step Verification > App passwords.

Secure and hash the password file:

```bash
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl restart postfix
```

Test that mail delivery works:

```bash
echo "Test from $(hostname)" | mail -s "Postfix test" your-email@gmail.com
```

## Setting the MAILTO Variable in Crontab

Once your MTA is working, configure cron to send emails by setting the `MAILTO` variable in your crontab:

```bash
crontab -e
```

```bash
# Set the email address for all cron output in this crontab
MAILTO="your-email@example.com"

# Example: daily disk usage report at 6am
0 6 * * * df -h

# Example: weekly backup verification at midnight Sunday
0 0 * * 0 /usr/local/bin/verify-backup.sh
```

The `MAILTO` variable applies to all jobs below it in the crontab until overridden. You can have different email addresses for different jobs:

```bash
MAILTO="admin@example.com"
# These jobs notify admin
0 6 * * * df -h
0 7 * * * free -h

MAILTO="dbops@example.com"
# These jobs notify the database team
0 2 * * * /usr/local/bin/backup-mysql.sh
```

Setting `MAILTO=""` (empty string) disables email for those jobs:

```bash
MAILTO=""
# These jobs run silently
*/5 * * * * /usr/local/bin/heartbeat-check.sh
```

## Sending Emails Only on Errors

The default behavior sends email whenever a job produces any output. For jobs that normally succeed with informational output, this creates noise. To receive email only on errors, redirect stdout to /dev/null and let stderr through:

```bash
# Email only if the command produces errors (stderr)
0 3 * * * /usr/local/bin/backup.sh > /dev/null

# Both stdout and stderr go to a log, but also send stderr via email
# This requires a wrapper approach
0 4 * * * /usr/local/bin/check-services.sh >> /var/log/check-services.log 2>&1
```

A more robust approach uses a wrapper script that captures the exit code and only produces output on failure:

```bash
sudo nano /usr/local/bin/cron-alert-on-failure
```

```bash
#!/bin/bash
# Wrapper: run a command and only output something on failure
# Usage: cron-alert-on-failure <command> [args...]

# Run the command, capture all output and exit code
OUTPUT=$("$@" 2>&1)
EXIT_CODE=$?

# If the command failed, print output so cron emails it
if [ $EXIT_CODE -ne 0 ]; then
    echo "CRON JOB FAILED: $*"
    echo "Exit code: $EXIT_CODE"
    echo "Output:"
    echo "$OUTPUT"
fi

exit $EXIT_CODE
```

```bash
sudo chmod +x /usr/local/bin/cron-alert-on-failure
```

Use it in your crontab:

```bash
MAILTO="alerts@example.com"

# Only get emailed if this backup fails
0 3 * * * /usr/local/bin/cron-alert-on-failure /usr/local/bin/backup-databases.sh

# Only get emailed if this sync fails
30 4 * * * /usr/local/bin/cron-alert-on-failure rsync -az /var/www/ backup-server:/backups/www/
```

## Sending Emails for System-Wide Cron Jobs

The `/etc/crontab` and `/etc/cron.d/` files also support `MAILTO`:

```bash
sudo nano /etc/cron.d/my-system-jobs
```

```
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO="sysadmin@example.com"

# Daily log cleanup
0 1 * * * root find /var/log -name "*.gz" -mtime +30 -delete

# Weekly package audit
0 9 * * 1 root apt list --upgradable 2>/dev/null
```

## Customizing Email Subject Lines

By default, cron emails have subjects like `Cron <user@hostname> command`. To get more descriptive subjects, wrap your commands to produce structured output:

```bash
#!/bin/bash
# /usr/local/bin/backup-with-report.sh

START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Run the actual backup
if rsync -az --delete /var/www/ backup:/www/; then
    STATUS="SUCCESS"
else
    STATUS="FAILED"
fi

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# This output becomes the email body; cron generates the subject from context
echo "Backup Report"
echo "============="
echo "Status:     $STATUS"
echo "Start time: $START_TIME"
echo "End time:   $END_TIME"
echo "Host:       $(hostname)"
```

For fully custom subjects and formatted emails, use the `mail` command within a cron job directly:

```bash
MAILTO=""
# This job sends its own email with a custom subject
0 3 * * * /usr/local/bin/backup.sh | mail -s "[$(hostname)] Nightly Backup - $(date '+%Y-%m-%d')" admin@example.com
```

## Checking if Emails Are Being Sent

If you suspect cron is not sending emails, check the mail log:

```bash
# Check Postfix logs for delivery attempts
sudo tail -50 /var/log/mail.log

# Check if there are emails queued but not delivered
sudo mailq

# Check the local mailbox for the user running cron
sudo mail -u root
```

If mail is queuing but not delivering, the issue is typically SMTP authentication or firewall blocking outbound SMTP. Verify with:

```bash
# Test SMTP connection directly
telnet smtp.gmail.com 587
```

## Alternative: Using ssmtp or msmtp for Simple Relay

If you do not want a full Postfix installation, `msmtp` is a lightweight alternative that handles relay without a local daemon:

```bash
sudo apt install msmtp msmtp-mta -y

# Configure msmtp
sudo nano /etc/msmtprc
```

```ini
# Default settings
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

# Gmail account
account gmail
host smtp.gmail.com
port 587
from your-email@gmail.com
user your-email@gmail.com
password your-app-password

# Set default account
account default : gmail
```

```bash
sudo chmod 600 /etc/msmtprc
```

msmtp acts as a drop-in sendmail replacement, so cron uses it automatically without any additional configuration.

## Summary

Configuring cron email alerts on Ubuntu is a two-step process: set up a working MTA (Postfix or msmtp) and set the `MAILTO` variable in your crontab. Once done, you get automatic notification whenever a job produces output or fails, without any external monitoring service required. For production systems, supplement cron alerts with a dedicated monitoring platform like [OneUptime](https://oneuptime.com) that provides dashboards, escalation policies, and on-call rotation for critical job failures.
