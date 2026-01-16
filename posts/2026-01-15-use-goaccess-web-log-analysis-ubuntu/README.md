# How to Use GoAccess for Web Log Analysis on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GoAccess, Log Analysis, Ubuntu, Nginx, Apache, Web Server, Monitoring, DevOps, Linux

Description: A comprehensive guide to installing and using GoAccess for real-time web log analysis on Ubuntu, covering terminal dashboards, HTML reports, custom log formats, and GeoIP integration.

---

Web server logs contain a goldmine of insights-traffic patterns, popular pages, error rates, and potential security threats. GoAccess transforms raw log files into actionable dashboards without shipping your data to external services. This guide walks you through every feature on Ubuntu.

## What is GoAccess?

GoAccess is an open-source, real-time web log analyzer that runs in a terminal or generates standalone HTML reports. Unlike heavyweight analytics platforms, GoAccess processes logs locally, respects privacy, and delivers instant results.

### Key Features

- **Real-time analysis**: Watch traffic as it happens with live terminal or HTML dashboards.
- **Zero external dependencies**: No databases, no cloud services, no JavaScript tracking.
- **Multiple log formats**: Supports Apache, Nginx, Amazon S3, CloudFront, Elastic Load Balancer, and custom formats.
- **GeoIP integration**: Map visitor locations using MaxMind databases.
- **Lightweight**: Written in C, it parses millions of log lines in seconds.
- **Privacy-first**: Logs never leave your server.

## Prerequisites

Before installing GoAccess, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 (LTS recommended)
- Root or sudo access
- Web server logs (Nginx or Apache)
- Basic familiarity with the Linux command line

Verify your Ubuntu version with this command.

```bash
# Display Ubuntu version information
# lsb_release -a shows distributor ID, description, release number, and codename
lsb_release -a
```

## Installation Methods

GoAccess can be installed via several methods. Choose based on your need for the latest features or stability.

### Method 1: Install from Ubuntu Repositories

The simplest method uses the default Ubuntu repositories. This version may be slightly older but is well-tested.

```bash
# Update package index to ensure we get the latest available versions
sudo apt update

# Install GoAccess from Ubuntu's official repositories
# This installs a stable version that has been tested with your Ubuntu release
sudo apt install goaccess -y
```

### Method 2: Install from Official GoAccess Repository

For the latest features and bug fixes, add the official GoAccess repository.

```bash
# Import the GoAccess GPG key for package verification
# This ensures packages are authentic and haven't been tampered with
wget -O - https://deb.goaccess.io/gnugpg.key | gpg --dearmor | sudo tee /usr/share/keyrings/goaccess.gpg >/dev/null

# Add the GoAccess repository to your sources list
# $(lsb_release -cs) automatically inserts your Ubuntu codename (e.g., jammy, noble)
echo "deb [signed-by=/usr/share/keyrings/goaccess.gpg arch=$(dpkg --print-architecture)] https://deb.goaccess.io/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/goaccess.list

# Update package index to include the new repository
sudo apt update

# Install the latest GoAccess version
sudo apt install goaccess -y
```

### Method 3: Build from Source

Building from source gives you the newest features and allows custom compilation options.

```bash
# Install build dependencies
# libncursesw5-dev: Terminal UI support with wide character handling
# libgeoip-dev: Legacy GeoIP support
# libmaxminddb-dev: Modern GeoIP2 database support
# libssl-dev: SSL/TLS support for WebSocket connections
sudo apt install build-essential libncursesw5-dev libgeoip-dev libmaxminddb-dev libssl-dev -y

# Download the latest GoAccess source code
wget https://tar.goaccess.io/goaccess-1.9.3.tar.gz

# Extract the archive
tar -xzvf goaccess-1.9.3.tar.gz

# Enter the source directory
cd goaccess-1.9.3

# Configure with all optional features enabled
# --enable-utf8: Support for Unicode characters in reports
# --enable-geoip=mmdb: Use modern MaxMind DB format for GeoIP
# --with-openssl: Enable SSL for secure WebSocket connections
./configure --enable-utf8 --enable-geoip=mmdb --with-openssl

# Compile GoAccess (use -j$(nproc) to parallelize across all CPU cores)
make -j$(nproc)

# Install to /usr/local/bin
sudo make install
```

Verify the installation with this command.

```bash
# Display GoAccess version and build information
goaccess --version
```

## Basic Usage with Different Log Formats

