# How to Set Up Uptime Monitoring for Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Uptime, Availability, Services

Description: Learn how to set up uptime monitoring for services on Ubuntu using multiple approaches including Uptime Kuma, custom scripts, and integration with OneUptime for comprehensive availability tracking.

---

Uptime monitoring answers a simple but critical question: is the service available right now? While metrics systems like Prometheus tell you how a service is performing, uptime monitoring tells you whether it is responding at all. These two concerns complement each other - a service can be slow without being down, or completely unresponsive without showing warning signs in metrics.

This guide covers multiple approaches to uptime monitoring, from simple shell scripts to dedicated tools.

## Simple HTTP Uptime Monitoring with Scripts

For a quick solution, a shell script with cron works well for small environments:

```bash
# Create a basic HTTP uptime check script
sudo tee /usr/local/bin/uptime-check.sh << 'EOF'
#!/bin/bash
# Simple HTTP uptime monitor with email alerting

# Configuration
SERVICES=(
    "https://example.com:Example Website"
    "https://api.example.com/health:API Health"
    "http://internal-app:8080/status:Internal App"
)
ALERT_EMAIL="alerts@example.com"
STATE_DIR="/var/lib/uptime-check"
TIMEOUT=10

mkdir -p "$STATE_DIR"

for service_def in "${SERVICES[@]}"; do
    URL="${service_def%%:*}"
    NAME="${service_def##*:}"
    STATE_FILE="${STATE_DIR}/$(echo "$NAME" | tr ' ' '_').state"

    # Perform the check
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        --connect-timeout "$TIMEOUT" \
        "$URL" 2>/dev/null)

    if [[ "$HTTP_CODE" =~ ^(200|201|204|301|302)$ ]]; then
        CURRENT_STATE="UP"
    else
        CURRENT_STATE="DOWN"
    fi

    # Load previous state
    PREVIOUS_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "UP")

    # Save current state
    echo "$CURRENT_STATE" > "$STATE_FILE"

    # Send alert if state changed
    if [[ "$CURRENT_STATE" != "$PREVIOUS_STATE" ]]; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        if [[ "$CURRENT_STATE" == "DOWN" ]]; then
            echo "ALERT: ${NAME} is DOWN at ${TIMESTAMP} (HTTP ${HTTP_CODE})" | \
                mail -s "ALERT: ${NAME} is DOWN" "$ALERT_EMAIL"
            logger "Uptime Monitor: ${NAME} DOWN - HTTP ${HTTP_CODE}"
        else
            echo "RESOLVED: ${NAME} is UP at ${TIMESTAMP}" | \
                mail -s "RESOLVED: ${NAME} is UP" "$ALERT_EMAIL"
            logger "Uptime Monitor: ${NAME} UP - recovered"
        fi
    fi

    # Log status
    echo "$(date '+%Y-%m-%d %H:%M:%S') | ${NAME} | ${CURRENT_STATE} | HTTP ${HTTP_CODE}"
done
EOF

sudo chmod +x /usr/local/bin/uptime-check.sh

# Install mail utility if needed
sudo apt install -y mailutils

# Test the script
sudo /usr/local/bin/uptime-check.sh

# Add to cron for regular checks
echo "*/2 * * * * /usr/local/bin/uptime-check.sh >> /var/log/uptime-check.log 2>&1" | \
    sudo tee /etc/cron.d/uptime-check
```

## TCP Port Monitoring

For services that do not expose HTTP, check TCP ports directly:

```bash
sudo tee /usr/local/bin/tcp-check.sh << 'EOF'
#!/bin/bash
# TCP port uptime monitoring

CHECKS=(
    "192.168.1.10:5432:PostgreSQL"
    "192.168.1.10:6379:Redis"
    "192.168.1.20:25:SMTP"
    "192.168.1.20:143:IMAP"
)
TIMEOUT=5

for check in "${CHECKS[@]}"; do
    HOST=$(echo "$check" | cut -d: -f1)
    PORT=$(echo "$check" | cut -d: -f2)
    NAME=$(echo "$check" | cut -d: -f3)

    # Use timeout and nc (netcat) for TCP check
    if timeout "$TIMEOUT" bash -c "echo > /dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') | ${NAME} | UP"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') | ${NAME} | DOWN"
        logger "TCP Check FAILED: ${NAME} at ${HOST}:${PORT}"
    fi
done
EOF

sudo chmod +x /usr/local/bin/tcp-check.sh
```

## Installing Uptime Kuma

Uptime Kuma is a self-hosted uptime monitoring tool with an excellent web UI, supporting HTTP, TCP, DNS, and other check types:

