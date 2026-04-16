# How to Install ClickHouse on CentOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CentOS, Linux, Installation, RPM

Description: Install ClickHouse on CentOS 7 and CentOS Stream 8/9 using the official RPM repository, with SELinux configuration and systemd service setup.

---

Installing ClickHouse on CentOS uses the official RPM repository. This guide covers CentOS 7, CentOS Stream 8, and CentOS Stream 9, along with SELinux configuration that is commonly overlooked.

## Adding the ClickHouse RPM Repository

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
```

For CentOS 8 and newer using `dnf`:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
```

## Installing ClickHouse

On CentOS 7:

```bash
sudo yum install -y clickhouse-server clickhouse-client
```

On CentOS Stream 8/9:

```bash
sudo dnf install -y clickhouse-server clickhouse-client
```

## Starting the Service

```bash
sudo systemctl enable clickhouse-server
sudo systemctl start clickhouse-server
```

Verify the installation:

```bash
clickhouse-client --query "SELECT version()"
```

## SELinux Configuration

CentOS has SELinux enabled by default, which can block ClickHouse from binding to ports and accessing its data directory. Configure the appropriate policies:

```bash
# Check current SELinux status
getenforce

# Option 1: Set permissive mode (for testing only)
sudo setenforce 0

# Option 2: Create proper SELinux policy (recommended for production)

# Allow ClickHouse to use port 8123 (port 9000 is already in http_port_t by default)
sudo semanage port -a -t http_port_t -p tcp 8123

# Fix context on data directory
sudo semanage fcontext -a -t var_lib_t "/var/lib/clickhouse(/.*)?"
sudo restorecon -Rv /var/lib/clickhouse
```

## Firewalld Configuration

```bash
sudo firewall-cmd --permanent --add-port=8123/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

For production, use rich rules to restrict to specific source IPs:

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" port port="8123" protocol="tcp" accept'
```

## Post-Install OS Tuning

```bash
# Increase file descriptor limits
cat > /etc/security/limits.d/clickhouse.conf << 'EOF'
clickhouse soft nofile 262144
clickhouse hard nofile 262144
EOF

# Disable transparent huge pages persistently
echo 'never' > /sys/kernel/mm/transparent_hugepage/enabled
cat > /etc/rc.d/rc.local << 'EOF'
#!/bin/bash
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag
EOF
chmod +x /etc/rc.d/rc.local
sudo systemctl enable rc-local
```

## Installing a Specific Version

```bash
# List available versions
yum --showduplicates list clickhouse-server

# Install a specific version
sudo yum install -y clickhouse-server-24.3.1.2672 clickhouse-client-24.3.1.2672
```

## Summary

Installing ClickHouse on CentOS requires adding the official RPM repository, running `yum install` or `dnf install`, and handling SELinux policies to allow port binding and data directory access. Configure firewalld to restrict port access, set file descriptor limits, and disable transparent huge pages for production deployments.