GoAccess automatically detects common log formats, but specifying the format explicitly ensures accurate parsing.

### Analyzing Nginx Logs

Nginx typically uses the Combined Log Format by default.

```bash
# Analyze Nginx access log with Combined Log Format
# COMBINED is a predefined format that matches Nginx's default log_format
# The log contains: IP, identity, user, timestamp, request, status, size, referrer, user-agent
goaccess /var/log/nginx/access.log --log-format=COMBINED
```

### Analyzing Apache Logs

Apache also commonly uses the Combined format.

```bash
# Analyze Apache access log
# Apache's combined format includes the same fields as Nginx
goaccess /var/log/apache2/access.log --log-format=COMBINED
```

### Common Predefined Log Formats

GoAccess includes several predefined formats for convenience.

```bash
# COMBINED: Standard Apache/Nginx combined format
# %h %^[%d:%t %^] "%r" %s %b "%R" "%u"
goaccess /var/log/nginx/access.log --log-format=COMBINED

# COMMON: Basic common log format (no referrer or user-agent)
# %h %^[%d:%t %^] "%r" %s %b
goaccess /var/log/nginx/access.log --log-format=COMMON

# VCOMBINED: Combined format with virtual host
# %v:%^ %h %^[%d:%t %^] "%r" %s %b "%R" "%u"
goaccess /var/log/nginx/access.log --log-format=VCOMBINED

# W3C: W3C Extended Log File Format (IIS)
goaccess /var/log/iis/access.log --log-format=W3C

# SQUID: Squid proxy native format
goaccess /var/log/squid/access.log --log-format=SQUID

# CLOUDFRONT: Amazon CloudFront logs
goaccess /var/log/cloudfront/access.log --log-format=CLOUDFRONT

# AWS Elastic Load Balancer format
goaccess /var/log/elb/access.log --log-format=AWSELB
```

## Terminal Dashboard

The terminal dashboard is GoAccess's signature feature-a real-time ncurses interface that updates as new log entries arrive.

### Launching the Dashboard

```bash
# Open an interactive terminal dashboard for Nginx logs
# The dashboard auto-refreshes and supports keyboard navigation
goaccess /var/log/nginx/access.log --log-format=COMBINED
```

### Dashboard Navigation

The terminal interface provides these keyboard shortcuts.

```
# Navigation shortcuts:
# TAB or SHIFT+TAB  - Move between panels
# j/k or Arrow keys - Scroll within a panel
# ENTER             - Expand/collapse a panel
# o                 - Open detail view for selected item
# s                 - Sort options for current panel
# /                 - Search within panel
# n                 - Find next match
# g                 - Move to first item
# G                 - Move to last item
# q                 - Quit GoAccess
# ?                 - Show help screen
# c                 - Toggle color scheme
# h                 - Toggle host/IP panel display
```

### Real-Time Log Monitoring

Pipe live logs to GoAccess for real-time analysis.

```bash
# Monitor Nginx logs in real-time using tail -f
# The --no-parsing-spinner flag hides the progress indicator for cleaner output
tail -f /var/log/nginx/access.log | goaccess --log-format=COMBINED --no-parsing-spinner
```

## HTML Report Generation

Generate static HTML reports for sharing or archiving.

### Basic HTML Report

```bash
# Generate a standalone HTML report file
# -o specifies the output file path
# The report is self-contained with embedded CSS and JavaScript
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    -o /var/www/html/report.html
```

### Customizing HTML Reports

```bash
# Generate a detailed HTML report with custom options
# --html-report-title: Set the page title
# --html-prefs: JSON object with display preferences
# --no-html-last-updated: Hide the generation timestamp
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    -o /var/www/html/report.html \
    --html-report-title="Production Server Analytics" \
    --html-prefs='{"theme":"bright","perPage":50}' \
    --no-html-last-updated
```

### Dark Theme Report

```bash
# Generate report with dark theme
# The dark theme is easier on the eyes for night-time viewing
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    -o /var/www/html/report.html \
    --html-prefs='{"theme":"dark-gray"}'
```

## Real-Time HTML Dashboard

GoAccess can serve a live-updating HTML dashboard via WebSocket connections.

### Generate Real-Time Report

```bash
# Generate a real-time HTML report that updates via WebSocket
# --real-time-html: Enable WebSocket server for live updates
# --ws-url: WebSocket URL that the browser will connect to
# --port: WebSocket server port
# --daemonize: Run as background daemon
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    -o /var/www/html/report.html \
    --real-time-html \
    --ws-url=wss://yourserver.com:7890 \
    --port=7890 \
    --daemonize
```

