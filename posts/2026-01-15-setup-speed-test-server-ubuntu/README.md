# How to Set Up a Speed Test Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Networking, LibreSpeed, Self-Hosted, Performance, Linux, DevOps, Infrastructure

Description: A complete guide to deploying your own network speed test server on Ubuntu using LibreSpeed, including PHP/Nginx configuration, Docker deployment, result logging, and API integration.

---

Running your own speed test server gives you accurate, unbiased measurements of your network performance without relying on third-party services. Whether you are troubleshooting internal network issues, validating ISP performance, or providing speed tests for customers, LibreSpeed offers a lightweight, open-source solution that runs entirely on your infrastructure.

## Why Self-Host a Speed Test Server

Public speed test services like Speedtest.net have limitations that make them unsuitable for many use cases:

1. **Privacy**: Your test data flows through third-party servers that may log IP addresses and usage patterns.
2. **Accuracy**: Public servers may be congested or geographically distant, skewing results.
3. **Internal Testing**: You cannot test LAN or VPN performance against public servers.
4. **Branding**: Self-hosted solutions let you customize the interface with your company branding.
5. **Historical Data**: Store and analyze test results over time to identify trends and degradation.
6. **No Rate Limits**: Run as many tests as needed without hitting API quotas.

LibreSpeed is a self-hosted speed test written in PHP and JavaScript that measures download speed, upload speed, ping, and jitter. It requires no Flash, no Java, and works in any modern browser.

## Prerequisites

Before starting, ensure you have:

- Ubuntu 22.04 LTS or 24.04 LTS server with root or sudo access
- A domain name (optional but recommended for HTTPS)
- At least 1 GB RAM and 10 GB disk space
- Open ports 80 and 443 for web traffic

Update your system packages to ensure you have the latest security patches.

```bash
# Update package lists and upgrade installed packages
# -y flag automatically answers yes to prompts
sudo apt update && sudo apt upgrade -y

# Install essential utilities you will need later
sudo apt install -y curl wget git unzip software-properties-common
```

## Installing LibreSpeed

LibreSpeed can be installed manually with a web server or via Docker. We will cover the manual installation first.

### Step 1: Install Nginx Web Server

Nginx handles HTTP requests efficiently and serves as the front-end for LibreSpeed. Apache works too, but Nginx uses less memory.

```bash
# Install Nginx web server
sudo apt install -y nginx

# Start Nginx and enable it to run on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running (should show "active (running)")
sudo systemctl status nginx
```

### Step 2: Install PHP and Required Extensions

LibreSpeed requires PHP 7.0 or higher with specific extensions for handling uploads and JSON responses.

```bash
# Install PHP-FPM (FastCGI Process Manager) for better performance with Nginx
# php-fpm: PHP processor that Nginx forwards requests to
# php-gd: Image processing (optional, for result images)
# php-curl: HTTP client for backend communications
# php-json: JSON encoding/decoding for API responses
# php-mbstring: Multibyte string handling
sudo apt install -y php-fpm php-gd php-curl php-json php-mbstring

# Check which PHP version was installed
php -v

# Verify PHP-FPM is running
sudo systemctl status php*-fpm
```

### Step 3: Download LibreSpeed

Clone the official LibreSpeed repository or download the latest release.

```bash
# Create directory for the speed test application
sudo mkdir -p /var/www/speedtest

# Clone LibreSpeed from GitHub
# The repository contains all frontend and backend files
sudo git clone https://github.com/librespeed/speedtest.git /var/www/speedtest

# Set proper ownership so the web server can access files
# www-data is the default user for Nginx/PHP on Ubuntu
sudo chown -R www-data:www-data /var/www/speedtest

# Set secure permissions
# 755 for directories (owner can write, others can read/execute)
# 644 for files (owner can write, others can read)
sudo find /var/www/speedtest -type d -exec chmod 755 {} \;
sudo find /var/www/speedtest -type f -exec chmod 644 {} \;
```

## PHP and Nginx Configuration

Configure Nginx to serve LibreSpeed and forward PHP requests to PHP-FPM.

### Nginx Server Block Configuration

Create a dedicated Nginx configuration file for your speed test server.

```bash
# Create Nginx server block configuration
sudo nano /etc/nginx/sites-available/speedtest
```

Add the following configuration. Adjust `server_name` to match your domain or IP address.

```nginx
# Nginx server block for LibreSpeed
# This configuration handles static files efficiently and forwards PHP to FPM

server {
    # Listen on port 80 for HTTP connections
    listen 80;
    listen [::]:80;

    # Replace with your domain name or server IP
    # Use underscore (_) to match any hostname if no domain
    server_name speedtest.example.com;

    # Document root where LibreSpeed files are located
    root /var/www/speedtest;

    # Default index files to serve
    index index.html index.php;

    # Logging configuration for troubleshooting
    access_log /var/log/nginx/speedtest_access.log;
    error_log /var/log/nginx/speedtest_error.log;

    # Increase client body size to allow large upload tests
    # Default 1MB is too small for speed tests
    # 100MB allows accurate upload speed measurements
    client_max_body_size 100M;

    # Disable buffering for upload tests
    # Buffering can interfere with accurate speed measurements
    proxy_buffering off;

    # Main location block for static files
    location / {
        # Try serving the URI as a file, then directory, then 404
        try_files $uri $uri/ =404;
    }

    # PHP processing configuration
    location ~ \.php$ {
        # Security: return 404 for non-existent PHP files
        # Prevents potential path traversal attacks
        try_files $uri =404;

        # Include FastCGI parameters
        include fastcgi_params;

        # Forward PHP requests to PHP-FPM socket
        # Adjust the socket path to match your PHP version
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;

        # Set the script filename parameter
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        # Increase timeouts for long-running speed tests
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }

    # Deny access to hidden files (starting with dot)
    location ~ /\. {
        deny all;
    }
}
```

