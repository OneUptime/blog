# How to Send ICMP Ping Requests over IPv4 with Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, ICMP, IPv4, Ping, Networking

Description: Learn how to send ICMP echo requests (ping) over IPv4 using Scapy, including custom payloads, bulk pinging, and round-trip time measurement.

## ICMP Ping Basics

ICMP Echo Request (type 8) and Echo Reply (type 0) form the basis of the `ping` utility. Scapy lets you craft these packets manually, giving full control over ICMP fields and payloads.

## Simple Ping

```python
from scapy.all import IP, ICMP, sr1
import time

def ping(host: str, timeout: int = 2) -> dict | None:
    """Send one ICMP Echo Request and return reply info."""
    packet = IP(dst=host) / ICMP()

    start = time.time()
    reply = sr1(packet, timeout=timeout, verbose=False)
    rtt = (time.time() - start) * 1000  # Convert to milliseconds

    if reply is None:
        return None

    return {
        "host": host,
        "src": reply[IP].src,
        "ttl": reply[IP].ttl,
        "rtt_ms": round(rtt, 2),
        "icmp_type": reply[ICMP].type,
        "icmp_code": reply[ICMP].code,
    }

# Ping a host

result = ping("8.8.8.8")
if result and result["icmp_type"] == 0:
    print(f"Reply from {result['src']}: TTL={result['ttl']} time={result['rtt_ms']}ms")
elif result:
    print(f"Host replied with ICMP type={result['icmp_type']} code={result['icmp_code']}")
else:
    print("Request timeout")
```

## Ping with Custom Payload

```python
from scapy.all import IP, ICMP, Raw, sr1

# Add a custom payload to the ICMP packet
packet = (
    IP(dst="192.168.1.1") /
    ICMP(type=8, code=0, id=1, seq=1) /
    Raw(load=b"Hello from Scapy!" * 3)  # 51-byte payload
)

reply = sr1(packet, timeout=2, verbose=False)
if reply:
    print(f"Got reply: {reply.summary()}")
```

## Continuous Ping

```python
from scapy.all import IP, ICMP, Raw, sr1
import time

def continuous_ping(host: str, count: int = 5, interval: float = 1.0):
    """Send multiple pings like the classic ping command."""
    payload = b"X" * 32
    print(f"Pinging {host} with {len(payload)} bytes of data:")
    sent = received = 0

    for seq in range(1, count + 1):
        pkt = IP(dst=host) / ICMP(seq=seq) / Raw(load=payload)
        start = time.time()
        reply = sr1(pkt, timeout=2, verbose=False)
        rtt = (time.time() - start) * 1000
        sent += 1

        if reply and ICMP in reply and reply[ICMP].type == 0:
            received += 1
            print(
                f"Reply from {reply[IP].src}: bytes={len(bytes(reply[ICMP].payload))} "
                f"time={rtt:.1f}ms TTL={reply[IP].ttl}"
            )
        else:
            print(f"Request timeout for seq={seq}")

        if seq < count:
            time.sleep(interval)

    loss_pct = ((sent - received) / sent) * 100
    print(f"\nPing statistics for {host}:")
    print(f"  Packets: Sent = {sent}, Received = {received}, "
          f"Lost = {sent - received} ({loss_pct:.0f}% loss)")

continuous_ping("8.8.8.8", count=4)
```

## Bulk Ping Multiple Hosts

```python
from scapy.all import IP, ICMP, sr
from scapy.all import conf

def ping_sweep(network_prefix: str, start: int = 1, end: int = 10):
    """Ping a range of IPs and return which are alive."""
    targets = [f"{network_prefix}.{i}" for i in range(start, end + 1)]

    # Build all packets
    packets = [IP(dst=ip) / ICMP() for ip in targets]

    # sr() sends all packets and collects replies (timeout shared)
    answered, unanswered = sr(packets, timeout=2, verbose=False)

    alive = [r[1][IP].src for r in answered if ICMP in r[1] and r[1][ICMP].type == 0]
    return alive

alive_hosts = ping_sweep("192.168.1", 1, 20)
print(f"Alive hosts: {alive_hosts}")
```

## ICMP Packet Fields

| Field | Description | Common Values |
|-------|-------------|---------------|
| `type` | ICMP message type | 8=Request, 0=Reply, 3=Unreachable |
| `code` | Sub-type | 0 for echo request/reply |
| `id` | Identifier | Match request/reply |
| `seq` | Sequence number | Incremented per packet |

## Conclusion

Scapy makes ICMP ping trivial with `IP(dst=host) / ICMP()`. Use `sr1()` for single packets and `sr()` for bulk operations. RTT measurement, custom payloads, and host sweeps are all achievable with a few lines of Python. Root privileges are required.