### Using with SSL/TLS

For production deployments, secure the WebSocket connection.

```bash
# Real-time dashboard with SSL encryption
# --ssl-cert: Path to SSL certificate
# --ssl-key: Path to SSL private key
# These should match your web server's certificate
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    -o /var/www/html/report.html \
    --real-time-html \
    --ws-url=wss://yourserver.com:7890 \
    --port=7890 \
    --ssl-cert=/etc/letsencrypt/live/yourserver.com/fullchain.pem \
    --ssl-key=/etc/letsencrypt/live/yourserver.com/privkey.pem \
    --daemonize
```

### Nginx Reverse Proxy for WebSocket

Proxy WebSocket traffic through Nginx for cleaner URLs.

```nginx
# Add this to your Nginx server block
# This proxies WebSocket connections from /ws to the GoAccess WebSocket server
location /ws {
    # Proxy to local GoAccess WebSocket server
    proxy_pass http://127.0.0.1:7890;

    # Required headers for WebSocket upgrade
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Preserve client IP for logging
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # Disable buffering for real-time data
    proxy_buffering off;

    # Timeout settings for long-lived connections
    proxy_read_timeout 86400;
}
```

## Custom Log Format Strings

When your logs do not match predefined formats, define a custom format string.

### Understanding Format Specifiers

GoAccess uses these specifiers to match log fields.

```
# Time and Date specifiers:
# %d - Date (formats: %d/%b/%Y, %Y-%m-%d, etc.)
# %t - Time (formats: %H:%M:%S, %H:%M:%S %z, etc.)
# %x - Combined date and time field

# Request specifiers:
# %r - Full request line (e.g., "GET /page HTTP/1.1")
# %m - Request method (GET, POST, etc.)
# %U - URL path
# %q - Query string
# %H - Protocol (HTTP/1.1)

# Client specifiers:
# %h - Client IP address (or hostname)
# %^ - Ignore this field (skip any unwanted data)

# Response specifiers:
# %s - HTTP status code
# %b - Size of response in bytes

# Additional specifiers:
# %R - Referrer URL
# %u - User agent string
# %D - Time taken to serve request (microseconds)
# %T - Time taken to serve request (seconds, with millisecond precision)
# %L - Time taken to serve request (milliseconds)
# %e - User ID (from basic auth or cookie)
# %C - Cache status (HIT, MISS, etc.)
# %K - TLS encryption settings
# %k - TLS protocol version
# %M - MIME type
# %v - Virtual host or server name
```

### Custom Format Examples

Define a custom format matching your specific log structure.

```bash
# Custom format for logs with response time
# This format expects: IP [date:time zone] "request" status bytes "referrer" "user-agent" response_time
goaccess /var/log/nginx/access.log \
    --log-format='%h - - [%d:%t %^] "%r" %s %b "%R" "%u" %T' \
    --date-format='%d/%b/%Y' \
    --time-format='%H:%M:%S'
```

### JSON Log Format

Parse JSON-formatted logs common in modern deployments.

```bash
# Configure Nginx to output JSON logs (add to nginx.conf)
# log_format json_combined escape=json
#     '{"time":"$time_iso8601",'
#     '"remote_addr":"$remote_addr",'
#     '"request":"$request",'
#     '"status":$status,'
#     '"body_bytes_sent":$body_bytes_sent,'
#     '"http_referer":"$http_referer",'
#     '"http_user_agent":"$http_user_agent",'
#     '"request_time":$request_time}';

# Parse JSON logs with GoAccess
# %x matches the ISO8601 timestamp
goaccess /var/log/nginx/access.json \
    --log-format='{"time":"%x","remote_addr":"%h","request":"%r","status":%s,"body_bytes_sent":%b,"http_referer":"%R","http_user_agent":"%u","request_time":%T}' \
    --date-format='%Y-%m-%dT%H:%M:%S' \
    --time-format='%H:%M:%S'
```

## Filtering and Excluding Data

Filter logs to focus on specific traffic patterns or exclude noise.

### Exclude Static Assets

Exclude requests for static files to focus on dynamic content.

