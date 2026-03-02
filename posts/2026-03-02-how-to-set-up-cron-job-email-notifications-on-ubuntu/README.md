# How to Set Up Cron Job Email Notifications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cron, Email, Automation

Description: Learn how to configure cron job email notifications on Ubuntu using MAILTO, postfix, and alternative methods for sending alerts when scheduled jobs produce output or fail.

---

By default, cron emails the output of your jobs to the local system user. This behavior is useful but requires configuration to actually deliver those emails somewhere you will see them. This post covers how to set up cron email notifications, from local mail delivery to sending through external SMTP servers.

## How Cron Handles Output

Cron captures anything a job writes to stdout or stderr. If there is any output, cron tries to send it to the local user via the system's mail transfer agent (MTA). The `MAILTO` variable in the crontab controls who receives these notifications.

By default:
- On a personal crontab, mail goes to the user who owns the crontab
- On `/etc/crontab`, the `MAILTO` variable or the user specified in the job line gets the mail
- If there is no output, no email is sent

## Checking if a Mail System is Configured

```bash
# Check if an MTA is installed
which sendmail
which postfix
which ssmtp
which msmtp

# Try sending a test message
echo "Test" | mail -s "Test Subject" user@example.com

# Check local mail
sudo apt install mailutils
mail  # Opens the mail client to read local mail
```

If `mail` shows messages, the local mail system works. The question is whether you can relay messages to an actual inbox.

## Using MAILTO to Configure Recipients

The `MAILTO` variable at the top of a crontab controls where output goes:

```bash
crontab -e
```

```
# Send all cron output to this email address
MAILTO="admin@example.com"

# Send to multiple addresses
MAILTO="admin@example.com,ops@example.com"

# Suppress all email output (no notifications)
MAILTO=""

# Your job lines follow:
0 2 * * * /usr/local/bin/backup.sh
*/5 * * * * /usr/local/bin/monitor.sh
```

With `MAILTO=""`, cron sends no email regardless of output. Use this when you redirect output yourself.

You can also set `MAILTO` per-job by surrounding jobs with different settings:

```bash
# Daily backup emails go to admin
MAILTO="admin@example.com"
0 2 * * * /usr/local/bin/backup.sh

# Monitoring alerts go to the ops team
MAILTO="ops@example.com"
*/5 * * * * /usr/local/bin/monitor.sh

# This job produces output we do not care about
MAILTO=""
0 * * * * /usr/local/bin/noisy-cleanup.sh
```

## Setting Up Postfix for External Mail Delivery

For production systems, you typically want to relay mail through an external SMTP server. Postfix is the most common MTA on Ubuntu.

### Install and Configure Postfix as a Relay

```bash
# Install Postfix (choose "Internet Site" or "Satellite system" during setup)
sudo apt update
sudo apt install postfix mailutils

# For satellite/relay configuration, edit the main config
sudo tee /etc/postfix/main.cf << 'EOF'
# Postfix configuration for mail relay
myhostname = your-server.example.com
myorigin = /etc/mailname
relayhost = [smtp.gmail.com]:587

# SASL authentication for the relay
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
EOF
```

### Configuring Gmail as a Relay (App Password)

```bash
# Create the SASL password file
sudo tee /etc/postfix/sasl_passwd << 'EOF'
[smtp.gmail.com]:587 your-gmail@gmail.com:your-app-password
EOF

# Secure the file and hash it for Postfix
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd

# Restart Postfix
sudo systemctl restart postfix

# Test
echo "Test from postfix" | mail -s "Cron Test" admin@example.com

# Check mail logs for delivery status
sudo tail -f /var/log/mail.log
```

You need an App Password from Google (not your regular Gmail password) if 2FA is enabled on the account.

## Using ssmtp for Simple SMTP Relay

For systems where you only need outbound email for cron and do not need a full MTA, `ssmtp` or `msmtp` is simpler:

```bash
# Install ssmtp
sudo apt install ssmtp

# Configure it
sudo tee /etc/ssmtp/ssmtp.conf << 'EOF'
# SMTP relay configuration
root=admin@example.com
mailhub=smtp.gmail.com:587
AuthUser=your-gmail@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
UseTLS=YES
hostname=your-server.example.com
EOF

sudo chmod 640 /etc/ssmtp/ssmtp.conf

# Test
echo "Test message" | ssmtp admin@example.com
```

## Using msmtp (Modern Alternative)

`msmtp` is a more modern and actively maintained alternative to ssmtp:

```bash
sudo apt install msmtp msmtp-mta

# Create a configuration file
sudo tee /etc/msmtprc << 'EOF'
# Default settings
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

# Gmail account
account        gmail
host           smtp.gmail.com
port           587
from           your-gmail@gmail.com
user           your-gmail@gmail.com
password       your-app-password

# Set default account
account default : gmail
EOF

sudo chmod 640 /etc/msmtprc

# Test
echo -e "Subject: Test\n\nTest body" | msmtp admin@example.com
```

## Sending Email Only on Failure

The default behavior sends email for any output, including success messages. For jobs that produce output normally, you may only want email on failure:

Create a wrapper that captures output and emails only on non-zero exit:

```bash
sudo tee /usr/local/bin/cron-mailer.sh << 'EOF'
#!/bin/bash
# Wrapper that emails output only when the command fails

COMMAND="$@"
TMPFILE=$(mktemp)

# Run the command and capture output
"$@" > "$TMPFILE" 2>&1
EXIT_CODE=$?

# Email on failure only
if [ $EXIT_CODE -ne 0 ]; then
    cat "$TMPFILE" | mail -s "CRON FAILURE: $1 (exit code: $EXIT_CODE)" \
        "${MAILTO:-root}"
fi

# Clean up
rm -f "$TMPFILE"
exit $EXIT_CODE
EOF

chmod +x /usr/local/bin/cron-mailer.sh
```

Use it in your crontab:

```bash
# Only sends email when backup.sh fails
MAILTO="admin@example.com"
0 2 * * * /usr/local/bin/cron-mailer.sh /usr/local/bin/backup.sh
```

## Sending Email on Success with Context

Sometimes you want a confirmation email showing what was done:

```bash
sudo tee /usr/local/bin/cron-notify.sh << 'EOF'
#!/bin/bash
# Run command and always send summary email

SUBJECT="${1:-Cron Job}"
shift
TMPFILE=$(mktemp)

echo "Job started at: $(date)" >> "$TMPFILE"
echo "Command: $@" >> "$TMPFILE"
echo "---" >> "$TMPFILE"

"$@" >> "$TMPFILE" 2>&1
EXIT_CODE=$?

echo "---" >> "$TMPFILE"
echo "Job finished at: $(date)" >> "$TMPFILE"
echo "Exit code: $EXIT_CODE" >> "$TMPFILE"

STATUS="SUCCESS"
[ $EXIT_CODE -ne 0 ] && STATUS="FAILURE"

cat "$TMPFILE" | mail -s "[$STATUS] $SUBJECT" "${MAILTO:-root}"
rm -f "$TMPFILE"
exit $EXIT_CODE
EOF

chmod +x /usr/local/bin/cron-notify.sh
```

Crontab usage:

```bash
MAILTO="admin@example.com"
0 2 * * * /usr/local/bin/cron-notify.sh "Daily Backup" /usr/local/bin/backup.sh
```

## Configuring Email for System Crontab

For jobs in `/etc/crontab` or `/etc/cron.d/`, set MAILTO at the top of the file:

```bash
sudo tee /etc/cron.d/myapp << 'EOF'
MAILTO="ops@example.com"
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Backup job runs as myapp user
0 2 * * * myapp /usr/local/bin/backup.sh

# Health check runs as root
*/5 * * * * root /usr/local/bin/health-check.sh
EOF
```

## Checking Mail Delivery

If you set up email but are not receiving messages:

```bash
# Check mail queue
sudo mailq

# Check Postfix mail log
sudo tail -100 /var/log/mail.log

# Check if mail is stuck in queue
sudo postqueue -p

# Flush the mail queue manually
sudo postqueue -f

# Check msmtp log
cat /var/log/msmtp.log
```

Common problems:
- App passwords not working - regenerate them from your Google account settings
- TLS issues - verify `tls_trust_file` points to a valid CA bundle
- Port 587 blocked by your cloud provider - try port 465 with SSL

## Using Dedicated Monitoring Instead of Email

For production systems, consider using a dedicated monitoring tool to handle cron job notifications rather than relying on email:

```bash
# Send a heartbeat to a monitoring service (like OneUptime)
0 2 * * * /usr/local/bin/backup.sh && \
    curl -sf "https://oneuptime.com/api/monitor/heartbeat/YOUR-KEY" > /dev/null
```

This approach lets the monitoring service alert you via multiple channels (email, Slack, PagerDuty) and can detect when the job does not run at all (missed heartbeat).

## Summary

Setting up cron email notifications on Ubuntu requires a working mail system. Postfix with external SMTP relay is the most reliable option for production servers. The `MAILTO` variable in the crontab controls the recipient. For jobs where you only want failure notifications, use a wrapper script that emails only on non-zero exit codes. Always test your mail configuration with a manual test message before relying on it for production alerts.
