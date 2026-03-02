# How to Monitor GPU Usage with nvidia-smi on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NVIDIA, nvidia-smi, GPU Monitoring, Performance

Description: A comprehensive guide to using nvidia-smi on Ubuntu to monitor GPU utilization, memory usage, temperature, and processes, including scripting and automation techniques.

---

`nvidia-smi` (NVIDIA System Management Interface) is the standard tool for monitoring and managing NVIDIA GPUs on Linux. It ships with the NVIDIA driver and provides real-time information about GPU utilization, memory consumption, temperature, power draw, and running processes. Knowing how to use it effectively is essential for debugging performance issues, optimizing ML training jobs, and capacity planning.

## Basic Usage

```bash
# Default output - shows all GPUs with key stats
nvidia-smi

# Example output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 545.23.06    Driver Version: 545.23.06    CUDA Version: 12.3     |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  NVIDIA RTX 3080    Off  | 00000000:01:00.0 Off |                  N/A |
# |  42%   58C    P2   245W / 320W|  8234MiB / 10240MiB |     95%      Default |
```

The columns give you:
- **Temp**: GPU die temperature in Celsius
- **Pwr:Usage/Cap**: Current draw vs TDP
- **Memory-Usage**: VRAM used / total
- **GPU-Util**: Percentage of time GPU cores were active

## Continuous Monitoring

```bash
# Refresh every 1 second
nvidia-smi -l 1

# Or use watch for cleaner output
watch -n 1 nvidia-smi

# Refresh every 2 seconds with full stats
nvidia-smi dmon -s pucvmet -d 2
```

The `dmon` (device monitoring) subcommand streams statistics to stdout, which is useful for logging during long training runs:

```bash
# dmon flags:
# -s: stats to show (p=power, u=utilization, c=clock, v=vram, m=memory, e=ecc, t=temp)
# -d: delay in seconds
# -f: write to file

# Log GPU stats to a file for post-analysis
nvidia-smi dmon -s putm -d 5 -f /var/log/gpu_stats.log
```

## Querying Specific Metrics

The `--query-gpu` flag lets you extract exactly the fields you need:

```bash
# Query specific fields with CSV output (no headers)
nvidia-smi --query-gpu=timestamp,name,pci.bus_id,driver_version,pstate,pcie.link.gen.max,pcie.link.gen.current,temperature.gpu,utilization.gpu,utilization.memory,memory.total,memory.free,memory.used --format=csv,noheader

# Get just utilization and temperature
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu,power.draw --format=csv,noheader,nounits

# All available query fields
nvidia-smi --help-query-gpu
```

## Monitoring GPU Processes

```bash
# List all processes using the GPU
nvidia-smi pmon

# Query specific process info
nvidia-smi --query-compute-apps=pid,used_memory,name --format=csv

# Show GPU process details (PID, type, memory)
nvidia-smi --query-compute-apps=pid,process_name,used_gpu_memory --format=csv,noheader
```

This is useful when you need to find which process is consuming GPU memory:

```bash
# Combine with ps to get full process info
nvidia-smi --query-compute-apps=pid,used_gpu_memory --format=csv,noheader | while IFS=, read pid mem; do
    pid=$(echo $pid | tr -d ' ')
    mem=$(echo $mem | tr -d ' ')
    proc=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
    echo "PID: $pid | Process: $proc | GPU Memory: $mem"
done
```

## Scripting with nvidia-smi

### Real-time GPU Utilization Logger

```bash
#!/bin/bash
# gpu_logger.sh - Log GPU stats at regular intervals

LOG_FILE="/var/log/gpu_monitor.log"
INTERVAL=10  # seconds

echo "timestamp,gpu_id,name,temp,util_gpu,util_mem,mem_used,mem_total,power" > "$LOG_FILE"

while true; do
    nvidia-smi \
        --query-gpu=timestamp,index,name,temperature.gpu,utilization.gpu,utilization.memory,memory.used,memory.total,power.draw \
        --format=csv,noheader,nounits >> "$LOG_FILE"
    sleep "$INTERVAL"
done
```

### Alert Script for High Temperature

