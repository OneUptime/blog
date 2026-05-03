# How to Debug UDP Packet Ordering Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Packet Ordering, Reordering, Debugging, Networking, Linux

Description: Identify and handle UDP packet reordering caused by ECMP routing, parallel paths, or network equipment using sequence numbers and packet capture analysis.

## Introduction

UDP provides no ordering guarantees. Packets sent sequentially can arrive in a different order at the receiver - this is "reordering." It is more common than most engineers expect, especially in networks with ECMP (Equal-Cost Multi-Path) routing or bonded interfaces. Reordering causes problems for applications that expect in-order data: audio becomes garbled, video has artifacts, and protocols relying on ordering fail silently.

## Detecting Reordering

```bash
# Method 1: Send numbered packets and check arrival order

# Sender:
python3 << 'EOF'
import socket, struct, time

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
for seq in range(100):
    payload = struct.pack('!I', seq) + b'X' * 100
    sock.sendto(payload, ('10.20.0.5', 5000))
    time.sleep(0.001)  # 1ms apart
sock.close()
print("Sent 100 packets")
EOF

# Receiver:
python3 << 'EOF'
import socket, struct

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(('0.0.0.0', 5000))
sock.settimeout(5)

received_order = []
try:
    while True:
        data, _ = sock.recvfrom(200)
        seq = struct.unpack('!I', data[:4])[0]
        received_order.append(seq)
except socket.timeout:
    pass

# Analyze order:
reordered = sum(1 for i in range(1, len(received_order))
                if received_order[i] < received_order[i-1])
print(f"Received {len(received_order)} packets")
print(f"Reordering events: {reordered}")
print(f"Expected order: {list(range(100))[:10]}")
print(f"Actual first 10: {received_order[:10]}")
EOF
```

## Detect Reordering with tcpdump

```bash
# Capture UDP traffic and check sequence numbers (if protocol includes them)
tcpdump -i eth0 -n -X 'udp port 5000' | head -100

# For RTP streams: check RTP sequence numbers
# RTP header: first 4 bytes include sequence number at offset 2
# Wireshark does this automatically for RTP:
# Telephony → RTP → RTP Streams → click stream → Analyze

# Check for reordering in iperf3 UDP:
iperf3 -c 10.20.0.5 -u -b 100M -t 30
# iperf3 reports "out-of-order" count in its output
```

## Root Causes of UDP Reordering

```bash
# 1. ECMP (Equal-Cost Multi-Path) routing
# Different packets take different paths with different latencies
# Check if route has multiple next hops:
ip route show | grep -E "nexthop|via.*via"
# Multiple "nexthop" entries = ECMP = potential reordering

# 2. Bonded / LACP interfaces
# Packets distributed across bonded links
cat /proc/net/bonding/bond0 | grep -E "Transmit Hash|policy"
# Hash policy: layer3+4 (port-based) less likely to reorder than layer2

# 3. Network equipment with multiple forwarding engines
# Some switches/routers process different flows on different ASICs

# 4. Virtual switches (OVS, Linux bridge with bonding)
ip link show type bond
ip link show type bridge
```

## Application-Level Reordering Handling

```python
#!/usr/bin/env python3
# Reorder buffer: reassemble out-of-order UDP packets

import socket
import struct
import heapq
import time

class ReorderBuffer:
    def __init__(self, max_wait_ms=50):
        self.buffer = []  # min-heap by seq_num
        self.next_expected = 0
        self.max_wait_ms = max_wait_ms
        self.last_push_time = {}

    def push(self, seq_num, data):
        heapq.heappush(self.buffer, (seq_num, time.time(), data))

    def pop_in_order(self):
        """Return packets in order, flushing late packets after timeout."""
        result = []
        now = time.time()

        while self.buffer:
            seq, push_time, data = self.buffer[0]

            # Deliver if it's the expected next packet
            if seq == self.next_expected:
                heapq.heappop(self.buffer)
                result.append((seq, data))
                self.next_expected += 1

            # Or if it's been waiting too long (flush gap)
            elif (now - push_time) * 1000 > self.max_wait_ms:
                heapq.heappop(self.buffer)
                # Skip gap: seq > next_expected
                if seq > self.next_expected:
                    print(f"Warning: dropped gap {self.next_expected}-{seq-1}")
                    self.next_expected = seq + 1
                    result.append((seq, data))
            else:
                break  # Wait for missing packet

        return result

# Usage:
reorder_buf = ReorderBuffer(max_wait_ms=50)
```

## Conclusion

UDP packet reordering is a natural consequence of modern networks using multiple paths. Detect it by sending numbered packets and checking arrival order, or by analyzing RTP sequence numbers in Wireshark. Root causes are usually ECMP routing or bonded interfaces. Applications that cannot tolerate reordering must implement a reorder buffer: hold out-of-order packets and deliver them in sequence, with a timeout to flush gaps caused by actual loss rather than reordering.
