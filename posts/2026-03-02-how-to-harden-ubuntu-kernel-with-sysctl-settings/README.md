# How to Harden Ubuntu Kernel with sysctl Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Kernel, Sysctl, Hardening

Description: Learn how to harden Ubuntu system security by configuring kernel parameters through sysctl to protect against network attacks, privilege escalation, and information disclosure.

---

The Linux kernel exposes hundreds of runtime parameters through the `/proc/sys/` filesystem. These parameters control network behavior, memory management, security policies, and system limits. Many default values prioritize compatibility and flexibility over security. For production servers, tuning these settings is a standard hardening step that can prevent or mitigate whole categories of attacks.

The `sysctl` command reads and writes these parameters. Persistent settings go in configuration files under `/etc/sysctl.d/`. This guide covers the most impactful security-focused sysctl settings for Ubuntu servers.

## How sysctl Works

Parameters live under `/proc/sys/` as virtual files organized into directories:
- `/proc/sys/net/` - network stack configuration
- `/proc/sys/kernel/` - core kernel behavior
- `/proc/sys/fs/` - filesystem settings
- `/proc/sys/vm/` - virtual memory management

You can read any parameter:

```bash
# Read a single parameter
sysctl net.ipv4.ip_forward

# Read all parameters
sysctl -a

# Read all with their current values
sysctl -a 2>/dev/null | grep -E "(net.ipv4|kernel.randomize)"
```

Temporary changes (lost on reboot):
```bash
sudo sysctl -w net.ipv4.ip_forward=0
```

Permanent changes via configuration file - create `/etc/sysctl.d/99-hardening.conf` and run `sudo sysctl -p /etc/sysctl.d/99-hardening.conf` to apply.

## Creating the Hardening Configuration File

Put all your hardened settings in one file:

```bash
sudo nano /etc/sysctl.d/99-hardening.conf
```

The sections below explain what each parameter does and why it matters.

## Network Stack Hardening

### IP Forwarding

Unless this server is acting as a router, IP forwarding should be disabled:

```ini
# Disable IPv4 packet forwarding
net.ipv4.ip_forward = 0

# Disable IPv6 packet forwarding
net.ipv6.conf.all.forwarding = 0
```

Forwarding enabled on a non-router lets an attacker use your server as a hop point in routing attacks.

### Source Routing

Source routing allows the sender to specify the route a packet should take. It's almost never used legitimately and is a classic attack vector:

```ini
# Disable source routing for all interfaces
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0
```

### ICMP Redirects

ICMP redirects are used to update a host's routing table. Accepting them from untrusted sources enables routing table poisoning:

```ini
# Do not accept ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Do not send ICMP redirects (we're not a router)
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
```

### Reverse Path Filtering

Reverse path filtering (Strict mode) verifies that the source address of an incoming packet is reachable through the interface it arrived on. This prevents IP spoofing:

```ini
# Enable strict reverse path filtering on all interfaces
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
```

### SYN Flood Protection

SYN cookies protect against SYN flood DoS attacks by sending back a cookie in the SYN-ACK without allocating state, so spoofed SYN packets don't exhaust connection table resources:

```ini
# Enable SYN cookie protection
net.ipv4.tcp_syncookies = 1

# Increase the maximum queue of half-open connections
net.ipv4.tcp_max_syn_backlog = 2048

# Number of times to retry SYN-ACK for incomplete connections
net.ipv4.tcp_synack_retries = 2

# Number of SYN retries for outgoing connections
net.ipv4.tcp_syn_retries = 5
```

### Bogus ICMP Error Responses

```ini
# Log martian packets (packets with impossible source addresses)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP broadcasts (Smurf attack protection)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP error responses
net.ipv4.icmp_ignore_bogus_error_responses = 1
```

### IPv6 Router Advertisements

Unless this system needs to autoconfigure its IPv6 address via SLAAC, disable router advertisement acceptance:

```ini
# Do not accept router advertisements
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
```

## Kernel Security Parameters

### Address Space Layout Randomization (ASLR)

ASLR randomizes memory layout to make buffer overflow exploitation harder. Ubuntu enables this by default, but verify it's at the maximum setting:

```ini
# Full ASLR randomization (0=off, 1=conservative, 2=full)
kernel.randomize_va_space = 2
```

