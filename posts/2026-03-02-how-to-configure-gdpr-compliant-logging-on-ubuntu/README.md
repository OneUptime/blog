# How to Configure GDPR-Compliant Logging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GDPR, Compliance, Logging, Privacy

Description: Configure Ubuntu system and application logging to comply with GDPR requirements, including data minimization, retention limits, access controls, and log anonymization techniques.

---

GDPR (General Data Protection Regulation) affects how you collect, store, and process personal data - including data in log files. Server logs frequently contain personal data such as IP addresses, usernames, email addresses, and user agent strings. Under GDPR, this data must be handled lawfully, stored only as long as necessary, protected from unauthorized access, and subject to data subject rights.

This post covers practical steps to make your Ubuntu server logging infrastructure GDPR-compliant.

## What Counts as Personal Data in Logs

Before configuring anything, understand what personal data your logs capture:

- **IP addresses** - Considered personal data in most EU court decisions
- **Usernames and email addresses** - Directly identifiable
- **Session tokens and user IDs** - Can be linked back to individuals
- **User agent strings** - Can contribute to fingerprinting
- **Request paths with user data** - `/user/12345/profile` contains a user ID
- **Error messages** - May contain email addresses or names

The principle of data minimization means you should only log what you genuinely need.

## System Logging Configuration

### Limit journald Retention

```bash
# Configure systemd-journald retention
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# Maximum disk space for logs
SystemMaxUse=500M

# Maximum log age (30 days)
MaxRetentionSec=2592000

# Maximum single log file size
SystemMaxFileSize=50M

# Compress logs
Compress=yes
```

```bash
# Apply the configuration
sudo systemctl restart systemd-journald

# Verify current journal disk usage
journalctl --disk-usage

# Manually rotate to apply new limits immediately
sudo journalctl --rotate
sudo journalctl --vacuum-time=30d
```

### rsyslog Data Minimization

Configure rsyslog to filter or anonymize personal data before writing logs:

```bash
# Install rsyslog string processing module
sudo apt install rsyslog -y

# Create GDPR-focused rsyslog configuration
sudo tee /etc/rsyslog.d/50-gdpr.conf << 'EOF'
# Load required modules
module(load="imuxsock")
module(load="imklog")

# Define a template that excludes sensitive fields
# Use this template for auth logs
template(name="gdpr_auth" type="string"
  string="%TIMESTAMP% %HOSTNAME% %programname%: %msg%\n")

# Forward auth logs with IP anonymization (handled by separate script)
auth.*;authpriv.* /var/log/auth.log;gdpr_auth

# Standard logging for non-personal-data sources
*.info;mail.none;authpriv.none;cron.none /var/log/messages
EOF

sudo systemctl restart rsyslog
```

## Web Server Log Anonymization

### Nginx - IP Address Anonymization