Enable the site and test the configuration.

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/speedtest /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
# This catches typos before they break your server
sudo nginx -t

# If the test passes, reload Nginx to apply changes
sudo systemctl reload nginx
```

### PHP-FPM Tuning

Optimize PHP-FPM settings for handling speed test traffic.

```bash
# Edit PHP-FPM pool configuration
# Path varies by PHP version (php8.1, php8.2, etc.)
sudo nano /etc/php/8.1/fpm/pool.d/www.conf
```

Adjust the following settings for better performance under load.

```ini
; PHP-FPM Pool Configuration for Speed Test Server
; These settings handle concurrent speed test requests

; Process manager mode
; dynamic: spawn processes as needed (good balance)
; static: fixed number of processes (predictable memory)
; ondemand: spawn only when requests arrive (saves memory)
pm = dynamic

; Maximum number of child processes
; Higher values handle more concurrent tests but use more memory
pm.max_children = 50

; Number of processes to start initially
pm.start_servers = 5

; Minimum idle processes to keep ready
pm.min_spare_servers = 5

; Maximum idle processes before killing extras
pm.max_spare_servers = 35

; Maximum requests per child before respawning
; Prevents memory leaks from accumulating
pm.max_requests = 500

; Timeout for serving a single request (seconds)
; Speed tests can take 30+ seconds for slow connections
request_terminate_timeout = 300
```

Apply the PHP-FPM changes.

```bash
# Restart PHP-FPM to apply new configuration
sudo systemctl restart php8.1-fpm
```

## Customization Options

LibreSpeed offers extensive customization through its JavaScript configuration.

### Frontend Customization

Edit the example HTML file to customize the user interface.

```bash
# Copy the example file to create your custom page
sudo cp /var/www/speedtest/example-singleServer-pretty.html /var/www/speedtest/index.html

# Edit the file to customize settings
sudo nano /var/www/speedtest/index.html
```

Key customization options in the JavaScript configuration:

```javascript
// LibreSpeed Frontend Configuration
// Place this in the <script> section of your index.html

// Initialize the speed test with custom settings
var speedtest = new Speedtest();

// Set the server endpoint (use relative path for same server)
// For remote servers, use full URL: "https://server.example.com/speedtest/backend"
speedtest.setParameter("url_dl", "backend/garbage.php");
speedtest.setParameter("url_ul", "backend/empty.php");
speedtest.setParameter("url_ping", "backend/empty.php");
speedtest.setParameter("url_getIp", "backend/getIP.php");

// Test duration in seconds (longer = more accurate, but slower)
// Recommended: 15-30 seconds for reliable measurements
speedtest.setParameter("time_dl_max", 15);
speedtest.setParameter("time_ul_max", 15);

// Number of parallel streams for download/upload tests
// Higher values saturate the connection better but use more resources
// 3-6 streams work well for most connections
speedtest.setParameter("count_ping", 10);

// Garbage data size for download test
// Use "garbage.php" which generates random data on the fly
// Alternative: pre-generated file for consistent testing

// Telemetry: send results to your backend for logging
// Requires telemetry backend setup (covered later)
speedtest.setParameter("telemetry_level", "full");

// Custom callback function to handle results
speedtest.onupdate = function(data) {
    // data.dlStatus: download speed in Mbps
    // data.ulStatus: upload speed in Mbps
    // data.pingStatus: latency in ms
    // data.jitterStatus: jitter in ms
    console.log("Download: " + data.dlStatus + " Mbps");
    console.log("Upload: " + data.ulStatus + " Mbps");
    console.log("Ping: " + data.pingStatus + " ms");
};

