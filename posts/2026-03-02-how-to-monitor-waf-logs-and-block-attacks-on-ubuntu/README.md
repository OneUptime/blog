# How to Monitor WAF Logs and Block Attacks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, WAF, Apache, Monitoring

Description: Learn how to monitor ModSecurity WAF logs on Ubuntu, parse audit entries, identify attack patterns, and automate blocking of persistent attackers using fail2ban and custom scripts.

---

Deploying a WAF is only the first step. The real value comes from actively monitoring what it's seeing, tuning rules to reduce false positives, and automating responses to persistent attacks. This post covers the practical side of WAF log management on Ubuntu, focusing on ModSecurity with Apache.

## Understanding WAF Log Files

ModSecurity writes to two places: the Apache error log (for rule match summaries) and the audit log (for detailed request/response data).

```bash
# Apache error log - quick overview of WAF activity
sudo tail -f /var/log/apache2/error.log | grep ModSecurity

# ModSecurity audit log - full request details
sudo tail -f /var/log/apache2/modsec_audit.log

# Configure audit log location (in modsecurity.conf)
# SecAuditLog /var/log/apache2/modsec_audit.log

# Use concurrent logging for high-traffic sites
# SecAuditLogType Concurrent
# SecAuditLogDir /var/log/modsec_audit/
```

## Parsing the Audit Log Format

The ModSecurity audit log uses a multi-part format. Each request is a section bounded by markers:

```
---UNIQUE_ID---A--   (transaction ID and timestamp)
---UNIQUE_ID---B--   (request headers)
---UNIQUE_ID---C--   (request body)
---UNIQUE_ID---F--   (response headers)
---UNIQUE_ID---G--   (response body)
---UNIQUE_ID---H--   (audit log trailer - rule matches go here)
---UNIQUE_ID---Z--   (final boundary)
```

```bash
# View a complete audit log entry
sudo awk '/^---/{ if (found) print; found=0 } /---.*---A--/{ found=1 } found{ print }' \
    /var/log/apache2/modsec_audit.log | head -100

# Extract just the rule match messages (section H)
sudo awk '/---H--/,/---[A-Z]--/' /var/log/apache2/modsec_audit.log | \
    grep "Message:" | head -20
```

## Key Metrics to Monitor

```bash
#!/bin/bash
# waf_summary.sh - Daily WAF activity summary

LOG="/var/log/apache2/modsec_audit.log"
YESTERDAY=$(date -d yesterday '+%d/%b/%Y')

echo "=== WAF Activity Summary - $YESTERDAY ==="
echo ""

echo "Total rule matches:"
grep "\[$YESTERDAY" "$LOG" | wc -l

echo ""
echo "Top triggered rules:"
grep "id \"" "$LOG" | \
    grep "\[$YESTERDAY" | \
    grep -oP 'id "\K[0-9]+' | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "Top attacking IP addresses:"
# Extract source IPs from section A
awk '/---.*---A--/{getline; split($0, a, " "); print a[3]}' "$LOG" | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "Top targeted URIs:"
grep "GET\|POST\|PUT\|DELETE" "$LOG" | \
    awk '{print $2}' | sort | uniq -c | sort -rn | head -10

echo ""
echo "Actions taken:"
echo "  Blocked (403):"
grep "HTTP/1\.[01] 403" "$LOG" | wc -l
echo "  Passed through:"
grep "HTTP/1\.[01] 200\|HTTP/1\.[01] 301\|HTTP/1\.[01] 302" "$LOG" | wc -l
```

## Setting Up Structured Logging

The default audit log format is hard to parse at scale. Configure JSON logging for better tooling integration:

```bash
sudo nano /etc/modsecurity/modsecurity.conf
```