Configure Nginx to log anonymized IP addresses:

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
http {
    # Map to anonymize IPv4 addresses (zero last octet)
    map $remote_addr $anonymized_ip {
        ~(?P<ip>\d+\.\d+\.\d+)\.    $ip.0;
        ~(?P<ip>[^:]+:[^:]+):        $ip::;
        default                       0.0.0.0;
    }

    # Map to anonymize IPv6 addresses (keep only first 32 bits)
    geo $remote_addr $anonymized_ipv6 {
        default 0000:0000::;
    }

    # GDPR-compliant log format
    # Uses anonymized IP, omits referer if it might contain personal data
    log_format gdpr_format '$anonymized_ip - $remote_user [$time_local] '
                           '"$request" $status $body_bytes_sent '
                           '"$http_user_agent"';

    # Apply to server blocks that handle personal data
    access_log /var/log/nginx/access.log gdpr_format;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Apache - Privacy-Aware Logging

```bash
sudo nano /etc/apache2/apache2.conf
```

```apache
# Define log format with anonymized IP (removes last octet)
LogFormat "%{GDPR_IP}e %l %u %t \"%r\" %>s %b \"%{User-Agent}i\"" gdpr_combined

# Add a SetEnvIf to create the anonymized IP variable
# (Requires mod_setenvif and mod_rewrite)

# Simpler approach: use a custom log format that drops the user IP
LogFormat "ANONYMIZED %l %u %t \"%r\" %>s %b" gdpr_minimal
CustomLog ${APACHE_LOG_DIR}/access_gdpr.log gdpr_minimal
```

## Application Log Sanitization

For application-level logs, sanitize personal data before writing:

```python
# Python example - log sanitizer middleware
import re
import logging

class GDPRLogFilter(logging.Filter):
    """Filter that anonymizes personal data in log messages."""

    # Patterns to detect and redact
    EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    # IPv4 anonymization (zero last octet)
    IPV4_PATTERN = re.compile(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b')

    def filter(self, record):
        # Anonymize email addresses in log messages
        record.msg = self.EMAIL_PATTERN.sub('[EMAIL REDACTED]', str(record.msg))
        # Anonymize IP addresses
        record.msg = self.IPV4_PATTERN.sub(r'\1.0', record.msg)
        return True

# Apply the filter
logger = logging.getLogger()
logger.addFilter(GDPRLogFilter())
```

```bash
# For application logs written to files, use a log scrubber script
cat > /usr/local/bin/scrub-logs.sh << 'SCRIPT'
#!/bin/bash
# Scrub personal data from log files

LOGFILE="$1"

if [ -z "$LOGFILE" ]; then
    echo "Usage: $0 <logfile>"
    exit 1
fi

# Replace email addresses
sed -i -E 's/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[REDACTED-EMAIL]/g' "$LOGFILE"

# Anonymize IPv4 last octet
sed -i -E 's/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\.[0-9]{1,3}/\1.0/g' "$LOGFILE"

echo "Log scrubbing complete: $LOGFILE"
SCRIPT
chmod +x /usr/local/bin/scrub-logs.sh
```

## Log Retention Policies

GDPR requires data be kept only as long as necessary. Document your retention periods and automate deletion:

```bash
# Create a log retention configuration
sudo tee /etc/logrotate.d/gdpr-retention << 'EOF'
# Web access logs - 90 days (3 months typical minimum for security analysis)
/var/log/nginx/access.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}

# Application logs - 30 days
/var/log/myapp/app.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}

# System auth logs - 90 days (legitimate security interest)
/var/log/auth.log {
    daily
    rotate 90
    compress
    missingok
    notifempty
}
EOF
```

## Access Controls for Logs

Logs containing personal data must be protected from unauthorized access:

```bash
# Restrict log file access to privileged users only
sudo chmod 640 /var/log/nginx/access.log
sudo chown root:adm /var/log/nginx/access.log

# Create a dedicated log readers group
sudo groupadd log-readers

# Add only authorized users to this group
sudo usermod -aG log-readers security_analyst

# Set directory permissions
sudo chmod 750 /var/log/nginx
sudo chown root:log-readers /var/log/nginx

# Audit who reads the logs (using auditd)
sudo auditctl -w /var/log/nginx/access.log -p r -k gdpr_log_access
```

## Handling Data Subject Requests

GDPR gives individuals the right to access and delete their data. For logs containing IP addresses or user IDs:

```bash
#!/bin/bash
# /usr/local/bin/gdpr-data-request.sh
# Find and optionally delete log entries for a specific IP

IP_ADDRESS="$1"
ACTION="${2:-find}"  # 'find' or 'delete'

if [ -z "$IP_ADDRESS" ]; then
    echo "Usage: $0 <ip_address> [find|delete]"
    exit 1
fi

LOG_FILES=$(find /var/log -name "*.log" -o -name "*.log.*.gz")

case "$ACTION" in
    find)
        echo "=== Log entries containing $IP_ADDRESS ==="
        for FILE in $LOG_FILES; do
            if [[ "$FILE" == *.gz ]]; then
                COUNT=$(zgrep -c "$IP_ADDRESS" "$FILE" 2>/dev/null)
            else
                COUNT=$(grep -c "$IP_ADDRESS" "$FILE" 2>/dev/null)
            fi
            [ "$COUNT" -gt 0 ] && echo "$FILE: $COUNT occurrences"
        done
        ;;
    delete)
        echo "Removing log entries for $IP_ADDRESS..."
        for FILE in /var/log/nginx/access.log; do
            if [ -f "$FILE" ]; then
                sed -i "/$IP_ADDRESS/d" "$FILE"
                echo "Processed: $FILE"
            fi
        done
        ;;
esac
```

## Documenting Your Logging Practices

GDPR's accountability principle requires documenting what you log and why. Create a Record of Processing Activities (RoPA) entry for your logging:

```bash
# Store compliance documentation
sudo mkdir -p /etc/gdpr
sudo tee /etc/gdpr/logging-policy.txt << 'EOF'
GDPR Logging Policy
Last Updated: 2026-03-02

Data Categories Logged: Anonymized IP addresses, request paths, timestamps
Legal Basis: Legitimate interest (security monitoring)
Retention Period: 90 days for web logs, 30 days for application logs
Access Controls: Log files restricted to log-readers group
Anonymization: IPv4 last octet zeroed, email addresses redacted
Third Parties: None - logs remain on-premises
Data Subject Rights: IP-based deletion requests: contact dpo@example.com
EOF
```

## Monitoring for Compliance Drift

Set up checks to ensure logging stays GDPR-compliant:

```bash
#!/bin/bash
# Check that log files aren't growing unexpectedly (potential retention failure)
MAX_DAYS=90
find /var/log/nginx -name "*.log*" -mtime +$MAX_DAYS -exec \
  echo "WARNING: Old log file found: {}" \;

# Check that permissions haven't changed
EXPECTED_MODE="640"
ACTUAL_MODE=$(stat -c %a /var/log/nginx/access.log)
if [ "$ACTUAL_MODE" != "$EXPECTED_MODE" ]; then
    echo "ALERT: Log file permissions changed: $ACTUAL_MODE (expected $EXPECTED_MODE)"
fi
```

GDPR compliance in logging is about balancing legitimate security needs against privacy rights. Minimal collection, short retention, strong access controls, and documented policies are the cornerstones of a defensible logging posture.
