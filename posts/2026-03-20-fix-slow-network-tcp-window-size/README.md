# How to Diagnose and Fix Slow Network Caused by TCP Window Size Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP Window Size, Throughput, Performance, Wireshark, Linux

Description: Learn how to diagnose and fix slow network performance caused by insufficient TCP window sizes, which limit throughput especially on high-latency or high-bandwidth links.

## Why TCP Window Size Matters

TCP window size limits how much data can be in-flight before the sender must wait for an acknowledgment. On high-latency links, a small window creates a bandwidth bottleneck:

```text
Max throughput = Window Size / RTT

Example: Window = 64KB, RTT = 50ms
Max throughput = 65536 bytes / 0.050s = 1.3 MB/s = 10.5 Mbps
Even on a 1 Gbps link, you'll only get 10.5 Mbps with this window!
```

## Step 1: Measure Actual vs Expected Throughput

```bash
# Measure current throughput

iperf3 -c server_ip -t 30

# Check if TCP window size is limiting factor
iperf3 -c server_ip -t 30 -w 4M     # Request a 4 MiB socket buffer/window
iperf3 -c server_ip -t 30 -w 256K   # Request a 256 KiB socket buffer/window
# On Linux, the effective buffer/window can be about 2x the requested value

# If larger window gives significantly higher throughput,
# the default window size is the bottleneck
```

## Step 2: Check Current TCP Buffer Settings

```bash
# Linux - view current TCP buffer limits
sysctl net.ipv4.tcp_rmem    # Receive buffer: min/default/max
sysctl net.ipv4.tcp_wmem    # Send buffer: min/default/max
sysctl net.core.rmem_max    # Socket receive buffer max
sysctl net.core.wmem_max    # Socket send buffer max

# Example output:
# net.ipv4.tcp_rmem = 4096    131072    6291456
# Values: minimum, default, maximum (bytes)

# Check if window scaling is enabled
sysctl net.ipv4.tcp_window_scaling
# Should be 1 (enabled)
```

## Step 3: Calculate Required Buffer Size

```bash
# BDP (Bandwidth-Delay Product) = Bandwidth × RTT
# This tells you the minimum buffer needed for full throughput

# Measure RTT to server
ping -c 20 server_ip | tail -1
# avg RTT = 30ms

# Calculate BDP for 1 Gbps link with 30ms RTT
python3 -c "
bandwidth_bps = 1_000_000_000   # 1 Gbps
rtt_seconds = 0.030             # 30ms
bdp = bandwidth_bps * rtt_seconds / 8  # bytes
print(f'Required buffer: {bdp/1024/1024:.1f} MiB')
"
# Required buffer: 3.6 MiB
```

## Step 4: Tune TCP Buffers on Linux

```bash
# /etc/sysctl.conf - add these settings
sudo tee -a /etc/sysctl.conf << 'EOF'

# Socket and TCP buffer limits
net.core.rmem_max = 134217728       # 128 MB socket receive buffer max
net.core.wmem_max = 134217728       # 128 MB socket send buffer max
net.core.rmem_default = 31457280    # 30 MB default for protocols using net.core defaults
net.core.wmem_default = 31457280    # 30 MB default for protocols using net.core defaults

net.ipv4.tcp_rmem = 4096 87380 134217728   # TCP receive buffer: min/default/max
net.ipv4.tcp_wmem = 4096 65536 134217728   # TCP send buffer: min/default/max

# Enable window scaling (RFC 1323)
net.ipv4.tcp_window_scaling = 1

# Use autotuning
net.ipv4.tcp_moderate_rcvbuf = 1
EOF

sudo sysctl -p
```

## Step 5: Check for Window Size Issues in Wireshark

```text
Wireshark filters for window size problems:

1. Find Zero Window (receiver buffer full):
   tcp.analysis.zero_window

2. Find Window Size Updates:
   tcp.analysis.window_update

3. Find TCP Window Full (receiver-advertised window is full):
   tcp.analysis.window_full

4. Calculate throughput stream:
   Statistics → TCP Stream Graphs → Throughput
   A low throughput ceiling plus window_full/zero_window events suggests window exhaustion
```

## Step 6: Fix Windows TCP Auto-Tuning

```cmd
REM Windows - check auto-tuning status
netsh int tcp show global
REM Look for: Receive Window Auto-Tuning Level: disabled (BAD)

REM Enable auto-tuning
netsh int tcp set global autotuninglevel=normal

REM Windows also supports experimental for testing or unusual scenarios
netsh int tcp set global autotuninglevel=experimental

REM Verify
netsh int tcp show global
```

## Step 7: Per-Application Socket Buffer Tuning

```python
import socket

# Set large buffers for a high-throughput application
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Request 4MB receive and send buffers
sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 * 1024 * 1024)

# Verify what was actually granted (OS may cap it; Linux may report about 2x)
actual_rcvbuf = sock.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)
actual_sndbuf = sock.getsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF)
print(f"Receive buffer: {actual_rcvbuf / 1024:.0f} KB")
print(f"Send buffer: {actual_sndbuf / 1024:.0f} KB")
```

## Conclusion

TCP window size bottlenecks are identified when `iperf3` with a larger requested buffer (`-w 4M`) significantly outperforms defaults. The required buffer size is BDP = Bandwidth × RTT. Fix on Linux by setting `net.ipv4.tcp_rmem` and `net.ipv4.tcp_wmem` in `/etc/sysctl.conf`, ensuring `tcp_window_scaling = 1`. On Windows, enable TCP auto-tuning with `netsh int tcp set global autotuninglevel=normal`. Use Wireshark's `tcp.analysis.window_full` and `tcp.analysis.zero_window` filters to confirm receiver-window exhaustion is happening.
