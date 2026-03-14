# How to Use the pcp-pmda-bpf Agent for eBPF-Based Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PCP, EBPF, BPF, Performance, Monitoring, Linux

Description: Learn how to install and configure the pcp-pmda-bpf agent on RHEL to collect eBPF-based performance metrics through PCP.

---

The pcp-pmda-bpf agent integrates eBPF (extended Berkeley Packet Filter) tracing with PCP (Performance Co-Pilot). This lets you collect low-level kernel metrics like run queue latency, bio latency, and TCP events through the PCP framework, enabling historical logging and alerting.

## Prerequisites

- A RHEL system with PCP installed and running
- Root or sudo access
- Kernel 5.14 or later (included in RHEL)

## Installing the BPF PMDA

Install the required packages:

```bash
sudo dnf install pcp-pmda-bpf bcc -y
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
pmval bpf.runqlat.usecs
```

Shows the distribution of scheduler run queue wait times.

### Block I/O Latency

```bash
pmval bpf.biolatency.usecs
```

Shows the distribution of disk I/O completion times.

### TCP Connection Events

```bash
pmval bpf.tcplife.pid
pmval bpf.tcplife.comm
```

## Configuring the BPF PMDA

Edit the configuration to enable or disable specific BPF modules:

```bash
sudo vi /var/lib/pcp/pmdas/bpf/bpf.conf
```

Example configuration:

```ini
[bpf]
enabled_modules = runqlat,biolatency,tcplife,execsnoop
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
sudo tee -a /etc/pcp/pmlogger/config.d/bpf.config << 'CONF'
log mandatory on 10sec {
    bpf.runqlat
    bpf.biolatency
}
CONF
```

Restart pmlogger:

```bash
sudo systemctl restart pmlogger
```

## Querying BPF Metrics with pmrep

Generate a report of run queue latency:

```bash
pmrep bpf.runqlat -t 5sec -s 12
```

View block I/O latency:

```bash
pmrep bpf.biolatency -t 5sec -s 12
```

## Visualizing BPF Metrics in Grafana

If you have PCP and Grafana integrated:

1. Open Grafana and create a new dashboard
2. Add a panel with the PCP data source
3. Query `bpf.runqlat` or `bpf.biolatency`
4. Use a heatmap visualization for latency distributions

## Reviewing Historical BPF Data

Replay archived BPF metrics:

```bash
pmval -a /var/log/pcp/pmlogger/$(hostname)/$(date +%Y%m%d).0 bpf.runqlat
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

Ensure the kernel headers are installed:

```bash
sudo dnf install kernel-devel kernel-headers -y
```

## Conclusion

The pcp-pmda-bpf agent on RHEL combines the power of eBPF tracing with PCP's logging and analysis framework. This gives you low-overhead, high-detail metrics that can be logged historically and visualized in dashboards.
