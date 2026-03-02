# How to Analyze Nginx Logs with GoAccess on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, GoAccess, Log Analysis, Monitoring

Description: Learn how to use GoAccess to analyze Nginx access logs on Ubuntu in real time, generate HTML reports, and set up automated reporting for web traffic insights.

---

GoAccess is a fast, terminal-based log analyzer that turns raw Nginx access logs into actionable traffic data. It runs in a terminal with a curses-based dashboard, or generates standalone HTML reports. Both modes work on logs of any size - GoAccess parses and displays results in seconds even for logs with millions of lines.

This guide covers installing GoAccess, analyzing Nginx logs interactively, generating HTML reports, and setting up a real-time streaming dashboard.

## Installing GoAccess

The version in Ubuntu's default repositories is often outdated. Use the official repository for the latest version:

```bash
# Add the GoAccess signing key
curl -fsSL https://deb.goaccess.io/gnugpg.key | sudo gpg --dearmor -o /usr/share/keyrings/goaccess.gpg

# Add the repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/goaccess.gpg] https://deb.goaccess.io/ $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/goaccess.list

# Install
sudo apt update && sudo apt install goaccess -y

# Verify
goaccess --version
```

## Understanding Nginx Log Format

Before analyzing logs, GoAccess needs to know the log format. The default Nginx combined log format looks like:

```
192.168.1.100 - - [02/Mar/2026:10:15:30 +0000] "GET /api/users HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0..."
```

This matches GoAccess's `COMBINED` log format.

Check your actual Nginx log format:

```bash
grep log_format /etc/nginx/nginx.conf
# Default is usually 'combined' or 'main'
```

## Basic Log Analysis

Run GoAccess on an Nginx access log:

```bash
# Interactive terminal mode with combined log format
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -a

# For compressed logs (e.g., rotated logs)
zcat /var/log/nginx/access.log.1.gz | goaccess --log-format=COMBINED -a
```

The terminal dashboard shows:

- **Unique visitors** - unique IPs per day
- **Requested files** - most popular URLs
- **Static requests** - CSS, JS, image requests
- **Not found (404)** - broken links
- **Hosts** - visitor IPs
- **Operating systems** - parsed from User-Agent
- **Browsers** - parsed from User-Agent
- **Referring sites** - traffic sources
- **HTTP status codes** - distribution of 200, 404, 500 etc.

Navigate with arrow keys, `Tab` to switch panels, `q` to quit.

## Analyzing Multiple Log Files

Nginx rotates logs (access.log, access.log.1, access.log.2.gz, etc.). Analyze all of them together:

```bash
# Analyze current and rotated logs together
sudo goaccess /var/log/nginx/access.log \
  /var/log/nginx/access.log.1 \
  <(zcat /var/log/nginx/access.log.2.gz) \
  --log-format=COMBINED \
  -a
```

Or use a glob pattern:

```bash
# Analyze all log files
sudo zcat /var/log/nginx/access.log*.gz | \
  sudo goaccess /var/log/nginx/access.log - \
  --log-format=COMBINED \
  -a
```

## Generating HTML Reports

GoAccess can generate a self-contained HTML report with charts and tables:

```bash
# Generate an HTML report
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -o /var/www/html/report.html

# Open it in a browser
# http://your-server/report.html
```

The HTML report includes the same data as the terminal view plus interactive JavaScript charts. It is completely self-contained - no external dependencies.

## Real-Time Streaming Dashboard

GoAccess can stream new log entries as they are written, keeping the dashboard up to date:

```bash
# Follow the log file like tail -f
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  --real-time-html \
  -o /var/www/html/live-report.html \
  --daemon

# GoAccess runs in background, updating the HTML file
# Visit http://your-server/live-report.html for live charts
```

The real-time HTML feature uses WebSockets to push updates to the browser without refreshing.

## Custom Log Format

If Nginx uses a custom log format, tell GoAccess what it looks like:

```nginx
# Custom nginx log format (in nginx.conf)
log_format custom '$remote_addr - [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_time';
```

Configure GoAccess to match:

```bash
goaccess /var/log/nginx/access.log \
  --log-format='%h - [%d:%t %^] "%r" %s %b "%R" "%u" %T' \
  --date-format='%d/%b/%Y' \
  --time-format='%H:%M:%S'
```