// Start the test when the page loads or on button click
speedtest.start();
```

### Custom Branding

Modify the HTML template to add your company branding.

```html
<!-- Custom Speed Test Page Header -->
<!-- Add this to your index.html to brand the test page -->

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Speed Test - Your Company Name</title>

    <!-- Custom CSS for branding -->
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1a1a2e;
            color: #ffffff;
            margin: 0;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo {
            max-width: 200px;
            margin-bottom: 10px;
        }

        /* Speed gauge styling */
        .speed-display {
            font-size: 4rem;
            font-weight: bold;
            color: #00d4ff;
        }

        .speed-unit {
            font-size: 1.5rem;
            color: #888;
        }

        /* Result cards */
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            max-width: 800px;
            margin: 0 auto;
        }

        .result-card {
            background: #16213e;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="your-logo.png" alt="Company Logo" class="logo">
        <h1>Network Speed Test</h1>
        <p>Test your connection to our servers</p>
    </div>

    <!-- Speed test UI elements go here -->
    <div class="results-grid">
        <div class="result-card">
            <h3>Download</h3>
            <span id="dlText" class="speed-display">0</span>
            <span class="speed-unit">Mbps</span>
        </div>
        <div class="result-card">
            <h3>Upload</h3>
            <span id="ulText" class="speed-display">0</span>
            <span class="speed-unit">Mbps</span>
        </div>
        <div class="result-card">
            <h3>Ping</h3>
            <span id="pingText" class="speed-display">0</span>
            <span class="speed-unit">ms</span>
        </div>
        <div class="result-card">
            <h3>Jitter</h3>
            <span id="jitterText" class="speed-display">0</span>
            <span class="speed-unit">ms</span>
        </div>
    </div>

    <!-- LibreSpeed scripts -->
    <script src="speedtest.js"></script>
</body>
</html>
```

## Multiple Test Points

For organizations with multiple locations, configure LibreSpeed to test against multiple servers.

### Server List Configuration

Create a server list that allows users to select or auto-detect the nearest test point.

```javascript
// Multiple Server Configuration
// Define your speed test servers in different locations

var serverList = [
    {
        // Server 1: Primary data center
        name: "New York - Primary DC",
        server: "https://speedtest-nyc.example.com/",
        dlURL: "backend/garbage.php",
        ulURL: "backend/empty.php",
        pingURL: "backend/empty.php",
        getIpURL: "backend/getIP.php"
    },
    {
        // Server 2: West coast location
        name: "Los Angeles - West DC",
        server: "https://speedtest-lax.example.com/",
        dlURL: "backend/garbage.php",
        ulURL: "backend/empty.php",
        pingURL: "backend/empty.php",
        getIpURL: "backend/getIP.php"
    },
    {
        // Server 3: European presence
        name: "Frankfurt - EU DC",
        server: "https://speedtest-fra.example.com/",
        dlURL: "backend/garbage.php",
        ulURL: "backend/empty.php",
        pingURL: "backend/empty.php",
        getIpURL: "backend/getIP.php"
    }
];

// Initialize speedtest with server list
var speedtest = new Speedtest();

// Let LibreSpeed auto-select the best server based on ping
speedtest.setParameter("getIp_ispInfo", true);

// Or allow manual server selection
function selectServer(index) {
    var server = serverList[index];
    speedtest.setParameter("url_dl", server.server + server.dlURL);
    speedtest.setParameter("url_ul", server.server + server.ulURL);
    speedtest.setParameter("url_ping", server.server + server.pingURL);
    speedtest.setParameter("url_getIp", server.server + server.getIpURL);
}

// Function to ping all servers and find the fastest
async function findBestServer() {
    var bestServer = null;
    var bestPing = Infinity;

    for (var i = 0; i < serverList.length; i++) {
        var server = serverList[i];
        var startTime = performance.now();

        try {
            // Send a small request to measure latency
            await fetch(server.server + server.pingURL, {
                method: 'GET',
                cache: 'no-store'
            });

            var ping = performance.now() - startTime;
            console.log(server.name + ": " + ping.toFixed(0) + "ms");

            if (ping < bestPing) {
                bestPing = ping;
                bestServer = i;
            }
        } catch (e) {
            console.log(server.name + ": unreachable");
        }
    }

    if (bestServer !== null) {
        selectServer(bestServer);
        console.log("Selected: " + serverList[bestServer].name);
    }
}
```

### CORS Configuration for Multi-Server Setup

When testing against remote servers, configure CORS headers to allow cross-origin requests.

```bash
# Add CORS headers to Nginx configuration for multi-server setup
sudo nano /etc/nginx/sites-available/speedtest
```

Add these headers inside the server block:

```nginx
# CORS headers for cross-origin speed test requests
# Required when the test page is served from a different domain

# Allow requests from any origin (or specify allowed domains)
add_header Access-Control-Allow-Origin "*" always;

# Allow specific HTTP methods used by speed tests
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;

# Allow required headers for the test
add_header Access-Control-Allow-Headers "Content-Type, Accept, X-Requested-With" always;

# Handle preflight OPTIONS requests
location = /backend/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Accept, X-Requested-With";
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
}
```

## Result Storage and Logging

Configure LibreSpeed to store test results in a database for historical analysis.

### SQLite Backend (Simple)

For smaller deployments, use the built-in SQLite telemetry backend.

```bash
# Copy the telemetry configuration template
sudo cp /var/www/speedtest/results/telemetry_settings.php.template \
       /var/www/speedtest/results/telemetry_settings.php

# Edit the configuration
sudo nano /var/www/speedtest/results/telemetry_settings.php
```

Configure the telemetry settings:

```php
<?php
// LibreSpeed Telemetry Configuration
// This file configures how test results are stored

// Enable or disable telemetry (result storage)
// Set to false to disable all result logging
$Rone_settings["enable"] = true;

// Database type: "sqlite", "mysql", "postgresql"
// SQLite is simplest - stores data in a file
$Rone_settings["db_type"] = "sqlite";

// SQLite database file path
// Must be writable by the web server (www-data)
$Rone_settings["sqlite_database"] = "/var/www/speedtest/results/telemetry.sql";

// Privacy settings
// Redact last two octets of IP addresses for privacy
$Rone_settings["redact_ip_addresses"] = true;

// Enable distance calculation if you have multiple servers
$Rone_settings["enable_id_obfuscation"] = true;

// Result data retention (days)
// Set to 0 to keep forever
$Rone_settings["stats_password"] = "your-secure-password-here";

?>
```

Create the database and set permissions:

```bash
# Create results directory if it doesn't exist
sudo mkdir -p /var/www/speedtest/results

# Set permissions so PHP can write to the database
sudo chown -R www-data:www-data /var/www/speedtest/results
sudo chmod 755 /var/www/speedtest/results
```

### MySQL/MariaDB Backend (Production)

For production deployments with high traffic, use MySQL or MariaDB.

```bash
# Install MariaDB server
sudo apt install -y mariadb-server

# Secure the installation
sudo mysql_secure_installation

