# How to Monitor IPv6 Mail Server Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Email, IPv6, Monitoring, Postfix, Prometheus, Mail Server, Observability

Description: Monitor the health of IPv6 mail servers by tracking SMTP connectivity, queue depths, delivery rates, and authentication results with logging and metrics tools.

## Introduction

IPv6 mail servers require monitoring at multiple layers: network connectivity, SMTP service availability, queue health, and email authentication pass rates. This guide covers practical monitoring approaches from simple shell scripts to Prometheus-based metrics collection.

## 1. Basic Connectivity Monitoring

Check that the mail server is reachable over IPv6:

```bash
#!/bin/bash
# check-mail-ipv6.sh - Basic IPv6 mail server health check

MAIL_HOST="mail.example.com"
MAIL_IPV6="2001:db8::10"
ALERT_EMAIL="ops@example.com"

# Check IPv6 SMTP connectivity

check_smtp_ipv6() {
    timeout 10 nc -6 -z -w 5 "$MAIL_IPV6" 25
    return $?
}

# Check IPv6 IMAPS connectivity
check_imap_ipv6() {
    timeout 10 nc -6 -z -w 5 "$MAIL_IPV6" 993
    return $?
}

echo "=== IPv6 Mail Server Health Check ==="
if check_smtp_ipv6; then
    echo "[OK] SMTP (port 25) reachable on IPv6"
else
    echo "[FAIL] SMTP (port 25) NOT reachable on IPv6"
fi

if check_imap_ipv6; then
    echo "[OK] IMAPS (port 993) reachable on IPv6"
else
    echo "[FAIL] IMAPS (port 993) NOT reachable on IPv6"
fi
```

## 2. Postfix Queue Monitoring

Monitor the mail queue for signs of delivery problems:

```bash
#!/bin/bash
# queue-monitor.sh - Monitor Postfix queue depth

# Count messages in queue (matches both short and long Postfix queue IDs)
TOTAL=$(postqueue -p 2>/dev/null | grep -c "^[A-Za-z0-9]" || echo 0)
# Count deferred messages by inspecting the deferred queue spool
DEFERRED=$(sudo find /var/spool/postfix/deferred -type f 2>/dev/null | wc -l)

echo "Total queued: $TOTAL"
echo "Deferred: $DEFERRED"

# Alert if queue is too large
if [ "$TOTAL" -gt 500 ]; then
    echo "WARNING: Mail queue is large ($TOTAL messages)"
fi

# Show oldest messages in queue
postqueue -p | head -20
```

## 3. Delivery Rate Monitoring

Parse mail logs for delivery success/failure rates:

```bash
#!/bin/bash
# delivery-stats.sh - Parse Postfix logs for delivery statistics

LOGFILE="/var/log/mail.log"
HOUR=$(date '+%b %e %H')

echo "=== Delivery Statistics for Hour: $HOUR ==="

# Count by status
for status in sent deferred bounced; do
    count=$(grep "$HOUR" "$LOGFILE" 2>/dev/null | grep "status=$status" | wc -l)
    echo "$status: $count"
done

# Count IPv6 vs IPv4 deliveries
echo ""
echo "=== Protocol Breakdown ==="
ipv6_sent=$(grep "$HOUR" "$LOGFILE" 2>/dev/null | grep "status=sent" | \
    grep -E "relay=.*\[.*:.*\]" | wc -l)
ipv4_sent=$(grep "$HOUR" "$LOGFILE" 2>/dev/null | grep "status=sent" | \
    grep -v "relay=.*\[.*:.*\]" | grep "relay=" | wc -l)
echo "Sent via IPv6: $ipv6_sent"
echo "Sent via IPv4: $ipv4_sent"
```

## 4. Prometheus Monitoring with postfix_exporter

Use the official Postfix Prometheus exporter:

```bash
# Build postfix_exporter from source (requires Go)
git clone https://github.com/kumina/postfix_exporter.git
cd postfix_exporter
go build -o postfix_exporter .
sudo mv postfix_exporter /usr/local/bin/

# Create systemd unit
sudo tee /etc/systemd/system/postfix_exporter.service << 'EOF'
[Unit]
Description=Postfix Prometheus Exporter
After=network.target

[Service]
ExecStart=/usr/local/bin/postfix_exporter \
    --web.listen-address="[::]:9154" \
    --postfix.logfile_path=/var/log/mail.log
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now postfix_exporter
```

## 5. Checking PTR Records Automatically

Schedule a PTR check to catch when the record goes missing:

```bash
#!/bin/bash
# check-ptr.sh - Verify PTR and FCrDNS for mail server IPv6

MAIL_IPV6="2001:db8::10"
EXPECTED_HOST="mail.example.com"

PTR=$(dig -x "$MAIL_IPV6" +short | sed 's/\.$//')
AAAA=$(dig AAAA "$PTR" +short)

if [ "$PTR" = "$EXPECTED_HOST" ]; then
    echo "[OK] PTR record correct: $PTR"
else
    echo "[FAIL] PTR mismatch: expected $EXPECTED_HOST, got $PTR"
fi

if echo "$AAAA" | grep -q "$MAIL_IPV6"; then
    echo "[OK] FCrDNS verified: $PTR → $AAAA"
else
    echo "[FAIL] FCrDNS broken: $PTR → $AAAA (expected $MAIL_IPV6)"
fi
```

## 6. OneUptime Integration

Use OneUptime to monitor IPv6 mail server availability:

Configure a **TCP Monitor** in OneUptime:
- **Host**: `2001:db8::10`
- **Port**: `25`
- **Protocol**: TCP
- **IPv6**: enabled

Configure a **SMTP Monitor** to test end-to-end delivery from your IPv6 mail server.

## 7. Log Analysis with grep

```bash
# Find all delivery failures in the last 24 hours
sudo grep "$(date '+%b %e')" /var/log/mail.log | \
    grep "status=bounced\|status=deferred" | \
    awk '{print $7, $NF}' | sort | uniq -c | sort -rn | head -20

# Monitor for IPv6-specific rejections
sudo grep "$(date '+%b %e')" /var/log/mail.log | \
    grep "NOQUEUE\|reject" | grep -i "ipv6\|::" | tail -20
```

## Conclusion

IPv6 mail server health monitoring requires checking network-layer reachability over IPv6, tracking Postfix queue metrics, monitoring delivery success rates with IPv6 protocol breakdowns, and automating PTR/FCrDNS validation. Combining shell-based checks with Prometheus metrics and an external monitor like OneUptime provides comprehensive coverage.
