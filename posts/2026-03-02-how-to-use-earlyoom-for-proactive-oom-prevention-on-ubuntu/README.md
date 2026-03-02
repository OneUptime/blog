# How to Use earlyoom for Proactive OOM Prevention on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memory, OOM, Performance, Linux

Description: Install and configure earlyoom on Ubuntu to prevent system freezes caused by out-of-memory conditions by proactively killing memory-hungry processes before the kernel OOM killer triggers.

---

The Linux kernel's OOM (Out-of-Memory) killer is a last resort. By the time it activates, the system is already thrashing - swap is nearly full, every memory allocation is failing, and the system may be unresponsive for seconds or minutes before the kernel decides which process to kill. `earlyoom` solves this by monitoring memory and swap usage and killing processes before the situation gets catastrophic.

## The Problem with the Kernel OOM Killer

The kernel's OOM killer activates when memory allocation genuinely cannot proceed. At that point:
- The system has usually been severely memory-pressured for a while
- Processes are failing to allocate memory in unpredictable ways
- The system may be unresponsive for significant time
- The kernel picks a victim based on a score that doesn't always match user intent

`earlyoom` intervenes earlier. When free memory drops below a threshold (say, 10% of total RAM), it identifies and kills the highest-priority victim and sends a notification. The system remains responsive throughout and the decision happens while there's still margin to work with.

## Installing earlyoom

```bash
# Install from Ubuntu's repositories (available in Ubuntu 20.04+)
sudo apt update
sudo apt install -y earlyoom

# Verify the installation
earlyoom --version

# Start and enable the service
sudo systemctl enable earlyoom
sudo systemctl start earlyoom

# Check status
sudo systemctl status earlyoom
```

## Default Configuration

After installation, earlyoom runs with sensible defaults: kill the most memory-hungry process when free RAM drops below 10% (and also when swap drops below 10%). These thresholds are configurable.

Check the current configuration:

```bash
# View the active configuration
cat /etc/default/earlyoom

# Check what earlyoom is actually doing
journalctl -u earlyoom -n 50
```

## Configuring earlyoom

The configuration file is `/etc/default/earlyoom`:

```bash
sudo nano /etc/default/earlyoom
```

```bash
# /etc/default/earlyoom

# Memory threshold: kill when free RAM drops below this percentage
# Default: 10%
# Adjust based on your system - on systems with 64GB RAM, 10% is 6.4GB
# which is very conservative. 5% might be more appropriate.
EARLYOOM_ARGS="-m 5 -s 5"

# Full options breakdown:
# -m <percent>    Minimum free memory threshold (default 10%)
# -s <percent>    Minimum free swap threshold (default 10%)
# -M <KiB>        Minimum free memory in KiB (alternative to percentage)
# -S <KiB>        Minimum free swap in KiB (alternative to percentage)
# -k              Send SIGTERM first, wait 1 second, then SIGKILL
#                 Default is to send SIGTERM only
# -i              Enable notifications via dbus (desktop use)
# -n              Send notifications using notify-send
# -d              Print debug information
# -r <seconds>    Poll interval in seconds (default 1)
# --prefer REGEX  Prefer killing processes matching this regex
# --avoid REGEX   Avoid killing processes matching this regex
```

A well-tuned configuration for a production server:

```bash
# /etc/default/earlyoom
# Kill at 5% free memory and 10% free swap
# Send SIGTERM first (graceful shutdown) then SIGKILL
# Avoid killing critical system processes
EARLYOOM_ARGS="-m 5 -s 10 -k --avoid '(^|/)(init|systemd|sshd|dbus-daemon|rsyslogd|cron|agetty)$'"
```

For a desktop workstation:

```bash
# /etc/default/earlyoom
# Kill at 8% free memory, prefer killing browser tabs
# Send notifications
EARLYOOM_ARGS="-m 8 -s 5 -k --prefer '(^|/)(chrome|chromium|firefox|electron)' --avoid '(^|/)(Xorg|gnome-shell|systemd|sshd)' -n"
```

Apply changes:

```bash
sudo systemctl restart earlyoom
sudo systemctl status earlyoom
```

## Understanding Process Priority for Killing

earlyoom uses memory-mapped sizes to rank processes as OOM kill candidates. The highest memory user that isn't protected by `--avoid` gets killed first.

```bash
# See which processes earlyoom considers as candidates
# It logs its chosen victim each time it kills something
journalctl -u earlyoom | grep -E "killed|victim"

# Check current memory usage by process (candidates for earlyoom)
ps aux --sort=-%mem | head -20

# See virtual memory and resident set size
ps aux --sort=-%mem | awk 'NR>1 {printf "%.1f%% %s\n", $4, $11}' | head -15
```