```bash
#!/bin/bash
# gpu_temp_alert.sh - Alert if GPU temperature exceeds threshold

THRESHOLD=85  # Celsius

TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits | head -1)

if [ "$TEMP" -gt "$THRESHOLD" ]; then
    echo "WARNING: GPU temperature is ${TEMP}C (threshold: ${THRESHOLD}C)" | \
        mail -s "GPU Temperature Alert" admin@example.com
    logger "GPU temperature alert: ${TEMP}C"
fi
```

Run this from cron every minute:

```bash
# Add to crontab
* * * * * /usr/local/bin/gpu_temp_alert.sh
```

## Power Management

```bash
# Enable persistence mode (keeps driver loaded, reduces initialization latency)
sudo nvidia-smi -pm 1

# Set power limit (in watts) - useful to cap power consumption
sudo nvidia-smi --power-limit=250

# Check current power limit
nvidia-smi --query-gpu=power.limit --format=csv,noheader

# Reset to default power limit
sudo nvidia-smi --power-limit=$(nvidia-smi --query-gpu=power.default_limit --format=csv,noheader | tr -d ' MiB W')
```

## Clock Management

```bash
# Show current and max clock speeds
nvidia-smi --query-gpu=clocks.current.graphics,clocks.max.graphics,clocks.current.memory,clocks.max.memory --format=csv

# Lock GPU clock to max speed (reduces variance during benchmarks)
sudo nvidia-smi --lock-gpu-clocks=$(nvidia-smi --query-gpu=clocks.max.graphics --format=csv,noheader | tr -d ' MHz')

# Reset clock locks
sudo nvidia-smi --reset-gpu-clocks

# Enable/disable auto boost
sudo nvidia-smi --auto-boost-default=0  # disable auto boost
```

## ECC Memory Monitoring

For datacenter GPUs with ECC support:

```bash
# Check ECC errors
nvidia-smi --query-gpu=ecc.errors.corrected.volatile.total,ecc.errors.uncorrected.volatile.total --format=csv

# Reset ECC error counts
sudo nvidia-smi --ecc-config=1  # enable ECC
sudo nvidia-smi -r  # reset accumulated ECC counts
```

## Integration with Prometheus for Long-term Monitoring

For production environments, export GPU metrics to Prometheus using `nvidia_gpu_exporter`:

```bash
# Install the GPU exporter
wget https://github.com/utkuozdemir/nvidia_gpu_exporter/releases/latest/download/nvidia_gpu_exporter_linux_amd64.tar.gz
tar -xzf nvidia_gpu_exporter_linux_amd64.tar.gz
sudo mv nvidia_gpu_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/nvidia-gpu-exporter.service << 'EOF'
[Unit]
Description=NVIDIA GPU Prometheus Exporter
After=network.target

[Service]
User=nobody
ExecStart=/usr/local/bin/nvidia_gpu_exporter
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now nvidia-gpu-exporter
```

The exporter listens on port 9835 by default. Add it to your Prometheus config:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nvidia_gpu'
    static_configs:
      - targets: ['localhost:9835']
```

## Using nvtop as an Interactive Monitor

For an `htop`-like GPU monitoring experience:

```bash
# Install nvtop
sudo apt-get install -y nvtop

# Run it
nvtop
```

nvtop shows a real-time graph of GPU and memory utilization, lists processes using the GPU, and works with both NVIDIA and AMD GPUs.

## Useful One-liners

```bash
# Total memory across all GPUs
nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | awk '{sum+=$1} END {print sum " MiB total"}'

# Find the least-loaded GPU
nvidia-smi --query-gpu=index,utilization.gpu --format=csv,noheader,nounits | sort -t, -k2 -n | head -1

# Kill a specific process using GPU memory
CUDA_VISIBLE_DEVICES=0 nvidia-smi --id=0 --query-compute-apps=pid --format=csv,noheader | xargs -r sudo kill

# Check if any GPU is running at reduced PCIe link width (should be x16)
nvidia-smi --query-gpu=pcie.link.width.current --format=csv,noheader
```

With `nvidia-smi` mastered, you have everything you need to understand GPU behavior, catch thermal throttling, find memory hogs, and integrate GPU metrics into your monitoring stack.