```bash
# Exclude common static file extensions from analysis
# --exclude-ip: Exclude specific IP addresses (useful for health checks)
# --ignore-panel: Hide specific panels from the dashboard
# Use multiple --ignore-referer to exclude various patterns
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --ignore-referer="*.css" \
    --ignore-referer="*.js" \
    --ignore-referer="*.png" \
    --ignore-referer="*.jpg" \
    --ignore-referer="*.gif" \
    --ignore-referer="*.ico" \
    --ignore-referer="*.woff*"
```

### Filter by Status Code

Analyze only error responses.

```bash
# Filter logs using grep before passing to GoAccess
# This shows only 4xx and 5xx errors
grep -E '" [45][0-9]{2} ' /var/log/nginx/access.log | \
    goaccess --log-format=COMBINED -o /var/www/html/errors.html
```

### Filter by Date Range

Process logs within a specific time period.

```bash
# Analyze traffic from the last 24 hours only
# --keep-last: Keep only the last N days of data
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --keep-last=1 \
    -o /var/www/html/report.html
```

### Exclude Internal Traffic

Filter out requests from internal IP addresses and health check bots.

```bash
# Exclude localhost and internal network traffic
# --exclude-ip supports CIDR notation for subnets
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --exclude-ip=127.0.0.1 \
    --exclude-ip=10.0.0.0-10.255.255.255 \
    --exclude-ip=192.168.0.0-192.168.255.255 \
    --exclude-ip=172.16.0.0-172.31.255.255
```

### Exclude Crawlers and Bots

Filter out known web crawlers for cleaner traffic analysis.

```bash
# Create a file containing crawler patterns to exclude
cat > /etc/goaccess/crawlers.list << 'EOF'
Googlebot
Bingbot
baiduspider
YandexBot
DuckDuckBot
Slurp
facebookexternalhit
LinkedInBot
Twitterbot
EOF

# Use the crawler list with GoAccess
# --ignore-crawlers excludes requests matching patterns in the list
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --ignore-crawlers \
    --crawlers-only
```

## GeoIP Integration

Map visitor locations using MaxMind GeoIP databases.

### Install GeoIP Database

```bash
# Install geoipupdate tool for managing MaxMind databases
sudo apt install geoipupdate -y

# Create MaxMind account at https://www.maxmind.com/en/geolite2/signup
# Then configure your credentials
sudo nano /etc/GeoIP.conf

# Add your MaxMind credentials:
# AccountID YOUR_ACCOUNT_ID
# LicenseKey YOUR_LICENSE_KEY
# EditionIDs GeoLite2-City GeoLite2-Country GeoLite2-ASN

# Download the databases
sudo geoipupdate

# Databases are saved to /var/lib/GeoIP/ by default
ls -la /var/lib/GeoIP/
```

### Enable GeoIP in GoAccess

```bash
# Analyze logs with GeoIP city-level location data
# --geoip-database: Path to the MaxMind DB file
# The GeoLite2-City database provides country, region, and city
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --geoip-database=/var/lib/GeoIP/GeoLite2-City.mmdb \
    -o /var/www/html/report.html
```

### GeoIP Configuration File

Add GeoIP settings to your GoAccess configuration for persistent use.

```bash
# Edit or create the GoAccess configuration file
sudo nano /etc/goaccess/goaccess.conf

# Add these lines:
# Enable GeoIP with the city database for detailed location info
geoip-database /var/lib/GeoIP/GeoLite2-City.mmdb
```

### Schedule Database Updates

Keep GeoIP data current with a cron job.

```bash
# Create a weekly cron job to update GeoIP databases
# The geoipupdate tool respects MaxMind's rate limits automatically
echo "0 3 * * 0 root /usr/bin/geoipupdate" | sudo tee /etc/cron.d/geoipupdate

# Verify the cron job was created
cat /etc/cron.d/geoipupdate
```

## Multiple Log Files

Analyze traffic across multiple log files simultaneously.

### Process Multiple Files

```bash
# Analyze multiple log files in one report
# GoAccess processes files in the order specified
# Use shell globbing for rotated logs
goaccess /var/log/nginx/access.log \
    /var/log/nginx/access.log.1 \
    /var/log/nginx/access.log.2.gz \
    --log-format=COMBINED \
    -o /var/www/html/report.html
```

### Process All Rotated Logs

```bash
# Use zcat for gzipped log files combined with current log
# This pipeline processes all historical logs
zcat /var/log/nginx/access.log.*.gz 2>/dev/null | \
    cat - /var/log/nginx/access.log | \
    goaccess --log-format=COMBINED -o /var/www/html/report.html
```