## Using oom_score_adj to Protect or Target Processes

Alongside earlyoom, you can influence which processes are killed using the kernel's own OOM score:

```bash
# Check the OOM score for a process
cat /proc/$(pgrep -f nginx)/oom_score
cat /proc/$(pgrep -f postgres)/oom_score

# Check the oom_score_adj (adjustment value)
cat /proc/$(pgrep -f nginx)/oom_score_adj

# Adjust OOM score for a running process
# -1000 to -1: makes process less likely to be killed
# 0: default
# +1 to +1000: makes process more likely to be killed

# Protect a critical process from being killed
echo -500 | sudo tee /proc/$(pgrep -f postgres)/oom_score_adj

# Make a disposable process a high-priority kill target
echo 500 | sudo tee /proc/$(pgrep -f python3)/oom_score_adj
```

Set oom_score_adj in systemd unit files for persistent protection:

```ini
# /etc/systemd/system/postgresql.service (or an override)
[Service]
# Protect PostgreSQL from OOM killing
OOMScoreAdjust=-500
```

## Configuring Notifications

earlyoom can send notifications when it kills a process. This is essential for production systems where you need to know when OOM events occur:

```bash
# Log to syslog (default behavior via journald)
# Already visible in: journalctl -u earlyoom

# Send to a specific command (e.g., a monitoring webhook)
# Use the --notify-command option
EARLYOOM_ARGS="-m 5 -s 10 -k \
  --notify-command '/usr/local/bin/oom-notify.sh %p %n'"
```

Create the notification script:

```bash
sudo tee /usr/local/bin/oom-notify.sh << 'EOF'
#!/bin/bash
# Called by earlyoom when killing a process
# Arguments: $1 = PID, $2 = process name

PID="$1"
PNAME="$2"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FREE_MEM=$(free -h | awk '/^Mem:/{print $4}')
FREE_SWAP=$(free -h | awk '/^Swap:/{print $4}')

# Log to syslog
logger -t earlyoom "OOM kill: PID=${PID} NAME=${PNAME} free_mem=${FREE_MEM} free_swap=${FREE_SWAP}"

# Alert via email (requires mail configured)
# echo "earlyoom killed ${PNAME} (PID ${PID}) at ${TIMESTAMP}. Free RAM: ${FREE_MEM}" | \
#   mail -s "OOM Event on $(hostname)" admin@example.com

# Or send to a webhook
# curl -s -X POST https://hooks.slack.com/... \
#   -H 'Content-type: application/json' \
#   --data "{\"text\":\"OOM: Killed ${PNAME} on $(hostname) at ${TIMESTAMP}\"}"
EOF

sudo chmod +x /usr/local/bin/oom-notify.sh
```

## Monitoring earlyoom Activity

```bash
# Watch earlyoom logs in real time
journalctl -u earlyoom -f

# See all OOM kill events in history
journalctl -u earlyoom | grep -E "killed|sending.*signal"

# Count how many times earlyoom has intervened
journalctl -u earlyoom | grep "killed" | wc -l

# Track memory usage trends to anticipate when earlyoom might trigger
watch -n 5 "free -h && echo '---' && ps aux --sort=-%mem | head -10"

# Create a simple memory monitoring script
cat << 'EOF' > /usr/local/bin/mem-watch.sh
#!/bin/bash
while true; do
    FREE_MEM=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
    TOTAL_MEM=$(awk '/MemTotal/{print $2}' /proc/meminfo)
    FREE_PCT=$(( FREE_MEM * 100 / TOTAL_MEM ))

    if [ "$FREE_PCT" -lt 15 ]; then
        echo "$(date): LOW MEMORY - ${FREE_PCT}% free (${FREE_MEM}KB)"
        ps aux --sort=-%mem | head -5
    fi
    sleep 10
done
EOF
chmod +x /usr/local/bin/mem-watch.sh
```

## Comparing earlyoom to systemd-oomd

Ubuntu 22.04+ ships with `systemd-oomd`, which serves a similar purpose. You can use either but typically not both:

```bash
# Check if systemd-oomd is running
systemctl status systemd-oomd

# systemd-oomd is more tightly integrated with cgroups
# earlyoom is simpler and has been around longer

# If using systemd-oomd, you may want to disable earlyoom
sudo systemctl disable --now earlyoom

# If preferring earlyoom, disable systemd-oomd
sudo systemctl disable --now systemd-oomd
```

earlyoom's value is its simplicity and directness. It watches memory, picks the biggest memory user that isn't protected, and kills it before the system becomes unresponsive. On servers and workstations prone to memory pressure from large workloads, this one daemon is worth far more than its minimal footprint suggests.
