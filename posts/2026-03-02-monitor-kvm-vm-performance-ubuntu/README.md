# How to Monitor KVM VM Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Monitoring, Performance

Description: Learn how to monitor KVM virtual machine performance on Ubuntu using virsh, virt-top, and other tools to track CPU, memory, disk I/O, and network metrics.

---

Monitoring VM performance helps you identify resource bottlenecks before they affect users, plan capacity upgrades, and troubleshoot sluggish VMs. KVM provides several layers of visibility: the hypervisor level (what the host sees), the guest level (what the VM OS reports), and the libvirt statistics layer that bridges both.

## Built-in virsh Monitoring Commands

### Real-time VM Statistics

```bash
# Show all VMs and their states
virsh list --all

# Show CPU and memory for all running VMs
virsh domstats

# Filter to specific statistics
virsh domstats myvm --cpu-total --balloon --interface --block

# Per-VM detailed stats
virsh dominfo myvm
```

### CPU Statistics

```bash
# CPU time used by a VM (in nanoseconds)
virsh domstats myvm --cpu-total

# Example output:
# cpu.time=12345678901234  <- total CPU time (ns)
# cpu.user=9876543210987   <- user space time
# cpu.system=2345678901234 <- kernel time

# Per-vCPU statistics
virsh vcpuinfo myvm

# vCPU placement and utilization
virsh domjobinfo myvm  # Shows active jobs like migrations
```

### Memory Statistics

```bash
# Memory statistics (requires balloon driver in guest)
virsh dommemstat myvm

# Example output:
# actual 2097152         <- current allocation in KB
# rss 1987456            <- resident set size in KB
# swap_in 0              <- pages swapped in
# swap_out 0             <- pages swapped out
# major_fault 12         <- major page faults
# minor_fault 98765      <- minor page faults
# available 1998848      <- usable memory inside VM
# usable 1789344         <- memory guest can use without swapping
# last_update 1709420400 <- timestamp of last update
```

### Disk I/O Statistics

```bash
# List VM block devices
virsh domblklist myvm

# I/O statistics for a specific disk
virsh domblkstat myvm vda

# Output shows:
# vda rd_req 12345      <- read requests
# vda rd_bytes 5678901  <- bytes read
# vda wr_req 23456      <- write requests
# vda wr_bytes 7890123  <- bytes written
# vda flush_req 345     <- flush operations
# vda rd_total_times 12345678  <- read time in ns
# vda wr_total_times 23456789  <- write time in ns

# Block device capacity info
virsh domblkinfo myvm vda
```

### Network Statistics

```bash
# Network interface stats
virsh domiflist myvm

# I/O stats for a specific interface
virsh domifstat myvm vnet0

# Output:
# vnet0 rx_bytes 12345678   <- bytes received
# vnet0 rx_packets 123456   <- packets received
# vnet0 rx_errors 0         <- receive errors
# vnet0 rx_drop 0           <- dropped packets
# vnet0 tx_bytes 98765432   <- bytes transmitted
# vnet0 tx_packets 234567   <- packets sent
# vnet0 tx_errors 0         <- transmit errors
# vnet0 tx_drop 0           <- dropped outgoing
```

## Using virt-top for Real-time Monitoring

`virt-top` provides a top-like view of all running VMs:

```bash
# Install virt-top
sudo apt install virt-top

# Run with 2-second refresh interval
virt-top -d 2

# Show additional fields (press 'f' to toggle fields)
# Show network stats
virt-top -d 2 --csv /var/log/virt-top.csv  # Log to CSV
```

Key fields in virt-top:
- `%CPU` - CPU utilization as percentage of one core
- `%MEM` - Memory utilization percentage
- `RDRQ/WRRQ` - Disk read/write requests per second
- `RXBY/TXBY` - Network receive/transmit bytes per second

## Using virsh domstats for Scripting

```bash
# Get all stats for all VMs in parseable format
virsh domstats --list-running

# Get specific metric groups
virsh domstats --list-running --cpu-total --balloon

# Parse output for monitoring
virsh domstats myvm --cpu-total | grep "cpu.time" | awk -F= '{print $2}'
```

## Writing a Performance Monitoring Script

```bash
sudo nano /usr/local/bin/vm-monitor.sh
```

