# How to Set Up Sysdig for Container and System Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Sysdig, Monitoring, Containers, Security

Description: Learn how to install and use Sysdig on Ubuntu to monitor system calls, container activity, network connections, and performance metrics at the kernel level.

---

Sysdig captures system calls and OS events at the kernel level, giving you visibility into everything happening on a Linux machine - every file open, every network connection, every process fork - with enough context to actually understand what's going on. It works especially well for containers, where traditional tools often struggle to give you per-container visibility.

This guide covers the open-source Sysdig tool, not the commercial Sysdig platform.

## How Sysdig Works

Sysdig uses a kernel module (or eBPF probe) to intercept system calls. Every syscall gets captured with full context: the process name, PID, user, container ID, and the arguments to the call. This data can be inspected live or saved to a trace file for offline analysis with `sysdig` filters.

The companion tool `csysdig` provides an ncurses-based interactive UI, while `falco` (a related project) uses sysdig's capture engine for real-time security alerting.

## Installation on Ubuntu

### Method 1: Official Sysdig Repository

```bash
# Add the Sysdig repository
curl -s https://s3.amazonaws.com/download.draios.com/stable/install-sysdig | sudo bash
```

This script adds the apt repository and installs sysdig. Alternatively, do it manually:

```bash
# Add Sysdig GPG key
sudo curl -s https://download.sysdig.com/DRAIOS-GPG-KEY.public | sudo apt-key add -

# Add the repository
sudo curl -s https://download.sysdig.com/stable/deb/draios.list -o /etc/apt/sources.list.d/draios.list

# Install kernel headers (required for the kernel module)
sudo apt update
sudo apt install -y linux-headers-$(uname -r)

# Install Sysdig
sudo apt install -y sysdig
```

### Method 2: Using the Docker Container

If you don't want to install kernel modules, sysdig can also run as a privileged Docker container:

```bash
docker run -it --privileged \
  -v /var/run/docker.sock:/host/var/run/docker.sock \
  -v /dev:/host/dev \
  -v /proc:/host/proc:ro \
  -v /boot:/host/boot:ro \
  -v /lib/modules:/host/lib/modules:ro \
  -v /usr:/host/usr:ro \
  sysdig/sysdig
```

### Verify the Installation

```bash
# Load the sysdig kernel module
sudo modprobe sysdig-probe

# Verify it loaded
lsmod | grep sysdig

# Run a basic test
sudo sysdig -l | head -20
```

## Basic Usage

Sysdig captures events from the running system. By default, it outputs a continuous stream:

```bash
# Capture all system events (verbose - stop with Ctrl+C)
sudo sysdig

# Limit to 100 events then stop
sudo sysdig -n 100

# Show events from a specific process
sudo sysdig proc.name=nginx

# Show events from a specific user
sudo sysdig user.name=www-data
```

## Filtering Events

Sysdig has a powerful filtering language similar to Wireshark's display filters:

```bash
# Show all file open events
sudo sysdig evt.type=open

# Show only failed system calls
sudo sysdig evt.failed=true

# Show network connections to port 443
sudo sysdig fd.port=443

# Show all events from a container
sudo sysdig container.name=mycontainer

# Combine filters with 'and', 'or', 'not'
sudo sysdig "proc.name=nginx and evt.type=read"

# Show all writes larger than 4096 bytes
sudo sysdig "evt.type=write and evt.arg.count>4096"
```

## Container-Specific Monitoring

Sysdig understands container context natively, which makes it invaluable for containerized workloads:

```bash
# List all running containers sysdig can see
sudo sysdig -l | grep container

# Monitor all activity in a specific Docker container
sudo sysdig container.name=webserver

# Show all network connections from any container
sudo sysdig "container.id != host and evt.type=connect"

# Show file activity in containers, grouped by container name
sudo sysdig -pc -c topfiles_bytes container.id != host

# Show CPU usage per container
sudo sysdig -pc -c topprocs_cpu
```

The `-pc` flag tells sysdig to show container context in the output.

## Built-in Chisels (Analysis Scripts)

Sysdig includes a library of analysis scripts called chisels. They're pre-built queries for common monitoring tasks:

