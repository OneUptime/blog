# How to Run NTP Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NTP, Time Synchronization, Chrony, Networking, Infrastructure

Description: Deploy an NTP time synchronization server in Docker using Chrony to keep all your servers and network devices in sync.

---

Accurate time synchronization is one of those things you never think about until it breaks. When server clocks drift, log correlation becomes impossible, TLS certificates fail validation, distributed databases produce inconsistent results, and Kerberos authentication stops working. NTP (Network Time Protocol) solves this by keeping all machines on your network synchronized to a common time reference.

Running your own NTP server in Docker gives you a local time source that your infrastructure can rely on. Instead of every machine reaching out to public NTP pools independently, they sync against your local server, which in turn syncs with upstream sources. This reduces external dependencies and provides consistent, low-latency time synchronization across your network.

## Why Run a Local NTP Server?

Public NTP pools work fine for individual machines, but relying on them for your entire infrastructure introduces several risks. Internet connectivity issues can prevent time sync. Firewall rules might block NTP traffic to external servers. The round-trip latency to public pools varies, reducing accuracy. And if you run services that require microsecond-level precision (like financial trading systems or distributed databases), a local NTP server is essential.

## Chrony vs ntpd

Two NTP implementations dominate the Linux world: the classic ntpd and the newer Chrony. Chrony is the better choice for modern deployments. It synchronizes faster after restarts, handles intermittent network connections gracefully, and achieves better accuracy on virtual machines where the system clock can jump unpredictably. Most major Linux distributions have already switched to Chrony as their default.

## Quick Start

Run a Chrony-based NTP server with a single command.

```bash
# Start a Chrony NTP server that syncs with public pools
# UDP port 123 is the standard NTP port
docker run -d \
  --name ntp-server \
  -p 123:123/udp \
  --cap-add SYS_TIME \
  cturra/ntp:latest
```

The `SYS_TIME` capability allows the container to adjust the system clock, which Chrony needs for accurate timekeeping.

## Docker Compose Setup

A production-ready NTP server needs custom configuration and persistent state.

```yaml
# docker-compose.yml - Local NTP server using Chrony
# Provides time synchronization for your entire network
version: "3.8"

services:
  ntp:
    image: cturra/ntp:latest
    container_name: ntp-server
    restart: unless-stopped
    ports:
      - "123:123/udp"
    cap_add:
      - SYS_TIME          # Required for clock discipline
    environment:
      - NTP_SERVERS=time.cloudflare.com,time.google.com,pool.ntp.org
      - LOG_LEVEL=0
    volumes:
      - ./chrony.conf:/etc/chrony/chrony.conf:ro
    tmpfs:
      - /run/chrony        # Chrony runtime data
      - /var/lib/chrony    # Drift file storage
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 64M
```

## Custom Chrony Configuration

Create a chrony.conf file for fine-grained control over time synchronization behavior.

```bash
# chrony.conf - NTP server configuration
# Syncs with multiple upstream sources and serves time to local clients

# Upstream NTP servers to sync against
# Use 'iburst' for fast initial synchronization
# Use 'prefer' for your most trusted source
server time.cloudflare.com iburst prefer
server time.google.com iburst
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 2.pool.ntp.org iburst

# Allow NTP clients from your local networks
# Adjust these subnets to match your environment
allow 10.0.0.0/8
allow 172.16.0.0/12
allow 192.168.0.0/16

# Deny all other clients by default
deny all

# Serve time even when not synchronized to an upstream source
# This prevents clients from losing their time reference during outages
local stratum 10

# Record the rate at which the system clock gains/loses time
# This file persists across restarts for faster convergence
driftfile /var/lib/chrony/chrony.drift

# Enable kernel synchronization of the hardware clock
rtcsync

# Step the system clock if the offset is larger than 1 second
# during the first three updates (handles VM clock jumps)
makestep 1.0 3

# Log timing statistics for troubleshooting
log tracking measurements statistics
logdir /var/log/chrony

# Maximum distance between the source and the local clock
# to still consider the source usable
maxdistance 16.0

# Minimum number of selectable sources to update the clock
minsources 2

# Key file for NTP authentication (optional)
# keyfile /etc/chrony/chrony.keys
```

## Building a Custom NTP Image

If you want full control over the NTP server build, create your own image.

```dockerfile
# Dockerfile - Custom Chrony NTP server
# Minimal Alpine-based image with Chrony and monitoring tools
FROM alpine:3.19

# Install Chrony and useful network tools
RUN apk add --no-cache chrony tzdata

# Create necessary directories
RUN mkdir -p /var/log/chrony /var/lib/chrony /run/chrony

# Copy the custom configuration
COPY chrony.conf /etc/chrony/chrony.conf

# Expose the NTP port
EXPOSE 123/udp

# Health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Run Chrony in the foreground
# -d keeps it in the foreground
# -s sets the system clock from the hardware clock on startup
ENTRYPOINT ["chronyd", "-d", "-s"]
```

Create a health check script for the NTP server.