Or put the format in a config file:

```bash
# /etc/goaccess/goaccess.conf
log-format %h %^[%d:%t %^] "%r" %s %b "%R" "%u"
date-format %d/%b/%Y
time-format %H:%M:%S
```

Then just run:

```bash
sudo goaccess /var/log/nginx/access.log -a
```

## Filtering Log Entries

GoAccess accepts piped input, so you can pre-filter with standard tools:

```bash
# Analyze only requests for a specific domain (if logging multiple vhosts)
grep "api.example.com" /var/log/nginx/access.log | goaccess --log-format=COMBINED -a

# Analyze only 5xx errors
grep '" 5[0-9][0-9] ' /var/log/nginx/access.log | goaccess --log-format=COMBINED -a

# Analyze only the last hour of logs
awk -v d="$(date -d '1 hour ago' '+%d/%b/%Y:%H:%M:%S')" '$4 > "["d' \
  /var/log/nginx/access.log | goaccess --log-format=COMBINED -a

# Exclude bot traffic
grep -v 'Googlebot\|Bingbot\|Slurp' /var/log/nginx/access.log | \
  goaccess --log-format=COMBINED -a
```

## Automating Daily Reports

Set up a cron job to generate a daily HTML report:

```bash
sudo nano /etc/cron.daily/nginx-report
```

```bash
#!/bin/bash
# Generate daily Nginx access report

DATE=$(date -d "yesterday" '+%Y-%m-%d')
REPORT_DIR="/var/www/html/reports"
LOGFILE="/var/log/nginx/access.log.1"  # yesterday's rotated log

mkdir -p "$REPORT_DIR"

# Generate HTML report for yesterday's traffic
goaccess "$LOGFILE" \
  --log-format=COMBINED \
  -o "${REPORT_DIR}/nginx-report-${DATE}.html" \
  --no-global-config

# Keep only the last 30 days of reports
find "$REPORT_DIR" -name "nginx-report-*.html" -mtime +30 -delete

echo "Report generated: ${REPORT_DIR}/nginx-report-${DATE}.html"
```

```bash
sudo chmod +x /etc/cron.daily/nginx-report
```

## Filtering by IP Exclusion

Exclude internal network traffic from reports:

```bash
# Exclude a specific IP
grep -v "^192\.168\.1\." /var/log/nginx/access.log | \
  goaccess --log-format=COMBINED -a

# Exclude a range of IPs (your office, monitoring systems)
grep -vE "^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)" \
  /var/log/nginx/access.log | goaccess --log-format=COMBINED -a
```

## GeoIP Location Data

GoAccess can show visitor locations with GeoIP databases:

```bash
# Install GeoIP database
sudo apt install geoip-database -y
wget -O /usr/share/GeoIP/GeoLite2-City.mmdb \
  "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_KEY&suffix=tar.gz"

# Run with GeoIP
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  --geoip-database=/usr/share/GeoIP/GeoLite2-City.mmdb \
  -a
```

## Exporting Data as JSON or CSV

For integration with other tools:

```bash
# Export as JSON
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -o report.json \
  --output-format=json

# Export specific panel as CSV
sudo goaccess /var/log/nginx/access.log \
  --log-format=COMBINED \
  -o requests.csv \
  --output-format=csv
```

## Troubleshooting

**"No input data was provided" error:**
```bash
# Check if the log file exists and has content
ls -la /var/log/nginx/access.log
wc -l /var/log/nginx/access.log

# Check file permissions
sudo -u www-data cat /var/log/nginx/access.log | head -1
```

**Wrong date parsing:**
```bash
# Test your date format
echo '02/Mar/2026:10:15:30 +0000' | \
  goaccess --log-format='%d:%t %^' --date-format='%d/%b/%Y' --time-format='%H:%M:%S' -a
```

**HTML report not updating in real-time:**
Check that the WebSocket port (7890 by default) is open:
```bash
sudo ufw allow 7890/tcp
```

GoAccess is one of those tools that earns its place quickly. Being able to go from a raw access.log to a detailed traffic breakdown in under a minute - without sending data to any third-party service - makes it valuable for both routine monitoring and incident investigation.
