# How to Build a RHEL 9 Server Monitoring Checklist for Production Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Monitoring, Best Practices

Description: Step-by-step guide on build a rhel 9 server monitoring checklist for production environments with practical examples and commands.

---

A monitoring checklist ensures you have visibility into RHEL 9 server health and can detect problems before they impact users.

## System Resources

- [ ] Monitor CPU usage and load average
- [ ] Track memory utilization and swap usage
- [ ] Monitor disk space on all mount points
- [ ] Track disk I/O latency and throughput
- [ ] Monitor network bandwidth and errors

## Process Monitoring

- [ ] Track critical service status (httpd, sshd, etc.)
- [ ] Monitor process count and zombie processes
- [ ] Alert on unexpected process termination
- [ ] Track process resource consumption

## Log Monitoring

- [ ] Monitor /var/log/messages for errors
- [ ] Track /var/log/secure for authentication failures
- [ ] Monitor application-specific logs
- [ ] Alert on log patterns indicating problems

## Network Monitoring

- [ ] Monitor open connections count
- [ ] Track connection states (TIME_WAIT, CLOSE_WAIT)
- [ ] Monitor DNS resolution time
- [ ] Track network interface errors and drops

## Essential Monitoring Commands

```bash
# CPU and load
uptime
mpstat 1 5
sar -u 1 5

# Memory
free -m
vmstat 1 5

# Disk
df -h
iostat -x 1 5

# Network
ss -s
ip -s link show eth0
```

## Set Up Prometheus Node Exporter

```bash
sudo useradd --no-create-home --shell /bin/false node_exporter
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

sudo tee /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now node_exporter
```

## Configure Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU usage | 80% | 95% |
| Memory usage | 85% | 95% |
| Disk usage | 80% | 90% |
| Load average | 2x cores | 4x cores |
| Swap usage | 50% | 80% |

## Conclusion

A comprehensive monitoring checklist for RHEL 9 covers system resources, processes, logs, and network metrics. Deploy automated monitoring with Prometheus, Grafana, or Red Hat Insights for continuous visibility.

