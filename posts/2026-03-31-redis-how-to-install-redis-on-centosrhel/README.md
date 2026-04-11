# How to Install Redis on CentOS/RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CentOS, RHEL, Linux, Installation

Description: Step-by-step guide to installing Redis on CentOS 7, CentOS 8, and RHEL 8/9 using package managers and compiling from source for the latest version.

---

## Supported Versions

This guide covers:
- CentOS 7 / RHEL 7
- CentOS 8 / RHEL 8 (AlmaLinux, Rocky Linux)
- RHEL 9 / CentOS Stream 9

## Method 1: Install from Remi Repository (Recommended)

The Remi repository provides up-to-date Redis packages for CentOS/RHEL without compiling from source.

For CentOS 7 / RHEL 7:

```bash
# Install EPEL repository
sudo yum install -y epel-release

# Install Remi repository
sudo yum install -y https://rpms.remirepo.net/enterprise/remi-release-7.rpm

# Install Redis 7
sudo yum install -y --enablerepo=remi redis7

# Verify installation
redis-server --version
```

For CentOS 8 / RHEL 8 / AlmaLinux / Rocky Linux:

```bash
# Install EPEL
sudo dnf install -y epel-release

# Install Remi repository
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# Enable Redis 7 module from Remi
sudo dnf module enable -y redis:remi-7.2

# Install Redis
sudo dnf install -y redis

# Verify
redis-server --version
```

For RHEL 9 / CentOS Stream 9:

```bash
# Install EPEL
sudo dnf install -y epel-release

# Install Remi
sudo dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm

# Install Redis 7
sudo dnf install -y --enablerepo=remi redis7

redis-server --version
```

## Method 2: Install from Default RHEL AppStream

RHEL 8+ includes Redis in the AppStream repository (typically an older version):

```bash
# Check available Redis modules
sudo dnf module list redis

# Enable and install
sudo dnf module enable -y redis:6
sudo dnf install -y redis

redis-server --version
```

## Method 3: Compile from Source (Latest Version)

For the absolute latest Redis version:

```bash
# Install build dependencies
sudo yum install -y gcc make tcl

# Download Redis source
curl -O https://download.redis.io/redis-stable.tar.gz
tar xzf redis-stable.tar.gz
cd redis-stable

# Compile and install
make
sudo make install

# Verify
redis-server --version
```

## Configuring Redis as a System Service

After installation, configure Redis for production use:

```bash
# Copy default configuration
sudo cp /etc/redis.conf /etc/redis/redis.conf

# Or for source install, create configuration directory
sudo mkdir -p /etc/redis
sudo cp redis.conf /etc/redis/redis.conf
```

Edit /etc/redis/redis.conf for production settings:

```text
# Bind to localhost only (recommended for security)
bind 127.0.0.1

# Set a strong password
requirepass your_strong_password_here

# Enable AOF persistence
appendonly yes
appendfsync everysec

# Set max memory (adjust to your system)
maxmemory 2gb
maxmemory-policy allkeys-lru

# Disable saving to RDB for pure cache use
# save ""

# Log level and file
loglevel notice
logfile /var/log/redis/redis-server.log

# PID file
pidfile /var/run/redis_6379.pid
```

## Enabling and Starting Redis Service

```bash
# Enable Redis to start on boot
sudo systemctl enable redis

# Start Redis
sudo systemctl start redis

# Check status
sudo systemctl status redis
```

Expected output:

```text
redis.service - Redis persistent key-value database
   Loaded: loaded (/usr/lib/systemd/system/redis.service; enabled)
   Active: active (running) since Mon 2024-04-01 12:00:00 UTC; 5s ago
```

## Firewall Configuration

Open Redis port if needed (only expose Redis to trusted networks):

```bash
# Allow Redis port through firewalld
sudo firewall-cmd --zone=public --add-port=6379/tcp --permanent
sudo firewall-cmd --reload

# Or restrict to a specific source IP
sudo firewall-cmd --zone=public \
  --add-rich-rule='rule family=ipv4 source address=10.0.0.0/8 port port=6379 protocol=tcp accept' \
  --permanent
sudo firewall-cmd --reload
```

## SELinux Configuration

RHEL/CentOS enforces SELinux by default. Redis needs proper context:

```bash
# Check if SELinux is enforcing
getenforce

# Allow Redis to bind to its port
sudo setsebool -P redis_enable_notify 1

# If using a custom port, add the SELinux context for it
sudo semanage port -a -t redis_port_t -p tcp 6380

# For custom data directories
sudo semanage fcontext -a -t redis_var_lib_t "/var/lib/redis(/.*)?"
sudo restorecon -Rv /var/lib/redis
```

## Verifying the Installation

```bash
# Connect with redis-cli
redis-cli -a your_strong_password_here ping

# Check Redis info
redis-cli -a your_strong_password_here INFO server | head -20

# Run a basic smoke test
redis-cli -a your_strong_password_here SET test "hello"
redis-cli -a your_strong_password_here GET test
# Output: "hello"
```

## Creating a Redis User and Data Directory

For production, run Redis as a dedicated system user:

```bash
# Create redis user (may already exist)
sudo useradd -r -s /bin/false redis

# Create data directory
sudo mkdir -p /var/lib/redis
sudo chown redis:redis /var/lib/redis
sudo chmod 750 /var/lib/redis

# Create log directory
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis
```

## Summary

Installing Redis on CentOS/RHEL is best done through the Remi repository, which provides current versions and integrates with systemd cleanly. Configure /etc/redis/redis.conf with a strong password, memory limits, and AOF persistence before starting the service. On RHEL systems with SELinux in enforcing mode, add the redis_port_t context for custom ports and ensure file contexts are correct for custom data directories. Always restrict network access via firewalld to trusted sources only.