### Restricting dmesg Access

The kernel ring buffer can contain sensitive information like memory addresses and hardware details that help attackers map the system:

```ini
# Restrict dmesg to root only
kernel.dmesg_restrict = 1
```

### Restricting /proc Access

Limit what unprivileged processes can see in `/proc`:

```ini
# Restrict ptrace to processes with CAP_SYS_PTRACE
kernel.yama.ptrace_scope = 1

# Hide kernel pointers from non-root users
kernel.kptr_restrict = 2
```

`ptrace_scope = 1` means only parent processes can ptrace their children, blocking tools like `gdb` from attaching to unrelated processes. This stops certain privilege escalation and credential dumping techniques.

### Restricting BPF

Berkeley Packet Filter (BPF) programs can be used for privilege escalation:

```ini
# Restrict unprivileged BPF
kernel.unprivileged_bpf_disabled = 1

# Enable JIT hardening for BPF programs
net.core.bpf_jit_harden = 2
```

### Panic on Kernel Oops

For servers that should not continue operating in a compromised or unstable state:

```ini
# Panic after 10 seconds on kernel oops (optional - uncomment for high-security environments)
# kernel.panic_on_oops = 1
# kernel.panic = 10
```

### Sysrq Key

The Magic SysRq key gives direct access to kernel functions. Restrict it in production:

```ini
# Disable SysRq key (or set to 4 to allow just sync)
kernel.sysrq = 0
```

## Filesystem Security

```ini
# Restrict symlink following to prevent TOCTOU attacks in world-writable directories
fs.protected_symlinks = 1
fs.protected_hardlinks = 1

# Restrict FIFO creation in world-writable sticky directories
fs.protected_fifos = 2
fs.protected_regular = 2
```

These settings prevent common local privilege escalation attacks that abuse symlinks in `/tmp` and similar directories.

## Virtual Memory Settings

```ini
# Prevent core dumps from setuid programs (reduces sensitive data exposure)
fs.suid_dumpable = 0

# Disable memory overcommit - prevents some OOM-based attacks
# 0=heuristic, 1=always allow, 2=never allow more than ratio allows
vm.overcommit_memory = 0
```

## Applying the Settings

After saving the configuration file, apply all settings:

```bash
# Apply settings from the specific file
sudo sysctl -p /etc/sysctl.d/99-hardening.conf

# Apply all settings from all files in /etc/sysctl.d/
sudo sysctl --system

# Verify a specific setting was applied
sysctl kernel.randomize_va_space
sysctl net.ipv4.tcp_syncookies
```

## Verifying Settings Survive Reboot

After rebooting, verify the settings are still applied:

```bash
# Check key settings
sysctl net.ipv4.conf.all.accept_redirects
sysctl kernel.kptr_restrict
sysctl fs.protected_symlinks
```

If settings reset after reboot, check that your file is in `/etc/sysctl.d/` (not `/etc/sysctl.conf` which can be overwritten by packages) and named with a `.conf` extension.

## Testing Network Behavior After Changes

After applying network settings, do basic connectivity tests:

```bash
# Confirm internet connectivity still works
ping -c 3 8.8.8.8

# Confirm DNS resolution works
host ubuntu.com

# Check that your services are still reachable
curl -s http://localhost/ > /dev/null && echo "HTTP OK"
```

## Complete Hardening Configuration

Here's the full configuration file combining all the above settings:

```bash
# /etc/sysctl.d/99-hardening.conf

# --- IP Forwarding ---
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# --- Source Routing ---
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# --- ICMP Redirects ---
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# --- Reverse Path Filtering ---
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# --- SYN Flood Protection ---
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# --- ICMP ---
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.log_martians = 1

# --- IPv6 ---
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0

# --- Kernel Security ---
kernel.randomize_va_space = 2
kernel.dmesg_restrict = 1
kernel.yama.ptrace_scope = 1
kernel.kptr_restrict = 2
kernel.sysrq = 0
kernel.unprivileged_bpf_disabled = 1
net.core.bpf_jit_harden = 2

# --- Filesystem ---
fs.protected_symlinks = 1
fs.protected_hardlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2
fs.suid_dumpable = 0
```

Apply it once and it persists through reboots. These settings cover the most important kernel-level hardening steps without breaking normal server operation.
