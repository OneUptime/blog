# How to Install Redis from Source on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Installation, Linux, Source Build, Configuration

Description: Build and install Redis from source on Linux to get the latest version or a specific release, with compilation, installation, and basic configuration steps.

---

Installing Redis from source lets you run any specific version, apply custom patches, or enable optional features like TLS that some package managers omit. The build process is straightforward since Redis has minimal dependencies.

## Install Build Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential pkg-config

# Optional: TLS support
sudo apt-get install -y libssl-dev

# RHEL/CentOS/Amazon Linux
sudo yum groupinstall -y "Development Tools"
sudo yum install -y openssl-devel
```

## Download and Build

```bash
# Download the latest stable release (check redis.io for current version)
wget https://download.redis.io/releases/redis-7.2.4.tar.gz
tar xzf redis-7.2.4.tar.gz
cd redis-7.2.4

# Build (uses all available CPU cores)
make -j$(nproc)

# Run the included test suite
make test

# Install to /usr/local/bin
sudo make install
```

## Verify the Build

```bash
redis-server --version
# Redis server v=7.2.4 sha=00000000:0 malloc=jemalloc bits=64 build=...

redis-cli --version
# redis-cli 7.2.4
```

## Create a System User and Directories

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin redis

sudo mkdir -p /etc/redis /var/lib/redis /var/log/redis
sudo chown redis:redis /var/lib/redis /var/log/redis
sudo chmod 750 /var/lib/redis
```

## Create the Configuration File

Copy the sample config included in the source:

```bash
sudo cp ~/redis-7.2.4/redis.conf /etc/redis/redis.conf
```

Then edit key settings:

```bash
sudo nano /etc/redis/redis.conf
```

Recommended changes:

```text
supervised systemd
daemonize no
bind 127.0.0.1
port 6379
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
loglevel notice
```

## Create a systemd Service

```bash
sudo tee /etc/systemd/system/redis.service > /dev/null <<'EOF'
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/local/bin/redis-cli shutdown
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable redis
sudo systemctl start redis
```

## Verify Redis is Running

```bash
sudo systemctl status redis

redis-cli ping
# PONG

redis-cli info server | grep redis_version
# redis_version:7.2.4
```

## Building with TLS Support

```bash
# Build with TLS enabled
make BUILD_TLS=yes -j$(nproc)
sudo make install
```

Then configure TLS in `redis.conf`:

```text
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

## Summary

Building Redis from source takes a few minutes and gives you precise version control and optional feature support. Compile with `make -j$(nproc)`, create a dedicated `redis` system user, place the config in `/etc/redis/`, and register a systemd service for automatic startup. Use `make BUILD_TLS=yes` if your deployment requires TLS connections.
