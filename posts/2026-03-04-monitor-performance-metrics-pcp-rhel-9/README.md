# How to Monitor Performance Metrics with PCP (Performance Co-Pilot) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PCP, Performance, Monitoring, Metrics, Linux

Description: Learn how to install and use PCP (Performance Co-Pilot) on RHEL to collect, monitor, and analyze system performance metrics.

---

PCP (Performance Co-Pilot) is a framework for collecting, monitoring, and analyzing system performance metrics. RHEL includes PCP with support for hundreds of performance metrics from the kernel, hardware, and applications.

## Prerequisites

- A RHEL system with an active subscription
- Root or sudo access

## Installing PCP

Install the core PCP packages:

```bash
sudo dnf install pcp pcp-system-tools pcp-gui -y
```

Enable and start the PCP collector daemon:

```bash
sudo systemctl enable --now pmcd
sudo systemctl enable --now pmlogger
```

## Verifying the Installation

Check that PCP is running:

```bash
pcp
```

This shows the PCP version, hostname, and available metric domains.

## Listing Available Metrics

List all available metrics:

```bash
pminfo
```

List metrics matching a pattern:

```bash
pminfo -t disk.dev
```

The `-t` flag shows a brief description of each metric.

Get detailed information about a metric:

```bash
pminfo -dfT kernel.all.load
```

## Querying Metrics with pmval

View a metric value:

```bash
pmval kernel.all.load
```

Sample a metric every 2 seconds for 5 samples:

```bash
pmval -s 5 -t 2 kernel.percpu.util.user
```

## Real-Time Monitoring with pmstat

View a system summary similar to vmstat:

```bash
pmstat
```

Sample every 5 seconds:

```bash
pmstat -t 5sec
```

## Using pcp dstat

The `pcp dstat` command provides a versatile real-time display:

```bash
pcp dstat
```

Show CPU, disk, and network metrics:

```bash
pcp dstat --cpu --disk --net
```

Show top CPU and memory consumers:

```bash
pcp dstat --top-cpu --top-mem
```

## Monitoring with pmrep

Generate custom metric reports:

```bash
pmrep kernel.all.load kernel.all.cpu.idle -t 2sec -s 10
```

Use a predefined report:

```bash
pmrep :sar-u
```

## Logging Metrics with pmlogger

PCP automatically logs metrics. View the log archive location:

```bash
ls /var/log/pcp/pmlogger/$(hostname)/
```

Replay archived data:

```bash
pmval -a /var/log/pcp/pmlogger/$(hostname)/$(date +%Y%m%d).0 kernel.all.load
```

Create a custom logging configuration:

```bash
sudo tee /etc/pcp/pmlogger/config.d/custom.config << 'CONF'
log mandatory on 5sec {
    kernel.all.load
    kernel.all.cpu.user
    kernel.all.cpu.sys
    mem.util.used
    mem.util.free
    disk.all.total
    network.interface.total.bytes
}
CONF
```

Restart pmlogger to apply:

```bash
sudo systemctl restart pmlogger
```

## Setting Up Web-Based Monitoring

Install the PCP web components:

```bash
sudo dnf install pcp-webapp-grafana grafana pcp-pmda-redis -y
```

Enable the services:

```bash
sudo systemctl enable --now grafana-server
sudo systemctl enable --now pmproxy
```

Access Grafana at `http://your-server:3000` and add the PCP data source.

## Monitoring Remote Hosts

Query metrics from a remote host:

```bash
pmval -h remote-host kernel.all.load
```

The remote host must have `pmcd` running and its firewall must allow port 44321.

## Conclusion

PCP on RHEL provides a comprehensive performance monitoring framework. Use pmval and pmrep for quick checks, pmlogger for historical data, and Grafana integration for dashboards. PCP's metric collection has minimal overhead, making it suitable for production use.
