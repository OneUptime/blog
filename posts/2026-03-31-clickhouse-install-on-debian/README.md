# How to Install ClickHouse on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Debian, Linux, Installation, Configuration

Description: Install and configure ClickHouse on Debian Linux using the official APT repository, with post-install tuning and service management steps.

---

Installing ClickHouse on Debian is straightforward using ClickHouse's official APT repository. This guide covers installation, initial configuration, and OS-level tuning for Debian 11 (Bullseye) and Debian 12 (Bookworm).

## Adding the ClickHouse APT Repository

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

# Install the keyring
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg

# Add the stable repository
ARCH=$(dpkg --print-architecture)
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] \
  https://packages.clickhouse.com/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/clickhouse.list
```

## Installing ClickHouse

```bash
sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client

# Set the default password when prompted, or leave blank for passwordless access
```

## Starting and Enabling the Service

```bash
sudo systemctl enable clickhouse-server
sudo systemctl start clickhouse-server
sudo systemctl status clickhouse-server
```

Verify the installation:

```bash
clickhouse-client --query "SELECT version()"
```

## Installing a Specific Version

To pin a specific ClickHouse version:

```bash
sudo apt-get install -y clickhouse-server=24.3.1.2672 clickhouse-client=24.3.1.2672
```

Hold the package to prevent automatic upgrades:

```bash
sudo apt-mark hold clickhouse-server clickhouse-client
```

## Post-Install Configuration

Set a password for the default user in `/etc/clickhouse-server/users.d/default-password.xml`:

```xml
<clickhouse>
  <users>
    <default>
      <password_sha256_hex>your_sha256_hash</password_sha256_hex>
    </default>
  </users>
</clickhouse>
```

Generate the hash:

```bash
echo -n 'your_password' | sha256sum | awk '{print $1}'
```

## OS Tuning on Debian

```bash
# Increase file descriptor limits
cat >> /etc/security/limits.d/clickhouse.conf << 'EOF'
clickhouse soft nofile 262144
clickhouse hard nofile 262144
EOF

# Disable transparent huge pages
cat > /etc/systemd/system/disable-thp.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages
[Service]
Type=oneshot
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/enabled"
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now disable-thp
```

## Data Directory

ClickHouse stores data in `/var/lib/clickhouse` by default. Mount a dedicated disk here before starting the service for production use.

## Summary

Installing ClickHouse on Debian uses the official APT repository, a simple `apt-get install`, and `systemctl` for service management. After installation, set a password for the default user, configure OS-level file descriptor limits, and disable transparent huge pages to ensure optimal performance.
