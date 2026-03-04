# How to Configure PHP Session Handling with Redis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PHP, Redis, Sessions, Performance, Linux

Description: Store PHP sessions in Redis on RHEL for faster session access and to enable session sharing across multiple web servers in a load-balanced environment.

---

By default, PHP stores sessions as files on disk. Using Redis as the session handler provides faster access and enables session sharing across multiple application servers.

## Install Redis

```bash
# Install Redis server and PHP Redis extension
sudo dnf install -y redis php-pecl-redis

# Start and enable Redis
sudo systemctl enable --now redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Configure Redis for Sessions

```bash
# Secure Redis - bind to localhost only
sudo sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf

# Set a password
sudo sed -i 's/^# requirepass .*/requirepass YourRedisPassword123/' /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis

# Test authentication
redis-cli -a YourRedisPassword123 ping
```

## Configure PHP to Use Redis for Sessions

```bash
# Create a PHP configuration file for Redis sessions
sudo tee /etc/php.d/90-redis-session.ini << 'INI'
; Use Redis as the session handler
session.save_handler = redis

; Redis connection string with authentication
session.save_path = "tcp://127.0.0.1:6379?auth=YourRedisPassword123&database=0"

; Session lifetime in seconds (default: 1440 = 24 minutes)
session.gc_maxlifetime = 1440

; Prefix for session keys in Redis
; Helps distinguish sessions from other Redis data
redis.session.lock_expire = 30
redis.session.lock_wait_time = 50000
redis.session.lock_retries = 2000
INI

# Restart PHP-FPM
sudo systemctl restart php-fpm
```

## Test the Configuration

Create a test script:

```php
<?php
// /var/www/html/session-test.php
session_start();

if (!isset($_SESSION['count'])) {
    $_SESSION['count'] = 0;
}
$_SESSION['count']++;

echo "Session ID: " . session_id() . "\n";
echo "Visit count: " . $_SESSION['count'] . "\n";
echo "Handler: " . ini_get('session.save_handler') . "\n";
```

Verify sessions are stored in Redis:

```bash
# Test the session
curl -c cookies.txt -b cookies.txt http://localhost/session-test.php
curl -c cookies.txt -b cookies.txt http://localhost/session-test.php

# Check Redis for session keys
redis-cli -a YourRedisPassword123 keys "PHPREDIS_SESSION:*"

# Inspect a session value
redis-cli -a YourRedisPassword123 get "PHPREDIS_SESSION:<session_id>"
```

## Multi-Server Setup

For load-balanced environments, point all servers to the same Redis instance:

```ini
; On each web server, point to the central Redis server
session.save_path = "tcp://redis-server.internal:6379?auth=YourRedisPassword123&database=0"
```

On the Redis server, bind to the internal network:

```bash
# Allow connections from the internal network
sudo sed -i 's/^bind .*/bind 127.0.0.1 10.0.0.50/' /etc/redis/redis.conf
sudo systemctl restart redis

# Open the Redis port in the firewall for internal hosts
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="6379" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## SELinux Configuration

```bash
# Allow httpd to connect to Redis
sudo setsebool -P httpd_can_network_connect 1
```

Remove the test script after verification. Redis-backed sessions provide both speed and scalability for PHP applications.
