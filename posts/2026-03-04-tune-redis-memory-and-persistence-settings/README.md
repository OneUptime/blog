# How to Tune Redis Memory and Persistence Settings on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redis, Caching, Linux

Description: Learn how to tune Redis Memory and Persistence Settings on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Tune Redis Memory and Persistence Settings on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Tune Redis Memory and Persistence Settings requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Redis is available from RHEL repositories, so EPEL and build tools are not required for the packaged service.

## Step 2: Install Required Packages

```bash
sudo dnf install -y redis
```

Verify the installation:

```bash
rpm -qi redis
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/redis/redis.conf
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware. For a cache-oriented Redis instance, set a memory limit, choose an eviction policy, and configure persistence explicitly:

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru

appendonly yes
appendfsync everysec

save 900 1
save 300 10
save 60 10000
```

Set `maxmemory` below the total RAM available to Redis so the operating system, Redis overhead, replication buffers, and AOF buffers have headroom.

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now redis
sudo systemctl status redis
```

## Step 5: Verify the Configuration

Test the setup:

```bash
redis-cli PING
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli CONFIG GET save
redis-cli INFO memory
redis-cli INFO persistence
```

Check the logs for any errors:

```bash
journalctl -u redis -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=6379/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show redis --property=MemoryCurrent
top -p $(pidof redis-server)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u redis -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp 'sport = :6379'` to identify processes using the port

## Conclusion

You have successfully configured tune redis memory and persistence settings on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
