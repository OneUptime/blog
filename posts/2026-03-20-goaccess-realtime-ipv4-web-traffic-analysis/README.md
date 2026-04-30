# How to Set Up GoAccess for Real-Time IPv4 Web Traffic Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GoAccess, IPv4, Log Analysis, Real-Time, Web Traffic, Nginx, Apache

Description: Set up GoAccess to analyze Nginx and Apache access logs in real time, generate HTML reports with IPv4 traffic statistics, and use WebSocket streaming for live dashboard updates.

## Introduction

GoAccess is a fast, terminal-based and browser-based log analyzer. It parses access logs in real time, displaying IPv4 visitor statistics, top pages, status code distribution, and bandwidth usage with no database required.

## Install GoAccess

```bash
# Ubuntu/Debian

sudo apt install goaccess

# CentOS/RHEL
sudo yum install goaccess

# macOS
brew install goaccess
```

## Analyze Nginx Log in Terminal

```bash
# Interactive terminal dashboard (select the log format on first run)
goaccess /var/log/nginx/access.log -c
```

## Non-Interactive with Explicit Format

```bash
goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  --no-query-string  # Merge URLs with different query strings
```

## Generate Static HTML Report

```bash
goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -o /var/www/html/report.html \
  --html-prefs='{"layout":"horizontal"}'

# Multiple log files (rotated logs)
zcat -f /var/log/nginx/access.log* | goaccess \
  --log-format=COMBINED \
  -o /var/www/html/report.html
```

## Real-Time HTML Dashboard with WebSocket

```bash
# Start GoAccess as a daemon with WebSocket push updates
goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  --real-time-html \
  -o /var/www/html/live-report.html \
  --daemonize \
  --ws-url=wss://analytics.example.com/ws \
  --addr=127.0.0.1 \
  --port=7890
```

Nginx config to expose the report:

```nginx
server {
    listen 443 ssl;
    server_name analytics.example.com;
    ssl_certificate /etc/letsencrypt/live/analytics.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.example.com/privkey.pem;

    location / {
        root /var/www/html;
        index live-report.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:7890;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Custom Log Format (with X-Forwarded-For Logged)

```bash
# If your custom log writes X-Forwarded-For as the final quoted field
goaccess /var/log/nginx/access.log \
  --log-format='%^ - %^ [%d:%t %^] "%r" %s %b "%R" "%u" "~h{, }"' \
  --date-format='%d/%b/%Y' \
  --time-format='%H:%M:%S'
```

## Useful GoAccess Panels

```text
Visitors      - Hits, unique visitors, and cumulative bandwidth per date
Requests      - Most requested non-static URLs
Static Files  - Frequently requested static assets such as .css, .js, and .png
404s          - URLs returning 404 responses
Hosts         - Detailed host/IP breakdown; with -a you can inspect user agents per host
Status Codes  - HTTP status code distribution
General Stats - Overall totals, valid/invalid requests, and bandwidth consumption
```

## Cron Job for Hourly HTML Reports

```bash
# Generate report every hour
0 * * * * goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -o /var/www/html/hourly-report.html \
  >> /var/log/goaccess.log 2>&1
```

## Conclusion

GoAccess provides instant IPv4 web traffic analytics with zero infrastructure - just a binary and your log files. Use `--real-time-html` with WebSocket for a live browser dashboard, static HTML generation for periodic reports, and `zcat -f access.log*` to include rotated logs. The **Hosts** panel gives a detailed host/IP breakdown, and `-a` lets you inspect user agents per host.