```bash
# List all available chisels
sudo sysdig -cl

# Show network connections
sudo sysdig -c netstat

# Show top processes by network I/O
sudo sysdig -c topprocs_net

# Show top files by bytes written
sudo sysdig -c topfiles_bytes

# Show top system calls
sudo sysdig -c topscalls

# Show processes generating the most I/O errors
sudo sysdig -c scallslower 1000
```

### Useful Container Chisels

```bash
# Show all network connections and which container initiated them
sudo sysdig -pc -c netstat container.id != host

# Show top CPU consuming containers
sudo sysdig -pc -c topprocs_cpu container.id != host

# Show file activity per container
sudo sysdig -pc -c topfiles_bytes container.id != host

# Spy on all commands executed in a container
sudo sysdig -pc -c spy_users container.name=mycontainer
```

## Capturing to File for Later Analysis

Sysdig can save captures to a file for offline analysis - very useful for post-incident investigation:

```bash
# Capture to a file (stops with Ctrl+C)
sudo sysdig -w /tmp/capture.scap

# Capture for 60 seconds
sudo sysdig -w /tmp/capture.scap -G 60

# Capture up to 500MB then stop
sudo sysdig -w /tmp/capture.scap -C 500

# Read from a capture file
sudo sysdig -r /tmp/capture.scap

# Apply a filter when reading from file
sudo sysdig -r /tmp/capture.scap proc.name=nginx
```

## Using csysdig - The Interactive UI

`csysdig` provides a terminal UI similar to htop but with much deeper system visibility:

```bash
# Launch the interactive UI
sudo csysdig

# Launch with container view
sudo csysdig -pc
```

Once inside csysdig:
- Press `F2` to switch views (processes, containers, network connections, files, etc.)
- Press `F5` to open a container/process and drill into it
- Type to filter the current view
- Press `F6` to apply chisels to selected items

## Monitoring System Calls for Security

Sysdig is excellent for detecting suspicious activity:

```bash
# Watch for attempts to read /etc/shadow (password file)
sudo sysdig "evt.type=open and fd.name=/etc/shadow"

# Detect processes spawning shells (potential command injection)
sudo sysdig "evt.type=execve and proc.name in (bash, sh, zsh, dash)"

# Watch for new files created in /tmp (common malware staging area)
sudo sysdig "evt.type=creat and fd.name startswith /tmp"

# Monitor privilege escalation attempts
sudo sysdig "evt.type=setuid and evt.arg.uid=0"

# Watch for outbound connections from a web server process
sudo sysdig "proc.name=nginx and evt.type=connect"
```

## Performance Analysis

```bash
# Show latency for file I/O operations
sudo sysdig -c fileslower 100  # Operations slower than 100ms

# Show slowest network connections
sudo sysdig -c netlower 100

# Show all system calls taking more than 1ms
sudo sysdig "evt.latency > 1000000"  # Latency is in nanoseconds

# Show disk I/O latency breakdown
sudo sysdig -c topfiles_time
```

## Integrating with Monitoring Infrastructure

For production use, consider pairing sysdig with your monitoring stack. Sysdig can output in JSON format for log shipping:

```bash
# Output events as JSON
sudo sysdig -j proc.name=nginx

# Pipe to a log shipper or file
sudo sysdig -j "proc.name=nginx and evt.failed=true" >> /var/log/nginx-errors.json
```

Sysdig Falco (now a CNCF project) extends this with a rule-based alerting system that can send alerts to syslog, Slack, or any HTTP endpoint when specific patterns are detected.

## Uninstalling Sysdig

```bash
# Remove the package
sudo apt remove sysdig

# Unload the kernel module
sudo rmmod sysdig

# Remove the repository
sudo rm /etc/apt/sources.list.d/draios.list
sudo apt update
```

Sysdig fills a gap that tools like `strace`, `tcpdump`, and `htop` each cover partially but none cover fully. The ability to correlate file I/O, network connections, and process activity all in a single stream, with container-aware context, makes it one of the most useful diagnostic tools available for Ubuntu systems running containers.
