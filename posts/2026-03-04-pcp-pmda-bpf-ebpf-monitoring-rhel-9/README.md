# How to Use the pcp-pmda-bpf Agent for eBPF-Based Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PCP, eBPF, BPF, Performance, Monitoring, Linux

Description: Learn how to install and configure the pcp-pmda-bpf agent on RHEL to collect eBPF-based performance metrics through PCP.

---

The pcp-pmda-bpf agent integrates eBPF (extended Berkeley Packet Filter) tracing with PCP (Performance Co-Pilot). This lets you collect low-level kernel metrics like run queue latency, bio latency, and TCP connection events through the PCP framework, enabling historical logging and alerting.

## Prerequisites

- A RHEL system with PCP installed and running
- Root or sudo access
- Kernel 5.14 or later (included in RHEL)

## Installing the BPF PMDA

Install the required packages:

```bash
sudo dnf install pcp-pmda-bpf -y
```

## Installing the PMDA

Install the BPF PMDA into PCP:

```bash
cd /var/lib/pcp/pmdas/bpf
sudo ./Install
```

When prompted, accept the default configuration. The installer registers the PMDA with pmcd and starts collecting metrics.

Verify the PMDA is loaded:

```bash
pminfo -f bpf
```

## Available BPF Metrics

List all metrics from the BPF PMDA:

```bash
pminfo bpf
```

Key metric groups include:

### Run Queue Latency

```bash
pmval bpf.runq.latency
```

Shows the distribution of scheduler run queue wait times in nanoseconds.

### Block I/O Latency

```bash
pmval bpf.disk.all.latency
```

Shows the distribution of disk I/O completion times.

### TCP Connection Events

```bash
pmval bpf.tcpconnect.pid
pmval bpf.tcpconnect.comm
```

## Configuring the BPF PMDA

Edit the configuration to enable or disable specific BPF modules:

```bash
sudo vi /var/lib/pcp/pmdas/bpf/bpf.conf
```

Example configuration:

```ini
[runqlat.so]
enabled = true

[biolatency.so]
enabled = true

[tcpconnect.so]
enabled = true

[execsnoop.so]
enabled = true
```

Restart the PMDA after changes:

```bash
cd /var/lib/pcp/pmdas/bpf
sudo ./Remove
sudo ./Install
```

## Logging BPF Metrics with pmlogger

Add BPF metrics to the pmlogger configuration:

```bash
sudo vi /var/lib/pcp/config/pmlogger/config.default
```

Add the metrics before the `[access]` section:

```text
log mandatory on every 10 seconds {
    bpf.runq.latency
    bpf.disk.all.latency
}
```

Restart pmlogger:

```bash
sudo systemctl restart pmlogger
```

## Querying BPF Metrics with pmrep

Generate a report of run queue latency:

```bash
pmrep bpf.runq.latency -t 5sec -s 12
```

View block I/O latency:

```bash
pmrep bpf.disk.all.latency -t 5sec -s 12
```

## Visualizing BPF Metrics in Grafana

If you have PCP and Grafana integrated:

1. Open Grafana and create a new dashboard
2. Add a panel with the PCP data source
3. Query `bpf.runq.latency` or `bpf.disk.all.latency`
4. Use a heatmap visualization for latency distributions

## Reviewing Historical BPF Data

Replay archived BPF metrics:

```bash
pmval -a /var/log/pcp/pmlogger/$(hostname)/$(date +%Y%m%d).0 bpf.runq.latency
```

## Troubleshooting

If the BPF PMDA fails to start, check the logs:

```bash
sudo journalctl -u pmcd --no-pager -n 30
cat /var/log/pcp/pmcd/bpf.log
```

Verify that the BPF subsystem is working:

```bash
sudo bpftool prog list
```

Ensure kernel BTF data is available:

```bash
test -r /sys/kernel/btf/vmlinux && echo "BTF available"
```

## Conclusion

The pcp-pmda-bpf agent on RHEL combines the power of eBPF tracing with PCP's logging and analysis framework. This gives you low-overhead, high-detail metrics that can be logged historically and visualized in dashboards.
