# How to Monitor Certificate Expiry on IPv6 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, IPv6, Monitoring, Certificate Expiry, Prometheus, Alerting, DevOps

Description: Set up certificate expiry monitoring for IPv6 endpoints using shell scripts, Prometheus, and alerting tools to prevent unexpected service outages from expired certificates.

---

Expired TLS certificates cause immediate service outages. Monitoring certificate expiry on IPv6 endpoints requires tools that support IPv6 connections and bracket notation in addresses. This guide covers multiple monitoring approaches from simple scripts to full observability stacks.

## Method 1: Shell Script for Certificate Expiry Check

A simple script to check certificate expiry on IPv6 endpoints:

```bash
#!/bin/bash
# check_cert_expiry_ipv6.sh - Monitor TLS cert expiry on IPv6 endpoints

# Configuration

ENDPOINTS=(
  "2001:db8::1|443|example.com"
  "2001:db8::2|8443|api.example.com"
)
WARN_DAYS=30
CRITICAL_DAYS=7

check_cert() {
  local ipv6="$1"
  local port="$2"
  local hostname="$3"

  # Get certificate expiry date
  EXPIRY=$(echo | timeout 10 openssl s_client \
    -connect "[$ipv6]:$port" \
    -servername "$hostname" \
    2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [ -z "$EXPIRY" ]; then
    echo "CRITICAL: Cannot connect to [$ipv6]:$port"
    return 2
  fi

  # Calculate days until expiry
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || \
    date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  if [ "$DAYS_LEFT" -lt "$CRITICAL_DAYS" ]; then
    echo "CRITICAL: $hostname cert expires in $DAYS_LEFT days"
    return 2
  elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
    echo "WARNING: $hostname cert expires in $DAYS_LEFT days"
    return 1
  else
    echo "OK: $hostname cert expires in $DAYS_LEFT days"
    return 0
  fi
}

# Check all endpoints
for endpoint in "${ENDPOINTS[@]}"; do
  IFS='|' read -r ipv6 port hostname <<< "$endpoint"
  check_cert "$ipv6" "$port" "$hostname"
done
```

## Method 2: Using ssl-cert-check Tool

```bash
# Install ssl-cert-check
wget https://raw.githubusercontent.com/Matty9191/ssl-cert-check/master/ssl-cert-check \
  -O /usr/local/bin/ssl-cert-check
chmod +x /usr/local/bin/ssl-cert-check

# Check certificate on IPv6 endpoint (-s = server, -p = port, -x = days, -q = quiet)
ssl-cert-check -s 2001:db8::1 -p 443 -q -x 30

# Check multiple hosts from a file (file format: "host port" per line)
cat > /etc/ssl-cert-check/ipv6-hosts.txt << 'EOF'
2001:db8::1 443
2001:db8::2 8443
EOF

ssl-cert-check -f /etc/ssl-cert-check/ipv6-hosts.txt -x 30
```

## Method 3: Prometheus with ssl_exporter

The `ssl_exporter` supports IPv6 for certificate monitoring:

```yaml
# ssl_exporter.yaml - configuration for IPv6 targets
modules:
  default:
    timeout: 10s

  ipv6_tls:
    prober: tcp
    tcp:
      tls: true
      tls_config:
        insecure_skip_verify: false
    timeout: 10s
```

```yaml
# prometheus.yml - scrape config for IPv6 certificate monitoring
scrape_configs:
  - job_name: 'ssl_certificates_ipv6'
    metrics_path: /probe
    params:
      module: [ipv6_tls]
    static_configs:
      - targets:
          # IPv6 addresses use bracket notation
          - '[2001:db8::1]:443'
          - '[2001:db8::2]:8443'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 'ssl-exporter:9219'
```

## Method 4: Alertmanager Rules for Certificate Expiry

Create Prometheus alerting rules:

```yaml
# /etc/prometheus/rules/ssl_expiry.yml
groups:
  - name: ssl_certificate_expiry
    rules:
      - alert: SSLCertificateExpirySoon
        expr: ssl_cert_not_after{job="ssl_certificates_ipv6"} - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring in {{ $value | humanizeDuration }}"
          description: "Certificate on {{ $labels.instance }} expires soon"

      - alert: SSLCertificateExpiryImminent
        expr: ssl_cert_not_after{job="ssl_certificates_ipv6"} - time() < 86400 * 7
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "SSL certificate CRITICAL expiry on {{ $labels.instance }}"
```

## Method 5: OneUptime for IPv6 Certificate Monitoring

Configure OneUptime to monitor certificate expiry on IPv6 endpoints:

```bash
# OneUptime supports IPv6 endpoint monitoring
# Configure a monitor for your IPv6 HTTPS endpoint:
# Monitor Type: Website/API
# URL: https://[2001:db8::1]/ or https://example.com (with AAAA record)
# Check SSL: enabled
# Alert when cert expires in: 30 days (warning), 7 days (critical)
```

## Cron Job for Regular Checks

```bash
# Add to crontab for daily certificate checks
# crontab -e
0 8 * * * /usr/local/bin/check_cert_expiry_ipv6.sh \
  | mail -s "Certificate Expiry Report" admin@example.com

# Or log to file for analysis
0 * * * * /usr/local/bin/check_cert_expiry_ipv6.sh \
  >> /var/log/cert-expiry.log 2>&1
```

Regular automated certificate expiry monitoring on IPv6 endpoints ensures you receive advance warning before certificates expire, preventing unexpected TLS failures in production.