```bash
#!/bin/sh
# healthcheck.sh - Verify Chrony is running and synchronized
# Returns 0 if healthy, 1 if not

# Check if chronyd process is running
if ! pgrep -x chronyd > /dev/null; then
    echo "chronyd is not running"
    exit 1
fi

# Check if Chrony has at least one reachable source
SOURCES=$(chronyc -n sources 2>/dev/null | grep -c '^\^')
if [ "$SOURCES" -lt 1 ]; then
    echo "No reachable NTP sources"
    exit 1
fi

echo "NTP server healthy with $SOURCES sources"
exit 0
```

## Verifying Time Synchronization

After starting the NTP server, verify it is synchronizing correctly.

```bash
# Check the synchronization status inside the container
docker exec ntp-server chronyc tracking

# Output shows:
# Reference ID    : A29FC87B (time.cloudflare.com)
# Stratum         : 3
# Ref time (UTC)  : Sat Feb 08 12:00:00 2026
# System time     : 0.000000123 seconds fast of NTP time
# Last offset     : +0.000000456 seconds
# RMS offset      : 0.000001234 seconds

# List all configured NTP sources and their status
docker exec ntp-server chronyc sources -v

# Show detailed statistics for each source
docker exec ntp-server chronyc sourcestats

# Check which clients are connecting to the server
docker exec ntp-server chronyc clients
```

## Configuring Clients

Point your servers and network devices to use the local NTP server.

### Linux Clients (Chrony)

```bash
# On each Linux client, edit /etc/chrony/chrony.conf
# Replace existing pool/server lines with your local NTP server
server 192.168.1.5 iburst prefer

# Restart Chrony on the client
systemctl restart chronyd

# Verify the client is syncing with your server
chronyc sources
```

### Linux Clients (systemd-timesyncd)

```bash
# For systems using systemd-timesyncd, edit /etc/systemd/timesyncd.conf
# [Time]
# NTP=192.168.1.5
# FallbackNTP=time.cloudflare.com

systemctl restart systemd-timesyncd
timedatectl timesync-status
```

### Network Devices

```bash
# Cisco IOS
# ntp server 192.168.1.5

# Juniper JunOS
# set system ntp server 192.168.1.5

# Arista EOS
# ntp server 192.168.1.5
```

### Docker Containers

Docker containers inherit the host's time by default. Make sure the Docker host itself syncs with your NTP server, and all containers will have accurate time.

## Running Multiple NTP Servers

For high availability, run two or more NTP servers and configure clients to use all of them.

```yaml
# docker-compose.yml - Redundant NTP server pair
version: "3.8"

services:
  ntp-primary:
    image: cturra/ntp:latest
    container_name: ntp-primary
    restart: unless-stopped
    ports:
      - "123:123/udp"
    cap_add:
      - SYS_TIME
    volumes:
      - ./chrony-primary.conf:/etc/chrony/chrony.conf:ro

  ntp-secondary:
    image: cturra/ntp:latest
    container_name: ntp-secondary
    restart: unless-stopped
    ports:
      - "124:123/udp"    # Map to a different host port
    cap_add:
      - SYS_TIME
    volumes:
      - ./chrony-secondary.conf:/etc/chrony/chrony.conf:ro
```

## Monitoring NTP Health

Track NTP accuracy and availability with regular checks.

```bash
# Script to monitor NTP offset and alert if drift exceeds threshold
#!/bin/bash
# check_ntp_offset.sh - Monitor clock offset

OFFSET=$(docker exec ntp-server chronyc tracking 2>/dev/null | grep "System time" | awk '{print $4}')

# Convert to milliseconds for easier comparison
OFFSET_MS=$(echo "$OFFSET * 1000" | bc 2>/dev/null)

echo "Current NTP offset: ${OFFSET_MS}ms"

# Alert if offset exceeds 100ms
if [ "$(echo "$OFFSET > 0.1" | bc 2>/dev/null)" -eq 1 ]; then
    echo "WARNING: NTP offset exceeds 100ms threshold"
    # Send alert via your monitoring system
fi
```

```yaml
    # Docker health check for the NTP server
    healthcheck:
      test: ["CMD", "/usr/local/bin/healthcheck.sh"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 30s
```

## Security Considerations

NTP can be abused for amplification DDoS attacks. Protect your server with these measures. Restrict the `allow` directive in chrony.conf to only your local networks. Never expose your NTP server to the public internet unless you intend to run a public time source. Disable the NTP monlist command (Chrony does not support it, so this is only a concern with ntpd). Use NTP authentication with symmetric keys for trusted peers. Monitor for unusual traffic volumes on port 123.

## Production Tips

For production NTP deployments, use at least four upstream servers for accurate time selection. Chrony's algorithm needs multiple sources to detect and exclude faulty clocks. Place NTP servers close to the clients they serve, ideally on the same network segment. Monitor the stratum level and offset metrics with tools like OneUptime to catch synchronization problems before they affect your services. Keep the drift file persistent across container restarts so Chrony can converge faster. On virtual machines, configure the hypervisor not to sync the VM clock, as this interferes with Chrony's discipline.

An NTP server in Docker is a small investment that prevents a whole category of hard-to-diagnose problems. Consistent time across your infrastructure makes log analysis reliable, keeps authentication protocols happy, and ensures your distributed systems operate correctly.
