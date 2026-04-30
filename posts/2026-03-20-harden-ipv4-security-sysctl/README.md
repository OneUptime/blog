# How to Harden IPv4 Network Security with sysctl Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sysctl, Linux, Security, IPv4, Hardening, Kernel

Description: Apply a comprehensive set of sysctl parameters to harden the Linux kernel's IPv4 networking stack against spoofing, floods, and reconnaissance attacks.

The Linux kernel exposes hundreds of tunable security parameters via sysctl. Applying the right settings can block or constrain entire attack categories in the kernel networking stack before they reach applications.

## Key Security Parameters

The most important parameters fall into these categories:

```text
Category              Parameters
--------------------  ------------------------------------------
Spoofing prevention   rp_filter, martian logging
SYN flood defense     syncookies, syn backlog, SYN-ACK retries
ICMP security         ignore broadcasts, echo ignore, redirects
Routing security      accept_redirects, send_redirects
Logging               log_martians
```

## Anti-Spoofing and Martian Logging

```bash
# /etc/sysctl.d/99-security.conf

# Enable reverse path filtering (use 2 instead on hosts with asymmetric routing)

net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log packets with impossible source addresses (martians)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
```

## SYN Flood Protection and Handshake Tuning

```bash
# Enable SYN cookies when the SYN backlog overflows
net.ipv4.tcp_syncookies = 1

# Increase SYN backlog queue
net.ipv4.tcp_max_syn_backlog = 4096

# Reduce SYN-ACK retries (faster cleanup of half-open connections)
net.ipv4.tcp_synack_retries = 2

# Optional: reduce outbound SYN retries for faster failure of active connection attempts
net.ipv4.tcp_syn_retries = 5
```

## ICMP Hardening

```bash
# Ignore ICMP broadcast requests (prevents Smurf attack)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Suppress kernel warnings for bogus ICMP error responses
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Optional: ignore all pings (set to 1 to disable ping)
net.ipv4.icmp_echo_ignore_all = 0
```

## Disable ICMP Redirects

ICMP redirects can be used to manipulate routing tables:

```bash
# Do not accept ICMP redirect messages
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Do not send ICMP redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Do not accept secure redirects (from gateways)
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
```

## Disable Source Routing

Source routing allows the sender to specify the packet's path:

```bash
# Disable IPv4 source routing (used in spoofing/routing attacks)
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
```

## TCP Connection Settings

```bash
# Keep TCP timestamps enabled; modern kernels randomize timestamp offsets
net.ipv4.tcp_timestamps = 1

# Leave RFC 1337 mode disabled; Linux then prevents TIME_WAIT assassination
net.ipv4.tcp_rfc1337 = 0
```

## Apply the Core Settings

Create a sysctl configuration file:

```bash
# Create security hardening config
sudo tee /etc/sysctl.d/99-ipv4-security.conf << 'EOF'
# Anti-spoofing
# Use 2 instead of 1 on hosts with asymmetric routing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# ICMP hardening
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Disable redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
EOF

# Apply the settings
sudo sysctl -p /etc/sysctl.d/99-ipv4-security.conf

# Verify a key setting
sysctl net.ipv4.tcp_syncookies
# net.ipv4.tcp_syncookies = 1
```

These sysctl settings are a useful baseline for many Linux servers exposed to untrusted networks, but they should be tested against your routing and application requirements before broad deployment.
