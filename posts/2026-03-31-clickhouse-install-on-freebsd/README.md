# How to Install ClickHouse on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, FreeBSD, BSD, Installation, Port

Description: Install ClickHouse on FreeBSD using the ports collection or binary packages, with rc.d service configuration and BSD-specific performance tuning.

---

FreeBSD is used in many production environments for its stability and advanced ZFS filesystem support. ClickHouse can run on FreeBSD through the ports collection, binary packages, or the official Linux binary via the Linux compatibility layer.

## Option 1: Install via pkg (Binary Packages)

```bash
# Update package repository
pkg update

# Search for ClickHouse
pkg search clickhouse

# Install if available
pkg install databases/clickhouse
```

Availability may vary by FreeBSD version. Check the current ports tree for the latest status.

## Option 2: Build from Ports

```bash
# Fetch the ports tree via git (portsnap was removed from the base system in FreeBSD 14)
pkg install -y git
git clone https://git.FreeBSD.org/ports.git /usr/ports

# Build and install ClickHouse
cd /usr/ports/databases/clickhouse
make install clean
```

This compiles ClickHouse from source with FreeBSD-specific patches. It takes considerable time but produces a native binary.

## Option 3: Linux Compatibility Layer

If native ports are unavailable or outdated, use the Linux compatibility layer to run the official Linux binary:

```bash
# Enable Linux compatibility
kldload linux64
sysrc linux_enable="YES"

# Install Linux base packages (Rocky Linux 9 — the current default; linux_base-c7 is deprecated)
pkg install linux_base-rl9

# Download Linux ClickHouse binary
fetch https://builds.clickhouse.com/master/amd64/clickhouse
chmod +x clickhouse
brandelf -t Linux clickhouse
```

## rc.d Service Configuration

FreeBSD uses rc.d instead of systemd. Create a service script:

```bash
cat > /usr/local/etc/rc.d/clickhouse << 'EOF'
#!/bin/sh

# PROVIDE: clickhouse
# REQUIRE: NETWORKING
# KEYWORD: shutdown

. /etc/rc.subr

name="clickhouse"
rcvar="clickhouse_enable"
clickhouse_user="clickhouse"
clickhouse_group="clickhouse"
command="/usr/local/bin/clickhouse-server"
command_args="--config-file=/usr/local/etc/clickhouse-server/config.xml --pid-file=/var/run/clickhouse/clickhouse-server.pid --daemon"

load_rc_config $name
run_rc_command "$1"
EOF
chmod +x /usr/local/etc/rc.d/clickhouse
```

Enable and start the service:

```bash
sysrc clickhouse_enable="YES"
service clickhouse start
```

## ZFS Tuning for ClickHouse

FreeBSD's ZFS pairs excellently with ClickHouse:

```bash
# Create a dedicated ZFS dataset
zfs create -o mountpoint=/var/lib/clickhouse \
  -o compression=lz4 \
  -o atime=off \
  -o recordsize=1M \
  zpool/clickhouse

chown clickhouse:clickhouse /var/lib/clickhouse
```

The `recordsize=1M` setting aligns well with ClickHouse's large sequential reads.

## Kernel Tuning

```bash
# Increase file descriptors
cat >> /etc/sysctl.conf << 'EOF'
kern.maxfiles=262144
kern.maxfilesperproc=262144
net.inet.tcp.sendbuf_max=16777216
net.inet.tcp.recvbuf_max=16777216
EOF
sysctl -f /etc/sysctl.conf
```

## Firewall (pf)

```text
# /etc/pf.conf
# Allow ClickHouse from internal network only
pass in on em1 proto tcp from 10.0.0.0/8 to any port {8123, 9000}
block in on em0 proto tcp to any port {8123, 9000}
```

## Summary

Installing ClickHouse on FreeBSD works via the ports collection for a native build or through the Linux compatibility layer for the official binary. FreeBSD's ZFS with `lz4` compression and 1M recordsize pairs well with ClickHouse's columnar storage patterns. Use rc.d for service management and pf for network access control.