# Log into MariaDB to create the database
sudo mysql -u root -p
```

Create the database and user:

```sql
-- Create database for LibreSpeed telemetry
CREATE DATABASE speedtest_results CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user with limited privileges
-- Replace 'strong_password' with a secure password
CREATE USER 'speedtest'@'localhost' IDENTIFIED BY 'strong_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON speedtest_results.* TO 'speedtest'@'localhost';

-- Apply privilege changes
FLUSH PRIVILEGES;

-- Switch to the new database
USE speedtest_results;

-- Create the results table
CREATE TABLE speedtest_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45) NOT NULL,
    ispinfo TEXT,
    extra TEXT,
    ua TEXT,
    lang VARCHAR(10),
    dl FLOAT,
    ul FLOAT,
    ping FLOAT,
    jitter FLOAT,
    log TEXT,
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip (ip)
) ENGINE=InnoDB;

EXIT;
```

Update the PHP configuration to use MySQL:

```php
<?php
// MySQL Telemetry Configuration
// Provides better performance and query capabilities than SQLite

$Rone_settings["enable"] = true;
$Rone_settings["db_type"] = "mysql";

// MySQL connection settings
$Rone_settings["mysql_server"] = "localhost";
$Rone_settings["mysql_database"] = "speedtest_results";
$Rone_settings["mysql_user"] = "speedtest";
$Rone_settings["mysql_password"] = "strong_password";

// Optional: Connection charset
$Rone_settings["mysql_charset"] = "utf8mb4";

// Privacy and security settings
$Rone_settings["redact_ip_addresses"] = true;
$Rone_settings["enable_id_obfuscation"] = true;
$Rone_settings["stats_password"] = "admin-dashboard-password";

?>
```

### Viewing Results

Access the built-in statistics page to view test results.

```bash
# The stats page is available at /results/stats.php
# Access it via: https://speedtest.example.com/results/stats.php
# Enter the password configured in telemetry_settings.php
```

Create a custom query script for detailed analysis:

```php
<?php
// Custom Results Query Script
// Save as /var/www/speedtest/results/query.php

// Require authentication
header('Content-Type: application/json');

// Simple API key authentication
$api_key = $_GET['key'] ?? '';
if ($api_key !== 'your-api-key-here') {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid API key']);
    exit;
}

// Database connection
$pdo = new PDO(
    'mysql:host=localhost;dbname=speedtest_results;charset=utf8mb4',
    'speedtest',
    'strong_password',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Query parameters
$start_date = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
$end_date = $_GET['end'] ?? date('Y-m-d');

// Fetch aggregate statistics
$stmt = $pdo->prepare("
    SELECT
        DATE(timestamp) as date,
        COUNT(*) as test_count,
        AVG(dl) as avg_download,
        AVG(ul) as avg_upload,
        AVG(ping) as avg_ping,
        MAX(dl) as max_download,
        MIN(ping) as min_ping
    FROM speedtest_users
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
");

$stmt->execute([$start_date, $end_date . ' 23:59:59']);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'period' => ['start' => $start_date, 'end' => $end_date],
    'data' => $results
]);
?>
```

## Docker Deployment Option

Docker simplifies deployment and ensures consistent environments across servers.

### Docker Compose Setup

Create a complete Docker Compose configuration for LibreSpeed.

```bash
# Create directory for Docker deployment
mkdir -p ~/speedtest-docker
cd ~/speedtest-docker

# Create Docker Compose file
nano docker-compose.yml
```

Add the following Docker Compose configuration:

```yaml
# Docker Compose configuration for LibreSpeed
# Includes web server, database, and reverse proxy

version: '3.8'

services:
  # LibreSpeed web application
  speedtest:
    image: adolfintel/speedtest:latest
    container_name: speedtest
    restart: unless-stopped
    environment:
      # Basic configuration
      - MODE=standalone
      # Telemetry settings
      - TELEMETRY=true
      - DB_TYPE=mysql
      - DB_HOSTNAME=db
      - DB_NAME=speedtest
      - DB_USERNAME=speedtest
      - DB_PASSWORD=${DB_PASSWORD:-changeme}
      # Privacy settings
      - REDACT_IP_ADDRESSES=true
      - ENABLE_ID_OBFUSCATION=true
      # Stats page password
      - PASSWORD=${STATS_PASSWORD:-admin}
      # Server info
      - IPINFO_APIKEY=${IPINFO_KEY:-}
      # Distance calculation
      - DISTANCE=km
    volumes:
      # Persist database for SQLite mode
      - speedtest-db:/database
      # Custom configuration overrides
      - ./custom/index.html:/speedtest/index.html:ro
    networks:
      - speedtest-net
    depends_on:
      - db

  # MariaDB database for result storage
  db:
    image: mariadb:10.11
    container_name: speedtest-db
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD:-rootpassword}
      - MYSQL_DATABASE=speedtest
      - MYSQL_USER=speedtest
      - MYSQL_PASSWORD=${DB_PASSWORD:-changeme}
    volumes:
      - mariadb-data:/var/lib/mysql
    networks:
      - speedtest-net
    # Health check for database readiness
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx reverse proxy with SSL termination
  nginx:
    image: nginx:alpine
    container_name: speedtest-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    networks:
      - speedtest-net
    depends_on:
      - speedtest

# Named volumes for data persistence
volumes:
  speedtest-db:
    driver: local
  mariadb-data:
    driver: local

# Isolated network for container communication
networks:
  speedtest-net:
    driver: bridge
```

Create the environment file for sensitive configuration:

```bash
# Create environment file for secrets
nano .env
```

```env
# Docker environment variables
# Do not commit this file to version control

