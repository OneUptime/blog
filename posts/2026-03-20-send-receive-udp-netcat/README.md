# How to Send and Receive UDP Packets on Linux with netcat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, netcat, Linux, Networking, Testing, Socket

Description: Use netcat (nc) to send and receive UDP packets on Linux for testing UDP services, verifying port availability, and debugging UDP-based protocols.

## Introduction

`netcat` is the TCP/IP Swiss Army knife, and its UDP mode is just as useful as TCP mode. You can use it to probe whether a UDP service responds, send test payloads to UDP services, build simple UDP echo servers for debugging, and verify that UDP traffic is flowing through firewalls and NAT correctly. Unlike TCP, there is no connection state, so netcat exits or continues sending based on flags you provide.

## Basic UDP Send and Receive

```bash
# Terminal 1: Listen for UDP on port 5000

nc -ul 5000
# -u: UDP mode
# -l: listen mode

# Terminal 2: Send a UDP packet
echo "hello udp" | nc -u 127.0.0.1 5000
# Sends "hello udp\n" to localhost:5000 UDP

# Terminal 1 will print: hello udp
```

## Persistent UDP Listener

```bash
# Without -k, behavior depends on nc variant:
# OpenBSD nc stays attached to the first UDP peer; some variants exit after one peer.
# Portable fallback for variants that exit:
while true; do
    nc -ul 5000
    echo "[nc restarted, waiting...]"
done

# Or use nc -k (keep-open, available in OpenBSD nc and Ncat):
nc -ulk 5000  # OpenBSD nc / Ncat-compatible nc

# Check which options your netcat supports:
nc -h 2>&1 | head -1
# OpenBSD netcat: -k with -u keeps the UDP socket unconnected for multiple hosts
# Ncat: -k/--keep-open supported with -l
```

## UDP Echo Test

```bash
# Create a UDP echo server with ncat (receives and sends back)
ncat -u -l 5000 --keep-open --exec /bin/cat
# --exec /bin/cat sends each client's input back to that client

# Simpler echo server using socat (more reliable for UDP):
socat UDP4-LISTEN:5000,fork PIPE

# Test it:
echo "ping" | nc -u -w 1 127.0.0.1 5000
```

## Testing UDP Port Availability

```bash
# Send a UDP probe to test if port is reachable
# Note: UDP gives no confirmation unless the service responds

# Method 1: Send data and wait for response
echo "test" | nc -u -w 2 10.20.0.5 53
# -w 2: wait 2 seconds for response
# If nothing: port may be open, filtered, or closed without a visible ICMP error

# Method 2: Check for ICMP port unreachable (port closed)
# Terminal 1: capture ICMP errors from the target
sudo tcpdump -i eth0 -n 'icmp and host 10.20.0.5'
# Terminal 2: send a UDP probe
echo "test" | nc -u -w 2 10.20.0.5 5000
# ICMP type 3/code 3 (port unreachable) means the UDP port is closed

# Method 3: nmap UDP scan (most reliable)
sudo nmap -sU -p 53 10.20.0.5
# Uses raw packets on Unix; reports open, closed, filtered, or open|filtered from UDP/ICMP responses
```

## Sending Specific Payloads

```bash
# Send hex payload
printf '\x00\x0a\x01\x00' | nc -u 10.20.0.5 5000

# Send a DNS query (raw):
# This queries for "google.com" A record
python3 -c "
import socket
# Minimal DNS query for google.com type A
query = b'\x00\x01\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00'
query += b'\x06google\x03com\x00'
query += b'\x00\x01\x00\x01'
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.sendto(query, ('8.8.8.8', 53))
data, _ = s.recvfrom(512)
print('Got response:', len(data), 'bytes')
"

# Send a file over UDP (unreliable; datagrams may be fragmented or dropped)
nc -u 10.20.0.5 5000 < /tmp/testfile
# Note: large files need application framing/retry logic; UDP does not provide reliable ordered delivery
```

## UDP with Timeout

```bash
# Send and wait for response with timeout
echo "query" | nc -u -w 3 10.20.0.5 5000
# -w 3: exit 3 seconds after last activity

# For scripted testing:
if echo "test" | nc -u -w 2 10.20.0.5 5000 | grep -q "expected_response"; then
    echo "Service responded correctly"
else
    echo "Service unavailable or wrong response"
fi
```

## Debugging UDP Traffic Flow

```bash
# In one terminal: capture UDP traffic
sudo tcpdump -i eth0 -n 'udp port 5000'

# In another: send test packets
for i in $(seq 1 5); do
    echo "packet $i" | nc -u 10.20.0.5 5000
    sleep 0.5
done

# Verify each packet appears in tcpdump output
# If packets appear at sender but not receiver: firewall or routing issue
# If packets appear at receiver but app doesn't respond: application issue
```

## Conclusion

`netcat` in UDP mode (`-u`) is the fastest way to verify UDP connectivity. Send a test packet with `echo | nc -u host port`, listen with `nc -ul port`, and combine with `tcpdump` to see exactly where packets reach. Remember: unlike TCP, there is no confirmation of delivery in UDP itself - you only know a packet arrived if the application responds. ICMP port unreachable is the automatic signal that a closed UDP port may provide, but it can be filtered or rate-limited.
