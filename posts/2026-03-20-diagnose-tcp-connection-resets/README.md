# How to Diagnose and Fix TCP Connection Resets (RST Packets)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP RST, Connection Reset, Wireshark, tcpdump, Troubleshooting

Description: Learn how to diagnose TCP connection resets by capturing and analyzing RST packets with tcpdump and Wireshark, then identify whether the cause is firewall rules, application errors, timewall...

## What Causes TCP RST Packets?

RST (Reset) packets immediately abort a TCP connection. Sources include:
- **Application abort**: An application or kernel aborts the socket instead of closing it gracefully
- **Firewall reject**: A firewall `REJECT` rule can send a TCP RST
- **Load balancer timeout**: Some load balancers reset idle connections after their timeout
- **TCP keepalive failure**: On sockets with keepalive enabled, failed probes make the OS mark the connection as broken
- **NAT table expiry**: Connection state is removed, and a later packet may trigger a RST from a stateful device or endpoint
- **Port scan response**: Target port is closed (not listening)

## Step 1: Capture RST Packets

```bash
# Capture all TCP RST packets

sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0' -v -n

# Example RST output:
# 12:05:01.234 IP 192.168.1.100.80 > 10.0.0.50.54321: Flags [R.], seq 0, ack 1, win 0
# "Flags [R.]" = RST+ACK
# "Flags [R]"  = RST only

# Capture RSTs for a specific connection
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0 and host 192.168.1.100' -v -n

# Save the full conversation for Wireshark analysis
sudo tcpdump -i eth0 -s 0 host 192.168.1.100 -w /tmp/rst-capture.pcap
```

## Step 2: Identify the Source of RSTs

```bash
# Count RSTs by source IP - which device is sending them?
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0' -n 2>/dev/null | \
    awk '{print $3}' | sed 's/\.[0-9]*$//' | sort | uniq -c | sort -rn | head -10

# If RSTs come FROM the server:
# → The server kernel/application reset the flow, or a firewall on the server path injected it

# If RSTs come FROM the client:
# → The client application/kernel reset the flow, or the client no longer had state for it

# If RSTs come FROM a middle device (different IP from server/client):
# → A firewall, IDS/IPS, or load balancer is likely injecting the RSTs
```

## Step 3: Wireshark Analysis

```text
Wireshark filters for RST analysis:

1. All RST packets:
   tcp.flags.reset == 1

2. RST in established connections (not port-closed responses):
   tcp.flags.reset == 1 and tcp.completeness.syn == 1 and tcp.completeness.syn-ack == 1 and tcp.completeness.ack == 1

3. Show complete stream around the RST:
   Follow → TCP Stream (right-click on RST packet)

4. Find RST after idle period:
   tcp.flags.reset == 1 and tcp.time_delta > 60

Statistics → Conversations → TCP
Shows connection duration - very short durations suggest RST issues
```

## Step 4: Check Firewall for RST Injection

```bash
# iptables - check for REJECT rules (send RST to TCP)
sudo iptables -L -n | grep -i "reject\|rst"

# REJECT --reject-with tcp-reset sends RST to client
# REJECT --reject-with icmp-port-unreachable sends ICMP

# Check conntrack state counts
sudo conntrack -L -p tcp --state ESTABLISHED | wc -l
sudo conntrack -L -p tcp --state TIME_WAIT | wc -l

# A high TIME_WAIT count can be normal after short-lived traffic
# If long-lived flows disappear before the app times out, review conntrack/NAT timeout values
```

## Step 5: Fix Idle Connection Timeouts

```bash
# Linux - TCP keepalive settings
# Keepalive probes can help prevent NAT/firewall state expiry on sockets with SO_KEEPALIVE enabled

sysctl net.ipv4.tcp_keepalive_time     # 7200 = 2 hours (Linux default)
sysctl net.ipv4.tcp_keepalive_intvl   # 75 seconds between probes
sysctl net.ipv4.tcp_keepalive_probes  # 9 probes before the connection is declared broken

# Reduce keepalive time to detect failures sooner
sudo tee -a /etc/sysctl.conf << 'EOF'
net.ipv4.tcp_keepalive_time = 300     # Send first keepalive after 5 min idle
net.ipv4.tcp_keepalive_intvl = 30    # Then every 30 seconds
net.ipv4.tcp_keepalive_probes = 3    # Give up after 3 missed probes
EOF
sudo sysctl -p
```

## Step 6: Fix Application-Level RSTs

```python
# Python - handle connection resets gracefully and reconnect
import socket
import time

def request_with_retry(host, port, payload, retries=3, delay=2):
    """Retry when an established connection is reset."""
    for attempt in range(retries):
        try:
            with socket.create_connection((host, port), timeout=5) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
                sock.sendall(payload)
                return sock.recv(4096)
        except (ConnectionResetError, BrokenPipeError) as e:
            print(f"Connection reset on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                time.sleep(delay)
        except ConnectionRefusedError as e:
            print(f"Connection refused on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                time.sleep(delay)
    raise ConnectionError(f"Failed after {retries} attempts")

# Enable SO_KEEPALIVE to help prevent idle NAT/firewall state expiry
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
```

## Step 7: Monitor RST Rate Over Time

```bash
# Watch RST rate using nstat
nstat -az -d 1 | grep -E 'TcpAttemptFails|TcpEstabResets'

# High TcpEstabResets = existing connections being forcefully closed
# High TcpAttemptFails = connection attempts failing before ESTABLISHED

# Monitor with ss
ss -tanH | awk '{print $1}' | sort | uniq -c
# Watch TIME-WAIT count - should stabilize, not grow indefinitely
```

## Conclusion

TCP RSTs are captured with `tcpdump 'tcp[tcpflags] & tcp-rst != 0'` and analyzed in Wireshark using the `tcp.flags.reset == 1` filter. Identify the RST source: if it comes from a third IP, a middlebox is likely injecting RSTs. For idle timeout issues, reduce `tcp_keepalive_time` and enable `SO_KEEPALIVE` on the sockets that need it. Use `nstat` to watch `TcpEstabResets` and `TcpAttemptFails`, then follow the full TCP stream in Wireshark to see what data preceded each RST.
