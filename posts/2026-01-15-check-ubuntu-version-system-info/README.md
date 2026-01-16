# How to Check Ubuntu Version and System Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, System Information, Version, Administration, CLI, Tutorial

Description: Quick reference for checking Ubuntu version, kernel info, hardware specs, and system details using command-line tools.

---

Knowing your system's details is essential for troubleshooting, installing software, and following documentation. This guide covers all the ways to check Ubuntu version, kernel information, and hardware specifications.

## Check Ubuntu Version

### Using lsb_release

```bash
# Full release information
lsb_release -a

# Output:
# Distributor ID: Ubuntu
# Description:    Ubuntu 24.04 LTS
# Release:        24.04
# Codename:       noble
```

```bash
# Just the version number
lsb_release -r

# Just the codename
lsb_release -c

# Description only
lsb_release -d
```

### Using /etc/os-release

```bash
# View OS release file
cat /etc/os-release

# Output:
# PRETTY_NAME="Ubuntu 24.04 LTS"
# NAME="Ubuntu"
# VERSION_ID="24.04"
# VERSION="24.04 LTS (Noble Numbat)"
# VERSION_CODENAME=noble
# ID=ubuntu
# ID_LIKE=debian
```

```bash
# Extract specific info
grep VERSION /etc/os-release
grep PRETTY_NAME /etc/os-release
```

### Using hostnamectl

```bash
# System and OS information
hostnamectl

# Output includes:
# Operating System: Ubuntu 24.04 LTS
# Kernel: Linux 6.5.0-35-generic
# Architecture: x86-64
```

## Check Kernel Version

```bash
# Kernel version
uname -r
# Output: 6.5.0-35-generic

# Kernel name
uname -s
# Output: Linux

# All kernel information
uname -a
# Output: Linux server 6.5.0-35-generic #35-Ubuntu SMP PREEMPT_DYNAMIC ... x86_64 GNU/Linux

# Specific details
uname -m  # Architecture (x86_64)
uname -n  # Hostname
uname -v  # Kernel version string
uname -o  # Operating system
```

### Detailed Kernel Info

```bash
# Kernel release and version
cat /proc/version

# Kernel modules loaded
lsmod | head -20

# Kernel parameters
cat /proc/cmdline
```

## CPU Information

```bash
# CPU details
lscpu

# Key output:
# Architecture:            x86_64
# CPU(s):                  8
# Model name:              Intel(R) Core(TM) i7-10700 @ 2.90GHz
# CPU MHz:                 2900.000
# Cache sizes
```

```bash
# Detailed CPU info
cat /proc/cpuinfo

# Just CPU model
cat /proc/cpuinfo | grep "model name" | head -1

# Count CPU cores
nproc
# or
grep -c ^processor /proc/cpuinfo
```

## Memory Information

```bash
# Memory usage summary
free -h

# Output:
#               total        used        free      shared  buff/cache   available
# Mem:           15Gi       4.2Gi       8.1Gi       256Mi       3.0Gi        10Gi
# Swap:         2.0Gi          0B       2.0Gi
```

```bash
# Detailed memory info
cat /proc/meminfo

# Total RAM
grep MemTotal /proc/meminfo

# Available RAM
grep MemAvailable /proc/meminfo
```

## Disk Information

```bash
# Disk usage
df -h

# Disk usage for specific path
df -h /

# Inode usage
df -i

# Block devices
lsblk

# Detailed disk info
sudo fdisk -l

# Disk model and serial
sudo hdparm -I /dev/sda | grep -E "Model|Serial"
```

## Hardware Information

### Using lshw

```bash
# Install if needed
sudo apt install lshw -y

# Full hardware report
sudo lshw

# Summary view
sudo lshw -short

# Specific category
sudo lshw -C memory
sudo lshw -C processor
sudo lshw -C disk
sudo lshw -C network

# HTML report
sudo lshw -html > hardware.html
```

### Using inxi

```bash
# Install inxi
sudo apt install inxi -y

# System summary
inxi -Fxz

# Full details
inxi -Fxxxz

# Specific info
inxi -C  # CPU
inxi -D  # Disk
inxi -G  # Graphics
inxi -M  # Machine
inxi -N  # Network
```

### Using dmidecode

```bash
# BIOS information
sudo dmidecode -t bios

# System information
sudo dmidecode -t system

# Memory information
sudo dmidecode -t memory

# All hardware info
sudo dmidecode
```

## Network Information

```bash
# IP addresses
ip addr
# or
hostname -I

# Network interfaces
ip link show

# Network configuration
cat /etc/netplan/*.yaml

# DNS servers
cat /etc/resolv.conf
# or
resolvectl status

# Routing table
ip route

# Active connections
ss -tuln
```

## GPU Information

```bash
# List graphics hardware
lspci | grep -i vga
lspci | grep -i nvidia
lspci | grep -i amd

# Detailed GPU info
sudo lshw -C display

# NVIDIA GPU (if nvidia-smi installed)
nvidia-smi

# OpenGL info
glxinfo | grep -i "opengl"
```

## System Uptime and Load

```bash
# Uptime
uptime
# Output: 10:30:45 up 15 days, 3:25, 2 users, load average: 0.15, 0.10, 0.09

# Just uptime in human format
uptime -p
# Output: up 15 days, 3 hours, 25 minutes

# Since when system is running
uptime -s
# Output: 2024-01-01 07:05:30
```

## Process Information

```bash
# Running processes
ps aux | head -20

# Process count
ps aux | wc -l

# Top processes by CPU
ps aux --sort=-%cpu | head -10

# Top processes by memory
ps aux --sort=-%mem | head -10

# Interactive process viewer
top
# or
htop
```

## Service Status

```bash
# List all services
systemctl list-units --type=service

# Active services only
systemctl list-units --type=service --state=active

# Failed services
systemctl --failed

# Service status
systemctl status nginx
```

## System Logs

```bash
# System log
sudo journalctl -xe

# Boot log
sudo journalctl -b

# Kernel messages
dmesg | tail -50

# Specific service logs
sudo journalctl -u nginx
```

## Quick System Summary Script

```bash
#!/bin/bash
# System information summary

echo "=== Ubuntu Version ==="
lsb_release -d

echo -e "\n=== Kernel ==="
uname -r

echo -e "\n=== CPU ==="
lscpu | grep "Model name"
echo "Cores: $(nproc)"

echo -e "\n=== Memory ==="
free -h | grep Mem

echo -e "\n=== Disk ==="
df -h /

echo -e "\n=== Uptime ==="
uptime -p

echo -e "\n=== IP Address ==="
hostname -I
```

## Useful Aliases

Add to `~/.bashrc`:

```bash
# System info aliases
alias sysinfo='inxi -Fxz'
alias osver='lsb_release -a'
alias cpuinfo='lscpu | head -20'
alias meminfo='free -h'
alias diskinfo='df -h'
alias netinfo='ip addr show'
```

## GUI Tools

For desktop Ubuntu:

```bash
# System Settings
gnome-control-center info

# System Monitor
gnome-system-monitor

# Hardinfo (detailed GUI)
sudo apt install hardinfo
hardinfo
```

---

These commands provide comprehensive system information for troubleshooting, documentation, and system administration. Combine them in scripts for automated system audits or quick diagnostics.