### Multiple Virtual Hosts

Process logs from multiple sites into separate reports.

```bash
# Create reports for each virtual host
# Loop through all site-specific access logs
for site in /var/log/nginx/*-access.log; do
    sitename=$(basename "$site" -access.log)
    goaccess "$site" \
        --log-format=COMBINED \
        -o "/var/www/html/reports/${sitename}.html"
done
```

### Incremental Processing

For large log files, use incremental processing with a database.

```bash
# Process logs incrementally using an on-disk database
# --persist: Save parsed data to disk
# --restore: Load previously saved data
# --db-path: Directory for the database files
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --persist \
    --restore \
    --db-path=/var/lib/goaccess \
    -o /var/www/html/report.html
```

## Nginx-Specific Configuration

Optimize GoAccess for Nginx deployments.

### Enhanced Nginx Log Format

Configure Nginx to log additional useful fields.

```nginx
# Add to http block in nginx.conf
# This enhanced format captures response time, upstream info, and cache status
log_format enhanced '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time $upstream_response_time $pipe '
                    '$upstream_cache_status';

# Apply to server block
access_log /var/log/nginx/access.log enhanced;
```

Parse the enhanced format with GoAccess.

```bash
# Custom format matching the enhanced Nginx log
# %T captures request time, %^ skips fields we don't analyze
goaccess /var/log/nginx/access.log \
    --log-format='%h - %^ [%d:%t %^] "%r" %s %b "%R" "%u" %T %^ %^ %^' \
    --date-format='%d/%b/%Y' \
    --time-format='%H:%M:%S' \
    -o /var/www/html/report.html
```

### Nginx Configuration for GoAccess Dashboard

Serve the GoAccess dashboard securely through Nginx.

```nginx
# Server block for GoAccess dashboard
server {
    listen 443 ssl http2;
    server_name stats.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/stats.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stats.yourdomain.com/privkey.pem;

    # Serve static HTML report
    root /var/www/html;
    index report.html;

    # Basic authentication for security
    auth_basic "Analytics Dashboard";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        try_files $uri $uri/ =404;
    }

    # WebSocket proxy for real-time updates
    location /ws {
        proxy_pass http://127.0.0.1:7890;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

Create basic auth credentials.

```bash
# Install apache2-utils for htpasswd command
sudo apt install apache2-utils -y

# Create password file with a new user
# -c creates the file (omit for additional users)
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

## Apache-Specific Configuration

Configure GoAccess for Apache web servers.

### Apache Log Format

Apache's default combined format works with GoAccess out of the box.

```apache
# Default Apache combined log format (usually already configured)
# Add to apache2.conf or virtual host configuration
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined

# Enable for virtual host
CustomLog ${APACHE_LOG_DIR}/access.log combined
```

### Apache with Response Time

Add response time to Apache logs.

```apache
# Enhanced Apache log format with response time in microseconds
# %D is response time in microseconds
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %D" combined_time

CustomLog ${APACHE_LOG_DIR}/access.log combined_time
```

Parse Apache logs with response time.

```bash
# Parse Apache combined format with response time
# %D at the end captures the microsecond response time
goaccess /var/log/apache2/access.log \
    --log-format='%h %^ %^ [%d:%t %^] "%r" %s %b "%R" "%u" %D' \
    --date-format='%d/%b/%Y' \
    --time-format='%H:%M:%S' \
    -o /var/www/html/report.html
```

### Apache mod_status Integration

Combine GoAccess analysis with Apache's real-time status.

```apache
# Enable mod_status for real-time Apache metrics
<Location "/server-status">
    SetHandler server-status
    Require ip 127.0.0.1
</Location>

# Enable extended status for detailed information
ExtendedStatus On
```

## Systemd Service for Real-Time Dashboard

Create a systemd service to run GoAccess as a persistent background process.

### Create Service File

```bash
# Create the systemd service file
sudo nano /etc/systemd/system/goaccess.service
```

Add the following service configuration.

