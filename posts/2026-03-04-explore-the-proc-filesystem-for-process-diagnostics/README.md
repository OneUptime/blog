# How to Explore the /proc Filesystem for Process Diagnostics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Proc, Debugging, Linux

Description: Learn how to explore the /proc Filesystem for Process Diagnostics on RHEL with step-by-step instructions, configuration examples, and best practices.

---

The /proc filesystem is a virtual filesystem that exposes kernel and process information as readable files. It provides detailed diagnostics for running processes without needing any additional tools, subject to normal Linux permissions and procfs mount options.

## Prerequisites

- RHEL
- Basic command-line knowledge

## Understanding /proc

The /proc filesystem is mounted automatically and contains:
- Numbered directories for each process (by PID)
- System-wide kernel information files

## Step 1: Explore a Process Directory

Every process has a directory at `/proc/<PID>/`:

```bash
ls /proc/1/
```

Key files for any process:

| File | Contents |
|------|----------|
| `cmdline` | Command-line arguments |
| `status` | Human-readable process status |
| `environ` | Environment variables |
| `maps` | Memory mappings |
| `fd/` | Open file descriptors |
| `limits` | Resource limits |
| `io` | I/O statistics |
| `cgroup` | Cgroup membership |
| `net/` | Network information |

## Step 2: View Process Command Line

```bash
cat /proc/$(pgrep -o -x sshd)/cmdline | tr '\0' ' '
```

## Step 3: View Process Status

```bash
cat /proc/$(pgrep -o -x sshd)/status
```

Important fields include:
- `VmRSS` - Resident memory
- `VmSize` - Virtual memory size
- `Threads` - Number of threads
- `State` - Running, sleeping, zombie, etc.

## Step 4: List Open File Descriptors

```bash
ls -la /proc/$(pgrep -o -x nginx)/fd/
```

Each entry is a symlink to the actual file, socket, or pipe.

## Step 5: View Memory Maps

```bash
cat /proc/$(pgrep -o -x httpd)/maps
```

This shows every memory region: code segments, shared libraries, heap, stack, and mapped files.

## Step 6: Check Process I/O Statistics

```bash
cat /proc/$(pgrep -o -x myapp)/io
```

```bash
rchar: 1234567
wchar: 456789
read_bytes: 1024000
write_bytes: 512000
```

## Step 7: System-Wide Information

| File | Contents |
|------|----------|
| `/proc/cpuinfo` | CPU details |
| `/proc/meminfo` | Memory statistics |
| `/proc/loadavg` | Load averages |
| `/proc/uptime` | System uptime |
| `/proc/mounts` | Mounted filesystems |
| `/proc/net/dev` | Network interface statistics |
| `/proc/sys/` | Tunable kernel parameters |

```bash
cat /proc/meminfo | head -10
cat /proc/loadavg
```

## Step 8: Modify Kernel Parameters

Many `/proc/sys/` entries are writable:

```bash
sudo sh -c 'echo 1 > /proc/sys/net/ipv4/ip_forward'
```

To change the value for the current runtime, use sysctl:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

For persistent changes, write the setting to a sysctl configuration file:

```bash
printf 'net.ipv4.ip_forward = 1\n' | sudo tee /etc/sysctl.d/99-ip-forward.conf
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf
```

## Conclusion

The /proc filesystem on RHEL is an indispensable resource for process diagnostics. It provides direct access to kernel data structures without specialized tools, making it the foundation that utilities like `ps`, `top`, and `lsof` are built upon.