```bash
#!/bin/bash
# KVM VM performance monitoring script
# Collects metrics every minute and appends to log

LOG_DIR="/var/log/kvm-metrics"
INTERVAL=60
mkdir -p "$LOG_DIR"

collect_metrics() {
    local vm="$1"
    local timestamp=$(date +%s)
    local log_file="$LOG_DIR/${vm}.csv"

    # Initialize CSV header if file doesn't exist
    if [ ! -f "$log_file" ]; then
        echo "timestamp,cpu_time,memory_rss,rd_bytes,wr_bytes,rx_bytes,tx_bytes" > "$log_file"
    fi

    # Collect CPU time
    cpu_time=$(virsh domstats "$vm" --cpu-total 2>/dev/null | grep "cpu.time" | cut -d= -f2)

    # Collect memory RSS
    mem_rss=$(virsh dommemstat "$vm" 2>/dev/null | grep "^rss" | awk '{print $2}')

    # Collect disk I/O (first disk)
    first_disk=$(virsh domblklist "$vm" 2>/dev/null | awk 'NR==3 {print $1}')
    rd_bytes=""
    wr_bytes=""
    if [ -n "$first_disk" ]; then
        rd_bytes=$(virsh domblkstat "$vm" "$first_disk" 2>/dev/null | grep "rd_bytes" | awk '{print $3}')
        wr_bytes=$(virsh domblkstat "$vm" "$first_disk" 2>/dev/null | grep "wr_bytes" | awk '{print $3}')
    fi

    # Collect network I/O (first interface)
    first_iface=$(virsh domiflist "$vm" 2>/dev/null | awk 'NR==3 {print $1}')
    rx_bytes=""
    tx_bytes=""
    if [ -n "$first_iface" ]; then
        rx_bytes=$(virsh domifstat "$vm" "$first_iface" 2>/dev/null | grep "rx_bytes" | awk '{print $3}')
        tx_bytes=$(virsh domifstat "$vm" "$first_iface" 2>/dev/null | grep "tx_bytes" | awk '{print $3}')
    fi

    echo "$timestamp,$cpu_time,$mem_rss,$rd_bytes,$wr_bytes,$rx_bytes,$tx_bytes" >> "$log_file"
}

# Collect metrics for all running VMs
while true; do
    for vm in $(virsh list --name 2>/dev/null); do
        collect_metrics "$vm" &
    done
    wait
    sleep "$INTERVAL"
done
```

```bash
sudo chmod +x /usr/local/bin/vm-monitor.sh
```

Create a systemd service for continuous monitoring:

```bash
sudo nano /etc/systemd/system/kvm-monitor.service
```

```ini
[Unit]
Description=KVM VM Performance Monitor
After=libvirtd.service

[Service]
ExecStart=/usr/local/bin/vm-monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now kvm-monitor.service
```

## Host-Level Monitoring with perf

```bash
# Monitor all QEMU processes on the host
sudo perf top -p $(pgrep -d, qemu-system-x86_64) --no-children

# Check KVM-specific counters
sudo perf kvm stat report --event=all

# Live KVM performance statistics
sudo perf kvm stat live

# Key KVM counters to watch:
# kvm_exit: VM exits (high count = lots of hypervisor intervention)
# kvm_halt: VM vCPU idle time
# kvm_mmio: Memory-mapped I/O exits (may indicate emulated device bottleneck)
# kvm_pio: Port I/O exits
```

## QEMU Monitor for Detailed Metrics

```bash
# Connect to QEMU monitor for a running VM
sudo virsh qemu-monitor-command myvm --hmp "info status"

# Show VM memory mapping
sudo virsh qemu-monitor-command myvm --hmp "info balloon"

# Show block device I/O stats
sudo virsh qemu-monitor-command myvm --hmp "info block"

# Show network device stats
sudo virsh qemu-monitor-command myvm --hmp "info network"

# Show CPU usage
sudo virsh qemu-monitor-command myvm --hmp "info cpus"
```

## Integrating with Prometheus/Grafana

For production monitoring, use the libvirt exporter for Prometheus:

```bash
# Install prometheus-libvirt-exporter
sudo apt install prometheus-libvirt-exporter 2>/dev/null || \
  docker run -d --name libvirt-exporter \
    -v /var/run/libvirt:/var/run/libvirt \
    alekseizakharov/libvirt-exporter

# The exporter exposes metrics on port 9177
curl http://localhost:9177/metrics | grep libvirt_domain_cpu
```

Key metrics exposed:
- `libvirt_domain_cpu_time_seconds_total` - CPU time per VM
- `libvirt_domain_memory_stats_rss_bytes` - Memory RSS per VM
- `libvirt_domain_block_stats_read_bytes_total` - Disk read bytes
- `libvirt_domain_block_stats_write_bytes_total` - Disk write bytes
- `libvirt_domain_interface_stats_receive_bytes_total` - Network RX

## Analyzing Performance Issues

**High CPU wait on host:**

```bash
# Check if VMs are causing high iowait
iostat -x 2 10

# Find which VM is writing most
for vm in $(virsh list --name); do
    disk=$(virsh domblklist $vm | awk 'NR==3 {print $1}')
    wr=$(virsh domblkstat $vm $disk 2>/dev/null | grep wr_bytes | awk '{print $3}')
    echo "$vm: $wr bytes written"
done | sort -t: -k2 -n
```

**VM running slow despite low host CPU:**

```bash
# Check for balloon pressure
virsh dommemstat myvm | grep -E "swap|available|usable"

# If swap_in/swap_out are non-zero, VM is memory starved
# Check if VM is swapping
virsh domblkstat myvm vda | grep rd_req  # High read requests may indicate swapping
```

**Network throughput lower than expected:**

```bash
# Check interface type - should be virtio for best performance
virsh domiflist myvm | grep -v "Interface"

# Check for packet drops
virsh domifstat myvm vnet0 | grep drop
```

Combining virsh's built-in statistics with host-level perf data gives you a complete picture of VM performance. For production environments, centralizing these metrics in a time-series database like Prometheus makes capacity planning and incident investigation much more efficient.