```ini
# /etc/systemd/system/goaccess.service
# Systemd service for GoAccess real-time dashboard

[Unit]
# Description shown in systemctl status
Description=GoAccess Real-Time Web Log Analyzer
# Start after network is available and Nginx is running
After=network.target nginx.service
# Optional dependency on Nginx (service starts even if Nginx fails)
Wants=nginx.service

[Service]
# Simple service type - process starts and stays in foreground
Type=simple

# User and group for the service (www-data has log read access)
User=www-data
Group=www-data

# Command to run GoAccess with real-time HTML output
# Using tail -F to follow log rotation
ExecStart=/bin/bash -c 'tail -F /var/log/nginx/access.log | \
    /usr/bin/goaccess - \
    --log-format=COMBINED \
    --geoip-database=/var/lib/GeoIP/GeoLite2-City.mmdb \
    --real-time-html \
    --ws-url=wss://stats.yourdomain.com:7890 \
    --port=7890 \
    --ssl-cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem \
    --ssl-key=/etc/letsencrypt/live/yourdomain.com/privkey.pem \
    -o /var/www/html/report.html'

# Restart automatically if the service crashes
Restart=always
# Wait 5 seconds before restarting
RestartSec=5

# Security hardening options
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
# Allow writing to the output directory
ReadWritePaths=/var/www/html

[Install]
# Start service when multi-user target is reached (normal boot)
WantedBy=multi-user.target
```

### Enable and Start Service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable goaccess.service

# Start the service now
sudo systemctl start goaccess.service

# Check service status
sudo systemctl status goaccess.service

# View service logs if troubleshooting is needed
sudo journalctl -u goaccess.service -f
```

### Service Management Commands

```bash
# Stop the GoAccess service
sudo systemctl stop goaccess.service

# Restart to apply configuration changes
sudo systemctl restart goaccess.service

# Disable automatic startup
sudo systemctl disable goaccess.service

# Check if service is running
systemctl is-active goaccess.service
```

## Configuration File Reference

Store common settings in a configuration file for convenience.

### Create Configuration File

```bash
# Create a custom configuration file
sudo mkdir -p /etc/goaccess
sudo nano /etc/goaccess/goaccess.conf
```

Add your preferred settings.

```conf
# /etc/goaccess/goaccess.conf
# GoAccess configuration file

######################################
# Log Format Settings
######################################

# Time format for parsing log timestamps
time-format %H:%M:%S

# Date format for parsing log dates
date-format %d/%b/%Y

# Log format (COMBINED for standard Nginx/Apache)
log-format COMBINED

######################################
# Output Settings
######################################

# Color output in terminal
color true

# Enable colors in HTML output
html-prefs {"theme":"dark-gray","perPage":50}

# Custom report title
html-report-title My Server Analytics

######################################
# GeoIP Settings
######################################

# Path to GeoIP city database
geoip-database /var/lib/GeoIP/GeoLite2-City.mmdb

######################################
# Filtering Options
######################################

# Exclude localhost from statistics
exclude-ip 127.0.0.1

# Ignore crawlers panel
ignore-crawlers false

# Ignore requests matching these patterns
# ignore-panel REQUESTS_STATIC

######################################
# Real-Time Settings
######################################

# Enable real-time HTML output
#real-time-html true

# WebSocket port
#port 7890

######################################
# Performance Settings
######################################

# Process logs incrementally with database
#persist true
#restore true
#db-path /var/lib/goaccess
```

### Use Configuration File

```bash
# Run GoAccess with configuration file
goaccess /var/log/nginx/access.log -p /etc/goaccess/goaccess.conf

# Override specific settings from command line
goaccess /var/log/nginx/access.log \
    -p /etc/goaccess/goaccess.conf \
    --html-report-title="Custom Title" \
    -o /var/www/html/report.html
```

## Troubleshooting

Common issues and their solutions.

### Log Format Errors

The most common error is mismatched log formats.

```bash
# Debug log format issues with verbose output
# --debug-file saves parsing errors to a file for review
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --debug-file=/tmp/goaccess-debug.log

# View the first few lines of your log to understand the format
head -5 /var/log/nginx/access.log

# Test with a single line first
head -1 /var/log/nginx/access.log | goaccess --log-format=COMBINED -
```

### Permission Denied Errors

GoAccess needs read access to log files.

```bash
# Check log file permissions
ls -la /var/log/nginx/access.log

# Option 1: Add your user to the adm group (recommended)
sudo usermod -aG adm $USER
# Log out and back in for group changes to take effect

# Option 2: Run with sudo (not recommended for services)
sudo goaccess /var/log/nginx/access.log --log-format=COMBINED

# Option 3: Change log file permissions (adjust for your security needs)
sudo chmod 644 /var/log/nginx/access.log
```

### WebSocket Connection Issues

Diagnose real-time dashboard connection problems.

```bash
# Check if GoAccess WebSocket server is running
sudo netstat -tlnp | grep 7890

