# How to Optimize System Performance Using the RHEL Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Web Console, Cockpit, Performance, Monitoring, Linux

Description: Learn how to use the RHEL Web Console (Cockpit) to monitor and optimize system performance through a browser-based interface.

---

The RHEL Web Console (powered by Cockpit) provides a browser-based interface for monitoring system performance, managing services, and applying performance tuning profiles. This is especially useful for administrators who prefer a graphical interface.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access
- Network access to the server

## Installing the Web Console

The Web Console is included by default on RHEL. If not installed:

```bash
sudo dnf install cockpit -y
```

Enable and start the service:

```bash
sudo systemctl enable --now cockpit.socket
```

## Accessing the Web Console

Open a browser and navigate to:

```bash
https://your-server-ip:9090
```

Log in with your system credentials. Check the "Reuse my password for privileged tasks" option for full administrative access.

## Monitoring System Performance

### Overview Dashboard

The main page shows:

- CPU usage graph
- Memory usage graph
- Disk I/O graph
- Network traffic graph

These update in real time and provide a quick health check.

### Detailed Performance Metrics

Click on the performance graphs to see detailed views:

- **CPU** - Per-core utilization, load average
- **Memory** - Used, cached, swap usage
- **Disk** - Read/write throughput, IOPS
- **Network** - Bandwidth per interface

## Managing TuneD Profiles

Navigate to the **Overview** page and find the **Performance profile** section.

Click on the current profile to see available profiles:

- balanced
- throughput-performance
- latency-performance
- virtual-guest
- powersave

Select a profile and click **Change Profile** to apply it immediately.

## Monitoring Running Processes

The Web Console does not have a built-in process manager, but you can use the integrated terminal:

1. Click **Terminal** in the navigation menu
2. Run standard monitoring commands:

```bash
top
htop
ps aux --sort=-%cpu | head -20
```

## Managing Services

Navigate to **Services** to:

- View all systemd services and their status
- Start, stop, restart, or enable services
- View service logs
- Check for failed services

This is useful for managing performance-related services like tuned, pmcd, and sysstat.

## Managing Storage

Navigate to **Storage** to:

- View disk usage and partition layout
- Create and manage logical volumes
- Monitor disk I/O in real time
- Configure NFS mounts
- View RAID status

## Viewing System Logs

Navigate to **Logs** to:

- Search system logs with filters
- Filter by severity (error, warning, info)
- Filter by time range
- View logs from specific services

Look for performance-related warnings about OOM killer events, disk errors, or service failures.

## Managing Network Configuration

Navigate to **Networking** to:

- View network interface status
- Monitor bandwidth usage
- Configure IP addresses, bonding, and VLANs
- Manage firewall rules

## Installing Additional Cockpit Modules

Extend the Web Console with additional modules:

```bash
# PCP integration for detailed performance charts
sudo dnf install cockpit-pcp -y

# Package management
sudo dnf install cockpit-packagekit -y
```

Restart the cockpit service after installing modules:

```bash
sudo systemctl restart cockpit.socket
```

## Enabling PCP Charts in the Web Console

After installing cockpit-pcp, the performance graphs use PCP for data collection, providing more detailed metrics and historical data.

Enable PCP services:

```bash
sudo systemctl enable --now pmcd
sudo systemctl enable --now pmlogger
```

Refresh the Web Console to see enhanced performance charts.

## Conclusion

The RHEL Web Console provides a convenient browser-based interface for performance monitoring and tuning. Use it for quick health checks, profile switching, and service management. For detailed analysis, combine it with command-line tools like sar, perf, and PCP.