```bash
# Install Node.js (required for Uptime Kuma)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create dedicated user
sudo useradd -m -s /bin/bash uptime-kuma

# Install Uptime Kuma
sudo -u uptime-kuma bash << 'INSTALL'
cd ~
git clone https://github.com/louislam/uptime-kuma.git
cd uptime-kuma
npm run setup
INSTALL

# Create systemd service
sudo tee /etc/systemd/system/uptime-kuma.service << 'EOF'
[Unit]
Description=Uptime Kuma - A self-hosted monitoring tool
After=network-online.target

[Service]
Type=simple
User=uptime-kuma
WorkingDirectory=/home/uptime-kuma/uptime-kuma
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
RestartSec=5

Environment=NODE_ENV=production
Environment=UPTIME_KUMA_PORT=3001
Environment=DATA_DIR=/home/uptime-kuma/uptime-kuma/data

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now uptime-kuma

# Check status
sudo systemctl status uptime-kuma

# Verify it is running
ss -tlnp | grep 3001
```

Access Uptime Kuma at `http://your-server:3001`. Create an admin account on first visit.

## Configuring Monitors in Uptime Kuma via API

```bash
# After creating admin account, get auth token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/login \
  -d '{"username":"admin","password":"yourpassword"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Add an HTTP monitor
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:3001/api/v1/monitors \
  -d '{
    "type": "http",
    "name": "Example Website",
    "url": "https://example.com",
    "interval": 60,
    "retryInterval": 60,
    "maxretries": 3,
    "timeout": 10,
    "method": "GET",
    "keyword": "",
    "upsideDown": false,
    "accepted_statuscodes": [["200-299"]]
  }'
```

## Monitoring with Prometheus Blackbox Exporter

The Prometheus Blackbox Exporter is the standard way to add uptime monitoring to a Prometheus setup:

```bash
# Download blackbox exporter
BLACKBOX_VERSION="0.24.0"
cd /tmp
wget "https://github.com/prometheus/blackbox_exporter/releases/download/v${BLACKBOX_VERSION}/blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz"
tar xzf "blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz"
sudo cp blackbox_exporter-*/blackbox_exporter /usr/local/bin/

# Create configuration
sudo mkdir -p /etc/blackbox_exporter
sudo tee /etc/blackbox_exporter/config.yml << 'EOF'
modules:
  # Standard HTTP check
  http_2xx:
    prober: http
    timeout: 10s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2"]
      valid_status_codes: [200, 204]
      method: GET
      follow_redirects: true
      fail_if_ssl: false
      fail_if_not_ssl: false
      preferred_ip_protocol: "ip4"

  # HTTPS check with SSL validation
  https_2xx:
    prober: http
    timeout: 10s
    http:
      valid_status_codes: [200, 204]
      method: GET
      fail_if_not_ssl: true
      tls_config:
        insecure_skip_verify: false

  # TCP check
  tcp_connect:
    prober: tcp
    timeout: 10s
    tcp:
      preferred_ip_protocol: "ip4"

  # ICMP (ping) check
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"

  # DNS check
  dns_check:
    prober: dns
    timeout: 5s
    dns:
      query_name: "example.com"
      query_type: "A"
      valid_rcodes:
        - NOERROR
EOF

# Create systemd service
sudo tee /etc/systemd/system/blackbox_exporter.service << 'EOF'
[Unit]
Description=Prometheus Blackbox Exporter
After=network-online.target

[Service]
User=nobody
ExecStart=/usr/local/bin/blackbox_exporter \
    --config.file=/etc/blackbox_exporter/config.yml \
    --web.listen-address=0.0.0.0:9115
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now blackbox_exporter

# Test the blackbox exporter
curl "http://localhost:9115/probe?target=https://example.com&module=http_2xx"
```

### Adding Blackbox Exporter to Prometheus

```yaml
# Add to /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://api.example.com/health
          - http://internal-app:8080/status
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9115
```

## Key Prometheus Alert Rules for Uptime

```yaml
# /etc/prometheus/rules/uptime_alerts.yml
groups:
  - name: uptime_alerts
    rules:
      # Service is completely down
      - alert: ServiceDown
        expr: probe_success == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "Service has been down for 2 minutes"

      # SSL certificate expiring soon
      - alert: SSLCertificateExpiringSoon
        expr: (probe_ssl_earliest_cert_expiry - time()) / 86400 < 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate for {{ $labels.instance }} expiring soon"
          description: "Certificate expires in {{ $value | printf \"%.0f\" }} days"

      # Service responding slowly
      - alert: SlowResponse
        expr: probe_duration_seconds > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response from {{ $labels.instance }}"
          description: "Response time is {{ $value | printf \"%.2f\" }}s"
```

## Using OneUptime for Uptime Monitoring

OneUptime provides a hosted or self-hosted uptime monitoring solution that tracks service availability and sends notifications:

```bash
# Self-hosted OneUptime sends monitoring probes to your services
# Configure a monitor in OneUptime pointing to your service URLs
# OneUptime tracks uptime percentage, response time, and sends
# notifications via email, Slack, PagerDuty, and webhooks

# Learn more at https://oneuptime.com/blog/post/setup-uptime-monitoring-services-ubuntu/view
```

Uptime monitoring is most valuable when it catches issues before users report them. The combination of frequent checks (every 1-2 minutes), multiple probe locations, and fast alerting channels like Slack or PagerDuty gives operations teams the lead time needed to investigate and resolve issues before they become widespread user complaints.