# Test WebSocket connectivity locally
curl -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    http://localhost:7890/

# Check firewall rules
sudo ufw status

# Allow WebSocket port if blocked
sudo ufw allow 7890/tcp
```

### Memory Issues with Large Logs

Optimize GoAccess for processing large log files.

```bash
# Process logs with limited memory using incremental mode
goaccess /var/log/nginx/access.log \
    --log-format=COMBINED \
    --persist \
    --restore \
    --db-path=/var/lib/goaccess \
    --keep-last=7 \
    -o /var/www/html/report.html

# Process in chunks using split
split -l 1000000 /var/log/nginx/access.log /tmp/chunk_
for chunk in /tmp/chunk_*; do
    goaccess "$chunk" --log-format=COMBINED \
        --persist --restore --db-path=/var/lib/goaccess
done
goaccess --persist --restore --db-path=/var/lib/goaccess \
    -o /var/www/html/report.html
```

### GeoIP Not Working

Verify GeoIP database installation.

```bash
# Check if GeoIP database exists
ls -la /var/lib/GeoIP/

# Verify database can be read
file /var/lib/GeoIP/GeoLite2-City.mmdb

# Test GeoIP with mmdblookup tool
sudo apt install mmdb-bin -y
mmdblookup --file /var/lib/GeoIP/GeoLite2-City.mmdb --ip 8.8.8.8

# Check GoAccess GeoIP support
goaccess --version | grep -i geo
```

### Service Fails to Start

Debug systemd service issues.

```bash
# Check service status and recent logs
sudo systemctl status goaccess.service

# View detailed service logs
sudo journalctl -u goaccess.service -n 50 --no-pager

# Test the command manually
sudo -u www-data /bin/bash -c 'tail -F /var/log/nginx/access.log | \
    /usr/bin/goaccess - --log-format=COMBINED'

# Verify file permissions
ls -la /var/www/html/
ls -la /var/log/nginx/access.log
```

## Cron-Based Report Generation

Automate report generation with cron jobs.

```bash
# Create a script for report generation
sudo nano /usr/local/bin/generate-goaccess-report.sh
```

Add the script content.

```bash
#!/bin/bash
# /usr/local/bin/generate-goaccess-report.sh
# Automated GoAccess report generation script

# Configuration
LOG_FILE="/var/log/nginx/access.log"
OUTPUT_DIR="/var/www/html/reports"
GEOIP_DB="/var/lib/GeoIP/GeoLite2-City.mmdb"
KEEP_DAYS=7

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for dated reports
DATE=$(date +%Y-%m-%d)

# Process all rotated logs and current log
zcat ${LOG_FILE}.*.gz 2>/dev/null | \
    cat - "$LOG_FILE" | \
    goaccess - \
    --log-format=COMBINED \
    --geoip-database="$GEOIP_DB" \
    --keep-last="$KEEP_DAYS" \
    -o "${OUTPUT_DIR}/report.html" \
    --html-report-title="Traffic Report - $DATE"

# Also create a dated archive
cp "${OUTPUT_DIR}/report.html" "${OUTPUT_DIR}/report-${DATE}.html"

# Clean up old archived reports (keep last 30 days)
find "$OUTPUT_DIR" -name "report-*.html" -mtime +30 -delete

echo "Report generated: ${OUTPUT_DIR}/report.html"
```

Make executable and schedule.

```bash
# Make script executable
sudo chmod +x /usr/local/bin/generate-goaccess-report.sh

# Add cron job to run daily at 6 AM
echo "0 6 * * * root /usr/local/bin/generate-goaccess-report.sh" | \
    sudo tee /etc/cron.d/goaccess-report

# Run immediately to test
sudo /usr/local/bin/generate-goaccess-report.sh
```

---

GoAccess proves that effective log analysis does not require cloud services or complex infrastructure. Its terminal-first design respects your privacy while delivering insights that rival expensive SaaS alternatives. Whether you need a quick terminal glance or a polished HTML dashboard for stakeholders, GoAccess handles web log analysis with minimal overhead.

For comprehensive monitoring beyond log analysis-including uptime monitoring, incident management, and performance metrics-consider [OneUptime](https://oneuptime.com). It provides a complete observability platform that complements your GoAccess insights with real-time alerting, status pages, and full-stack monitoring capabilities.
