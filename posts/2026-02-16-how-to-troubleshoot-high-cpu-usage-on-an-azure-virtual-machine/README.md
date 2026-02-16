# How to Troubleshoot High CPU Usage on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, CPU Usage, Troubleshooting, Performance, Monitoring, Azure Monitor

Description: A practical troubleshooting guide for diagnosing and resolving high CPU usage on Azure Virtual Machines with real-world examples.

---

Your monitoring alerts fire at 3 AM telling you a VM is pegged at 100% CPU. The application is slow, users are complaining, and you need to figure out what is eating all those cycles. High CPU usage on an Azure VM can stem from many causes - a runaway process, an application bug, insufficient VM sizing, or even a security incident. In this guide, I will walk through a systematic approach to diagnosing and fixing the problem.

## Step 1: Confirm the Problem from Azure Monitor

Before SSHing into the VM, check the metrics from the Azure side. This gives you a timeline and helps determine whether this is a sudden spike or a gradual increase.

```bash
# Get CPU percentage over the last hour with 5-minute intervals
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
  --metric "Percentage CPU" \
  --interval PT5M \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --output table
```

In the Azure portal, navigate to your VM and click "Metrics" in the left menu. Select "Percentage CPU" and adjust the time range to see the pattern:

- **Sudden spike**: Something triggered a burst of activity. Check recent deployments, cron jobs, or external traffic.
- **Gradual increase**: Likely a memory leak, growing workload, or accumulating processes.
- **Consistently high**: The VM might be undersized for the workload.

## Step 2: Check VM Size and CPU Credits

If you are running a B-series (burstable) VM, high CPU usage might be caused by running out of CPU credits. Burstable VMs accumulate credits when CPU usage is low and spend them when usage is high. Once credits are depleted, the VM is throttled to its base CPU performance.

```bash
# Check CPU credits remaining for a burstable VM
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
  --metric "CPU Credits Remaining" \
  --interval PT5M \
  --output table
```

If credits are at zero, your options are:
- Resize to a larger B-series VM with more baseline performance.
- Switch to a D-series or F-series VM that provides consistent CPU performance.
- Wait for credits to accumulate (not ideal for production).

## Step 3: Identify the Culprit Process on Linux

SSH into the VM and find out which process is consuming CPU:

```bash
# Show the top CPU-consuming processes, sorted by CPU usage
top -bn1 -o %CPU | head -20
```

The output shows processes ranked by CPU percentage. Look at the top entries.

For a more detailed view:

```bash
# List all processes sorted by CPU usage with full command lines
ps aux --sort=-%cpu | head -20
```

Common culprits include:

- **Web server processes (nginx, apache)**: Could indicate a traffic spike or a misconfigured worker pool.
- **Database processes (mysql, postgres)**: Likely a slow query or lock contention.
- **Application processes (node, python, java)**: Could be an application bug, infinite loop, or memory issue causing excessive garbage collection.
- **System processes (systemd, kworker)**: Might indicate kernel issues, heavy I/O, or driver problems.
- **Crypto miners**: If you see unfamiliar processes consuming CPU, your VM might be compromised.

## Step 4: Deep Dive into the Process

Once you have identified the suspect process, dig deeper:

```bash
# Check how long the process has been running and its resource usage
ps -p <PID> -o pid,ppid,user,%cpu,%mem,etime,cmd

# See what files the process has open
ls -la /proc/<PID>/fd | head -30

# Check what the process is doing right now with strace
sudo strace -p <PID> -c -t 10
```

For application processes, check the application logs:

```bash
# Check recent application logs (adjust path for your app)
sudo tail -100 /var/log/your-app/error.log

# Check system logs for any related errors
sudo journalctl -u your-app.service --since "1 hour ago"
```

## Step 5: Check for Traffic Spikes

High CPU might be caused by a legitimate or illegitimate traffic spike:

```bash
# Check current network connections count
ss -s

# See the top IPs connecting to your web server
ss -tn state established | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

If you see thousands of connections from a few IP addresses, it might be a DDoS attack or a misbehaving client. Consider blocking the offending IPs at the NSG level:

```bash
# Block a suspicious IP address at the Azure NSG level
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myNSG \
  --name BlockSuspiciousIP \
  --priority 100 \
  --direction Inbound \
  --access Deny \
  --source-address-prefixes '203.0.113.50' \
  --destination-port-ranges '*' \
  --protocol '*'