```apache
# Enable JSON audit log format (ModSecurity 3.x)
SecAuditLogFormat JSON
SecAuditLog /var/log/apache2/modsec_audit.json

# For ModSecurity 2.x (Apache module), structured logging via mlogc
# SecAuditLogStorageDir /var/log/modsec_audit/
# SecAuditLogType Concurrent
```

With JSON format, parsing is straightforward:

```bash
# Parse with jq
sudo tail -100 /var/log/apache2/modsec_audit.json | \
    jq -r '.transaction | "\(.client_ip) \(.request.uri) \(.messages[].message)"' 2>/dev/null

# Find all blocked requests
sudo cat /var/log/apache2/modsec_audit.json | \
    jq 'select(.transaction.response.http_code == 403)' 2>/dev/null | \
    jq -r '.transaction.client_ip'
```

## Automating Blocking with fail2ban

fail2ban reads log files and bans IPs that show malicious patterns. Integrating it with ModSecurity logs automates response to persistent attackers.

```bash
# Install fail2ban
sudo apt install fail2ban

# Create a ModSecurity jail
sudo nano /etc/fail2ban/filter.d/apache-modsec.conf
```

```ini
[Definition]
# Match ModSecurity block entries in the Apache error log
# Format: [ModSecurity] Access denied with code 403 (phase 2) ... [client 1.2.3.4]
failregex = ^%(_apache_error_client)s ModSecurity: Access denied with code 4\d\d.*$
            ^%(_apache_error_client)s ModSecurity: Warning.*$

ignoreregex =
```

```bash
# Create the jail configuration
sudo nano /etc/fail2ban/jail.d/apache-modsec.conf
```

```ini
[apache-modsec]
enabled = true
port    = http,https
filter  = apache-modsec
logpath = /var/log/apache2/error.log
maxretry = 5           # Block after 5 ModSecurity violations
findtime = 600         # Within 10 minutes
bantime  = 3600        # Ban for 1 hour
action  = iptables-multiport[name=apache-modsec, port="80,443"]
```

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Check the jail status
sudo fail2ban-client status apache-modsec

# Manually ban an IP
sudo fail2ban-client set apache-modsec banip 1.2.3.4

# Unban an IP
sudo fail2ban-client set apache-modsec unbanip 1.2.3.4

# Check which IPs are banned
sudo fail2ban-client status apache-modsec | grep "Banned IP"
```

## Real-Time Attack Detection Script

```bash
#!/bin/bash
# watch_attacks.sh - Real-time WAF event monitor

LOG="/var/log/apache2/error.log"
ALERT_THRESHOLD=10   # Alert if IP triggers more than this many rules in 5 min

echo "Monitoring WAF events... (Ctrl+C to stop)"

# Watch the error log for ModSecurity events
tail -F "$LOG" | while read line; do
    if echo "$line" | grep -q "ModSecurity.*Access denied\|ModSecurity.*Warning"; then
        # Extract IP address
        ip=$(echo "$line" | grep -oP 'client \K[\d.]+')
        rule=$(echo "$line" | grep -oP 'id "\K[0-9]+')
        uri=$(echo "$line" | grep -oP 'uri "\K[^"]+')
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')

        echo "[$timestamp] BLOCKED IP=$ip Rule=$rule URI=$uri"

        # Count recent hits from this IP (in memory, for simplicity)
        # In production, use a proper counter with Redis or similar
    fi
done
```

## Correlating WAF Logs with Application Logs

Understanding whether a WAF block was a true positive requires looking at application logs alongside WAF logs:

```bash
#!/bin/bash
# correlate_logs.sh - Find WAF blocks and correlate with app behavior

# Get recently blocked IPs
BLOCKED_IPS=$(sudo grep "Access denied" /var/log/apache2/error.log | \
    grep -oP 'client \K[\d.]+' | sort | uniq)