# Database passwords
DB_PASSWORD=secure-database-password
DB_ROOT_PASSWORD=secure-root-password

# Stats page password
STATS_PASSWORD=secure-admin-password

# Optional: IPInfo API key for ISP detection
IPINFO_KEY=your-ipinfo-api-key
```

Create the Nginx proxy configuration:

```bash
# Create Nginx configuration directory
mkdir -p nginx/conf.d nginx/ssl

# Create main Nginx config
nano nginx/nginx.conf
```

```nginx
# Nginx configuration for Docker deployment
# Handles SSL termination and proxies to LibreSpeed container

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format with timing information
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" $request_time';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;

    # Gzip compression for faster transfers
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Include additional server configurations
    include /etc/nginx/conf.d/*.conf;
}
```

Create the server block configuration:

```bash
nano nginx/conf.d/speedtest.conf
```

```nginx
# Speed test server configuration
# Proxies requests to the LibreSpeed Docker container

server {
    listen 80;
    server_name speedtest.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name speedtest.example.com;

    # SSL certificate configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Increase body size for upload tests
    client_max_body_size 100M;

    # Disable buffering for accurate speed measurements
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        # Proxy to LibreSpeed container
        proxy_pass http://speedtest:80;

        # Preserve client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Deploy the Docker stack:

```bash
# Start all containers in the background
docker-compose up -d

# View container logs
docker-compose logs -f

# Check container status
docker-compose ps

# Stop and remove containers
docker-compose down

# Remove containers and volumes (deletes data)
docker-compose down -v
```

## Ookla CLI Server Alternative

If you need compatibility with Ookla Speedtest clients, consider running the official Ookla server.

### Installing Ookla Speed Test Server

Ookla provides a free server for non-commercial use.

```bash
# Download the Ookla Speed Test Server
# Visit https://www.ookla.com/host to register and get download link

# Create installation directory
sudo mkdir -p /opt/ookla

# Download and extract (replace URL with your registration link)
cd /opt/ookla
sudo wget -O ookla-server.tar.gz "YOUR_DOWNLOAD_LINK"
sudo tar -xzf ookla-server.tar.gz

# View available options
./OoklaServer --help
```

Configure the Ookla server:

```bash
# Create configuration file
sudo nano /opt/ookla/OoklaServer.properties
```

```properties
# Ookla Speed Test Server Configuration
# Adjust these settings based on your server capacity

# Network binding
OoklaServer.serverPort = 8080
OoklaServer.sslServerPort = 8443

# Server identification (from Ookla registration)
OoklaServer.serverId = YOUR_SERVER_ID
OoklaServer.serverToken = YOUR_SERVER_TOKEN

# Thread configuration
OoklaServer.maxConnections = 100
OoklaServer.threadCount = 4

# Logging
OoklaServer.logFile = /var/log/ookla/ookla-server.log
OoklaServer.logLevel = INFO

# SSL certificate paths (optional)
OoklaServer.sslCertFile = /etc/ssl/certs/speedtest.pem
OoklaServer.sslKeyFile = /etc/ssl/private/speedtest.key
```

Create a systemd service for automatic startup:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/ookla-server.service
```

```ini
# Systemd service for Ookla Speed Test Server
# Ensures the server starts on boot and restarts on failure

[Unit]
Description=Ookla Speed Test Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/ookla
ExecStart=/opt/ookla/OoklaServer --daemon=false
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/ookla

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Create log directory
sudo mkdir -p /var/log/ookla
sudo chown www-data:www-data /var/log/ookla

# Reload systemd and start the service
sudo systemctl daemon-reload
sudo systemctl enable ookla-server
sudo systemctl start ookla-server

# Check status
sudo systemctl status ookla-server
```

## iPerf3 for Internal Testing

For accurate internal network testing between servers, use iPerf3.

### Installing iPerf3

```bash
# Install iPerf3 from Ubuntu repositories
sudo apt install -y iperf3
```

### Running iPerf3 Server

Start iPerf3 in server mode to accept test connections.

```bash
# Run iPerf3 server on default port 5201
# -s: Server mode
# -D: Run as daemon (background)
iperf3 -s -D

# Run on custom port with logging
# -p: Custom port number
# --logfile: Log results to file
iperf3 -s -p 5201 --logfile /var/log/iperf3.log -D

# Run with JSON output for parsing
iperf3 -s -p 5201 -J --logfile /var/log/iperf3.json -D
```

Create a systemd service for iPerf3:

```bash
sudo nano /etc/systemd/system/iperf3.service
```

```ini
# Systemd service for iPerf3 speed test server
# Provides internal network bandwidth testing

[Unit]
Description=iPerf3 Network Performance Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/iperf3 -s -p 5201
Restart=always
RestartSec=3

# Security settings
User=nobody
Group=nogroup
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start iPerf3 service
sudo systemctl daemon-reload
sudo systemctl enable iperf3
sudo systemctl start iperf3

# Open firewall port if using UFW
sudo ufw allow 5201/tcp
```

### Running iPerf3 Client Tests

From another machine, test bandwidth to your server.

```bash
# Basic TCP bandwidth test
# -c: Client mode, connect to server
# Replace SERVER_IP with your server's IP address
iperf3 -c SERVER_IP

# Extended test with more options
# -t 30: Test duration in seconds
# -P 4: Number of parallel streams
# -R: Reverse mode (test download speed)
iperf3 -c SERVER_IP -t 30 -P 4 -R

# UDP test for jitter and packet loss
# -u: UDP mode
# -b 100M: Target bandwidth (100 Mbps)
iperf3 -c SERVER_IP -u -b 100M -t 30

# JSON output for automated parsing
iperf3 -c SERVER_IP -J > results.json

# Bidirectional test (both directions simultaneously)
iperf3 -c SERVER_IP --bidir -t 30
```

### Automated iPerf3 Testing Script

Create a script for regular internal bandwidth testing.

```bash
#!/bin/bash
# iPerf3 Automated Testing Script
# Save as /usr/local/bin/iperf3-monitor.sh

# Configuration
SERVER="192.168.1.100"
PORT="5201"
DURATION="10"
LOG_DIR="/var/log/iperf3-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Run TCP test
echo "Running TCP bandwidth test..."
iperf3 -c "$SERVER" -p "$PORT" -t "$DURATION" -J > "$LOG_DIR/tcp_$TIMESTAMP.json"

# Run UDP test for jitter measurement
echo "Running UDP jitter test..."
iperf3 -c "$SERVER" -p "$PORT" -u -b 100M -t "$DURATION" -J > "$LOG_DIR/udp_$TIMESTAMP.json"

# Parse and display results
TCP_BANDWIDTH=$(jq '.end.sum_received.bits_per_second / 1000000' "$LOG_DIR/tcp_$TIMESTAMP.json")
UDP_JITTER=$(jq '.end.sum.jitter_ms' "$LOG_DIR/udp_$TIMESTAMP.json")
UDP_LOSS=$(jq '.end.sum.lost_percent' "$LOG_DIR/udp_$TIMESTAMP.json")

echo "Results:"
echo "  TCP Bandwidth: ${TCP_BANDWIDTH} Mbps"
echo "  UDP Jitter: ${UDP_JITTER} ms"
echo "  UDP Packet Loss: ${UDP_LOSS}%"

# Optional: Send results to monitoring system
# curl -X POST "https://monitoring.example.com/api/metrics" \
#   -H "Content-Type: application/json" \
#   -d "{\"bandwidth\": $TCP_BANDWIDTH, \"jitter\": $UDP_JITTER, \"loss\": $UDP_LOSS}"
```

Make the script executable and schedule it:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/iperf3-monitor.sh

# Add to crontab for hourly execution
sudo crontab -e
```

Add the cron entry:

```cron
# Run iPerf3 bandwidth test every hour
0 * * * * /usr/local/bin/iperf3-monitor.sh >> /var/log/iperf3-tests/cron.log 2>&1
```

## API Access for Automation

Build automated speed testing into your monitoring and CI/CD pipelines.

### LibreSpeed API Endpoints

LibreSpeed provides backend endpoints that can be called programmatically.

```bash
#!/bin/bash
# LibreSpeed API Testing Script
# Demonstrates programmatic speed testing

SPEEDTEST_SERVER="https://speedtest.example.com"

# Test download speed by fetching garbage data
# Measure time and calculate throughput
echo "Testing download speed..."
DOWNLOAD_START=$(date +%s.%N)
curl -s -o /dev/null -w "%{size_download}" \
    "${SPEEDTEST_SERVER}/backend/garbage.php?ckSize=100" > /tmp/dl_size
DOWNLOAD_END=$(date +%s.%N)

DL_SIZE=$(cat /tmp/dl_size)
DL_TIME=$(echo "$DOWNLOAD_END - $DOWNLOAD_START" | bc)
DL_SPEED=$(echo "scale=2; ($DL_SIZE * 8) / ($DL_TIME * 1000000)" | bc)

echo "Download: ${DL_SPEED} Mbps"

# Test upload speed by posting data
echo "Testing upload speed..."
dd if=/dev/urandom bs=1M count=10 2>/dev/null > /tmp/upload_data
UPLOAD_START=$(date +%s.%N)
curl -s -X POST -o /dev/null \
    -H "Content-Type: application/octet-stream" \
    --data-binary @/tmp/upload_data \
    "${SPEEDTEST_SERVER}/backend/empty.php"
UPLOAD_END=$(date +%s.%N)

UL_SIZE=$(stat -f%z /tmp/upload_data 2>/dev/null || stat -c%s /tmp/upload_data)
UL_TIME=$(echo "$UPLOAD_END - $UPLOAD_START" | bc)
UL_SPEED=$(echo "scale=2; ($UL_SIZE * 8) / ($UL_TIME * 1000000)" | bc)

echo "Upload: ${UL_SPEED} Mbps"

# Test ping latency
echo "Testing latency..."
PING_TIMES=""
for i in {1..10}; do
    PING_START=$(date +%s.%N)
    curl -s -o /dev/null "${SPEEDTEST_SERVER}/backend/empty.php"
    PING_END=$(date +%s.%N)
    PING_MS=$(echo "($PING_END - $PING_START) * 1000" | bc)
    PING_TIMES="${PING_TIMES}${PING_MS}\n"
done

AVG_PING=$(echo -e "$PING_TIMES" | awk '{sum+=$1} END {print sum/NR}')
echo "Average Ping: ${AVG_PING} ms"

# Cleanup
rm -f /tmp/upload_data /tmp/dl_size
```

### Python API Client

Create a Python client for programmatic speed testing.

```python
#!/usr/bin/env python3
"""
LibreSpeed API Client
Provides programmatic access to speed test functionality
"""

import requests
import time
import statistics
from dataclasses import dataclass
from typing import Optional
import json


@dataclass
class SpeedTestResult:
    """Container for speed test results"""
    download_mbps: float
    upload_mbps: float
    ping_ms: float
    jitter_ms: float
    server: str
    timestamp: str


class LibreSpeedClient:
    """
    Client for interacting with LibreSpeed server API

    Usage:
        client = LibreSpeedClient("https://speedtest.example.com")
        result = client.run_test()
        print(f"Download: {result.download_mbps} Mbps")
    """

    def __init__(self, server_url: str, timeout: int = 30):
        """
        Initialize the client

        Args:
            server_url: Base URL of the LibreSpeed server
            timeout: Request timeout in seconds
        """
        self.server_url = server_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()

    def test_download(self, chunks: int = 100) -> float:
        """
        Test download speed

        Args:
            chunks: Number of chunks to download (each ~100KB)

        Returns:
            Download speed in Mbps
        """
        url = f"{self.server_url}/backend/garbage.php"
        params = {"ckSize": chunks}

        start_time = time.time()
        response = self.session.get(url, params=params, timeout=self.timeout)
        elapsed = time.time() - start_time

        # Calculate speed in Mbps
        bytes_received = len(response.content)
        mbps = (bytes_received * 8) / (elapsed * 1_000_000)

        return round(mbps, 2)

    def test_upload(self, size_mb: int = 10) -> float:
        """
        Test upload speed

        Args:
            size_mb: Size of data to upload in megabytes

        Returns:
            Upload speed in Mbps
        """
        url = f"{self.server_url}/backend/empty.php"

        # Generate random data for upload
        data = b'x' * (size_mb * 1024 * 1024)

        start_time = time.time()
        self.session.post(url, data=data, timeout=self.timeout)
        elapsed = time.time() - start_time

        # Calculate speed in Mbps
        mbps = (len(data) * 8) / (elapsed * 1_000_000)

        return round(mbps, 2)

    def test_ping(self, samples: int = 10) -> tuple[float, float]:
        """
        Test latency and jitter

        Args:
            samples: Number of ping samples to take

        Returns:
            Tuple of (average_ping_ms, jitter_ms)
        """
        url = f"{self.server_url}/backend/empty.php"
        ping_times = []

        for _ in range(samples):
            start_time = time.time()
            self.session.get(url, timeout=self.timeout)
            elapsed = (time.time() - start_time) * 1000  # Convert to ms
            ping_times.append(elapsed)

        avg_ping = statistics.mean(ping_times)
        jitter = statistics.stdev(ping_times) if len(ping_times) > 1 else 0

        return round(avg_ping, 2), round(jitter, 2)

    def run_test(self) -> SpeedTestResult:
        """
        Run a complete speed test

        Returns:
            SpeedTestResult with all measurements
        """
        from datetime import datetime

        download = self.test_download()
        upload = self.test_upload()
        ping, jitter = self.test_ping()

        return SpeedTestResult(
            download_mbps=download,
            upload_mbps=upload,
            ping_ms=ping,
            jitter_ms=jitter,
            server=self.server_url,
            timestamp=datetime.utcnow().isoformat()
        )

    def to_json(self, result: SpeedTestResult) -> str:
        """Convert result to JSON string"""
        return json.dumps({
            "download_mbps": result.download_mbps,
            "upload_mbps": result.upload_mbps,
            "ping_ms": result.ping_ms,
            "jitter_ms": result.jitter_ms,
            "server": result.server,
            "timestamp": result.timestamp
        })


# Example usage
if __name__ == "__main__":
    client = LibreSpeedClient("https://speedtest.example.com")

    print("Running speed test...")
    result = client.run_test()

    print(f"\nResults:")
    print(f"  Download: {result.download_mbps} Mbps")
    print(f"  Upload: {result.upload_mbps} Mbps")
    print(f"  Ping: {result.ping_ms} ms")
    print(f"  Jitter: {result.jitter_ms} ms")

    # Output as JSON for integration with other tools
    print(f"\nJSON: {client.to_json(result)}")
```

### Integration with CI/CD Pipelines

Add speed testing to your deployment pipeline to catch network regressions.

```yaml
# GitHub Actions workflow for network performance testing
# Add to .github/workflows/network-test.yml

name: Network Performance Test

on:
  # Run on schedule
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

  # Manual trigger
  workflow_dispatch:

  # Run after deployments
  deployment_status:

jobs:
  speed-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install requests

      - name: Run speed test
        id: speedtest
        run: |
          python -c "
          import requests
          import time
          import json

          server = '${{ secrets.SPEEDTEST_SERVER }}'

          # Test download
          start = time.time()
          r = requests.get(f'{server}/backend/garbage.php?ckSize=50')
          dl_time = time.time() - start
          dl_speed = (len(r.content) * 8) / (dl_time * 1000000)

          # Test ping
          pings = []
          for _ in range(5):
              start = time.time()
              requests.get(f'{server}/backend/empty.php')
              pings.append((time.time() - start) * 1000)

          avg_ping = sum(pings) / len(pings)

          print(f'Download: {dl_speed:.2f} Mbps')
          print(f'Ping: {avg_ping:.2f} ms')

          # Set outputs for subsequent steps
          with open('$GITHUB_OUTPUT', 'a') as f:
              f.write(f'download={dl_speed:.2f}\n')
              f.write(f'ping={avg_ping:.2f}\n')

          # Fail if below thresholds
          if dl_speed < 10:
              raise Exception(f'Download speed {dl_speed} Mbps below threshold')
          if avg_ping > 100:
              raise Exception(f'Ping {avg_ping} ms above threshold')
          "

      - name: Report results
        if: always()
        run: |
          echo "## Network Performance Results" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Download | ${{ steps.speedtest.outputs.download }} Mbps |" >> $GITHUB_STEP_SUMMARY
          echo "| Ping | ${{ steps.speedtest.outputs.ping }} ms |" >> $GITHUB_STEP_SUMMARY
```

## HTTPS Configuration

Secure your speed test server with TLS encryption using Let's Encrypt.

### Certbot Installation

Install Certbot for automatic SSL certificate management.

```bash
# Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install certificate
# Replace speedtest.example.com with your actual domain
# -d: Domain name(s) to secure
# --nginx: Use Nginx plugin for automatic configuration
sudo certbot --nginx -d speedtest.example.com

# Certbot will:
# 1. Verify domain ownership via HTTP challenge
# 2. Obtain certificate from Let's Encrypt
# 3. Configure Nginx for HTTPS
# 4. Set up automatic renewal
```

### Manual SSL Configuration

If you have your own certificates, configure them manually.

```bash
# Edit Nginx configuration for SSL
sudo nano /etc/nginx/sites-available/speedtest
```

```nginx
# HTTPS configuration for LibreSpeed
# Uses modern TLS settings for security and performance

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name speedtest.example.com;

    # ACME challenge location for certificate renewal
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other requests to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name speedtest.example.com;

    # SSL certificate paths
    ssl_certificate /etc/letsencrypt/live/speedtest.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/speedtest.example.com/privkey.pem;

    # Strong SSL configuration (Mozilla Modern)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # SSL session caching for performance
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling for faster certificate validation
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Document root
    root /var/www/speedtest;
    index index.html index.php;

    # Increase body size for upload tests
    client_max_body_size 100M;

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }

    # PHP processing
    location ~ \.php$ {
        try_files $uri =404;
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_read_timeout 300;
    }
}
```

### Automatic Certificate Renewal

Let's Encrypt certificates expire every 90 days. Certbot sets up automatic renewal.

```bash
# Test automatic renewal
sudo certbot renew --dry-run

# View renewal timer status
sudo systemctl status certbot.timer

# Manual renewal if needed
sudo certbot renew

# Renew and reload Nginx automatically
# Certbot adds this hook by default
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
```

```bash
# Make the hook executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

## Troubleshooting

Common issues and their solutions when running LibreSpeed.

### Upload Test Fails or Times Out

This usually indicates Nginx configuration issues.

```bash
# Check Nginx error log for details
sudo tail -f /var/log/nginx/speedtest_error.log

# Common fix: Increase client body size and timeouts
# Edit /etc/nginx/sites-available/speedtest and ensure:
# client_max_body_size 100M;
# fastcgi_read_timeout 300;

# Verify PHP-FPM is processing requests
sudo tail -f /var/log/php8.1-fpm.log
```

### Speed Test Shows Lower Than Expected Results

Several factors can limit measured speeds.

```bash
# Check for CPU bottlenecks during tests
top -d 1

# Verify network interface speed
ethtool eth0 | grep Speed

# Check for network congestion
iftop -i eth0

# Ensure PHP is not rate-limited
# Edit /etc/php/8.1/fpm/pool.d/www.conf
# Increase pm.max_children if needed

# Disable TCP offloading if results are inconsistent
sudo ethtool -K eth0 tso off gso off gro off
```

### CORS Errors in Browser Console

When testing from a different domain, CORS headers must be configured.

```bash
# Add CORS headers to Nginx configuration
# Inside the server block, add:

add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Accept" always;

# For OPTIONS preflight requests
location ~ ^/backend/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Accept";
        add_header Content-Length 0;
        return 204;
    }
}
```

### Database Connection Errors

Telemetry failing to store results indicates database issues.

```bash
# Check database connectivity
mysql -u speedtest -p -h localhost speedtest_results

# Verify PHP has MySQL extension
php -m | grep mysql

# Check PHP error log
sudo tail -f /var/log/php8.1-fpm.log

# Test write permissions for SQLite
ls -la /var/www/speedtest/results/
sudo chown www-data:www-data /var/www/speedtest/results/
sudo chmod 755 /var/www/speedtest/results/
```

### Test Page Not Loading

Check that all services are running and firewall allows traffic.

```bash
# Check Nginx status
sudo systemctl status nginx

# Check PHP-FPM status
sudo systemctl status php8.1-fpm

# Verify firewall rules
sudo ufw status

# Allow HTTP/HTTPS if needed
sudo ufw allow 'Nginx Full'

# Check for port conflicts
sudo ss -tlnp | grep -E ':(80|443)'

# View Nginx configuration test
sudo nginx -t
```

### High Latency or Jitter

Network path issues or server load can cause latency problems.

```bash
# Trace the route to identify bottlenecks
traceroute client-ip-address

# Monitor network latency in real-time
mtr client-ip-address

# Check system load
uptime
vmstat 1

# Verify no process is consuming excessive resources
htop

# Check for packet loss
ping -c 100 client-ip-address | tail -3
```

---

Running your own speed test infrastructure gives you complete control over network performance measurement and historical data. LibreSpeed provides an excellent foundation for both public-facing speed tests and internal network diagnostics.

For comprehensive infrastructure monitoring beyond speed testing, consider [OneUptime](https://oneuptime.com). OneUptime provides real-time uptime monitoring, incident management, status pages, and alerting that complement your speed test data. Track your speed test server availability, set up alerts when network performance degrades, and maintain transparent communication with users through public status pages. With OneUptime, you can correlate speed test metrics with broader infrastructure health to identify and resolve issues before they impact users.