```

## Step 6: Check for Runaway Cron Jobs

Cron jobs are a frequent cause of periodic CPU spikes:

```bash
# List all cron jobs for the current user
crontab -l

# List system-wide cron jobs
ls -la /etc/cron.d/
sudo cat /etc/crontab

# Check if any cron job is currently running
ps aux | grep cron
```

Look for jobs that overlap - if a job takes 10 minutes but runs every 5 minutes, you end up with stacking processes that consume progressively more CPU.

## Step 7: Analyze with Azure Performance Diagnostics

Azure has a built-in performance diagnostics tool that can analyze the VM and generate a report:

```bash
# Install the Performance Diagnostics extension
az vm extension set \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name AzurePerformanceDiagnostics \
  --publisher Microsoft.Azure.Performance.Diagnostics \
  --version 1.0 \
  --settings '{"performanceScenario":"basic"}'
```

Or use the portal:

1. Go to your VM.
2. Under "Help," click "Performance diagnostics."
3. Choose the analysis level (basic, performance, or advanced).
4. Run the diagnostics.

The tool collects data on CPU usage, memory, disk I/O, and networking, then generates a report with findings and recommendations.

## Step 8: Check Memory Pressure

Sometimes high CPU is actually a symptom of memory pressure. When the system runs out of RAM, it starts swapping to disk, and the extra I/O drives up CPU wait time:

```bash
# Check memory usage
free -h

# Check swap usage
swapon --show

# Check for OOM killer activity
sudo dmesg | grep -i "out of memory"

# Check vmstat for swap activity (si/so columns show swap in/out)
vmstat 1 10
```

If swap usage is high and constantly churning, the VM needs more memory. Resize to a memory-optimized (E-series) VM or a larger general-purpose size.

## Step 9: Check Disk I/O

Heavy disk I/O can cause high CPU wait time, which shows up as high overall CPU usage:

```bash
# Check I/O wait percentage (wa column in the CPU line)
top -bn1 | head -5

# Check disk I/O in detail
iostat -x 1 5

# Find processes doing the most I/O
sudo iotop -obn 5
```

If I/O wait is high, consider:
- Upgrading to Premium SSD or Ultra Disk.
- Increasing the disk size (larger disks have higher IOPS limits).
- Adding caching to your application to reduce disk reads.
- Moving temporary files to the local SSD.

## Step 10: Set Up Alerts for Early Warning

After fixing the immediate problem, set up alerts so you know before things get critical:

```bash
# Create a CPU usage alert that triggers at 80% for 5 minutes
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "High CPU Alert" \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/virtualMachines/myVM" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup" \
  --description "Alert when VM CPU exceeds 80% for 5 minutes"
```

## Common Fixes Summary

Here is a quick reference for the most common causes and their fixes:

| Cause | Diagnosis | Fix |
|-------|-----------|-----|
| Undersized VM | CPU consistently near 100% | Resize to a larger VM |
| Depleted CPU credits (B-series) | Credits at zero, throttled performance | Switch to D or F series |
| Runaway process | Single process using high CPU | Kill and investigate the process |
| Traffic spike | Many connections from few IPs | Block IPs, add rate limiting |
| Memory pressure | High swap usage, OOM messages | Add RAM or resize VM |
| Disk I/O bottleneck | High I/O wait in top | Upgrade disk type or size |
| Stacking cron jobs | Multiple instances of same job | Fix scheduling, add lock files |
| Application bug | App process using excessive CPU | Debug and fix the application code |

## Wrapping Up

Troubleshooting high CPU on an Azure VM follows a systematic pattern: confirm the problem from metrics, identify the culprit process, understand why it is consuming CPU, and apply the appropriate fix. Most of the time, it comes down to an undersized VM, an application issue, or a traffic spike. The key is having good monitoring and alerting in place so you catch the problem early, before it impacts your users. Set up CPU alerts, review your metrics dashboards regularly, and keep your application logging detailed enough to help with diagnosis.