for ip in $BLOCKED_IPS; do
    echo "=== IP: $ip ==="

    echo "WAF blocks (last 24h):"
    sudo grep "$ip" /var/log/apache2/error.log | \
        grep "ModSecurity" | tail -5

    echo ""
    echo "Apache access log (last 24h):"
    sudo grep "$ip" /var/log/apache2/access.log | \
        awk '{print $7, $9}' | sort | uniq -c | sort -rn | head -5

    echo ""
done
```

## Analyzing Attack Patterns

```bash
# Find SQL injection attempts
sudo grep -h "" /var/log/apache2/modsec_audit.log | \
    grep "942" | \
    grep -oP 'client \K[\d.]+' | \
    sort | uniq -c | sort -rn | head -20

# Find XSS attempts by rule 941*
sudo grep "id \"941" /var/log/apache2/error.log | \
    grep -oP '\[client \K[\d.]+' | \
    sort | uniq -c | sort -rn

# Find scanner activity (rule 913*)
sudo grep "id \"913" /var/log/apache2/error.log | \
    grep -oP '\[client \K[\d.]+' | \
    sort | uniq -c | sort -rn

# Timeline of attacks (attacks per hour)
sudo grep "ModSecurity.*Access denied" /var/log/apache2/error.log | \
    grep -oP '\[\K[^\]]+' | \
    awk '{print $1, $2}' | \
    sed 's/:[0-9]*:[0-9]* / /' | \
    sort | uniq -c | sort -k3,4
```

## Setting Up Alerting

```bash
# Simple email alert when attack rate exceeds threshold
sudo nano /usr/local/bin/waf_alert.sh
```

```bash
#!/bin/bash
# waf_alert.sh - Alert when WAF block rate is high

THRESHOLD=100     # blocks per 5 minutes
ADMIN_EMAIL="admin@example.com"
LOG="/var/log/apache2/error.log"

# Count blocks in the last 5 minutes
SINCE=$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')
COUNT=$(sudo grep "ModSecurity.*Access denied" "$LOG" | \
    awk -v since="$SINCE" '$0 >= since' | wc -l)

if [ "$COUNT" -gt "$THRESHOLD" ]; then
    echo "WAF Alert: $COUNT blocks in the last 5 minutes" | \
        mail -s "WAF High Activity Alert" "$ADMIN_EMAIL"
fi
```

```bash
chmod +x /usr/local/bin/waf_alert.sh

# Add to cron
echo "*/5 * * * * root /usr/local/bin/waf_alert.sh" | \
    sudo tee /etc/cron.d/waf-alert
```

## Using mlogc for Centralized Logging

For multiple servers, use the ModSecurity log collector (`mlogc`) to centralize audit logs:

```bash
# Install mlogc
sudo apt install modsecurity-crs

# Configure ModSecurity for concurrent logging
sudo nano /etc/modsecurity/modsecurity.conf
```

```apache
SecAuditLogType Concurrent
SecAuditLogStorageDir /var/log/modsec_audit/
SecAuditLogDirMode 02750
SecAuditLogFileMode 0640
```

```bash
# Create the log directory
sudo mkdir -p /var/log/modsec_audit/
sudo chown www-data:www-data /var/log/modsec_audit/

sudo systemctl restart apache2
```

## Recommended Monitoring Dashboard Metrics

If you're feeding WAF data into a monitoring system (Prometheus, Grafana, ELK), these are the most useful metrics:

1. **blocks_per_minute** - Total WAF blocks per minute
2. **unique_attacking_ips** - Count of unique source IPs triggering rules
3. **top_rules_triggered** - Which rule IDs are firing most often
4. **false_positive_rate** - Blocks on known-good paths (requires marking)
5. **attack_categories** - SQLi vs XSS vs LFI vs scanner activity
6. **response_time_impact** - Average response time with WAF vs without

Active WAF monitoring transforms the WAF from a passive filter into an active threat intelligence source. The patterns you see - which IPs, which rules, which URIs - tell you what attackers are targeting and where your application's weaknesses are perceived to be, even if the attacks are being blocked.
