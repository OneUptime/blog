# How to Generate IPv6 Traffic with TRex and Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TRex, Scapy, IPv6, Traffic Generation, Performance Testing, Lab

Description: Generate synthetic IPv6 traffic for testing with Cisco TRex for high-rate performance tests and Scapy for protocol-level packet crafting.

## Scapy IPv6 Packet Generation

Scapy provides Python-based packet crafting for protocol testing:

```python
from scapy.all import *
from scapy.layers.inet6 import *

# Send a single ICMPv6 ping

def send_icmpv6_ping(src, dst, count=3):
    responses = []

    for i in range(count):
        pkt = IPv6(src=src, dst=dst) / ICMPv6EchoRequest(id=0x1234, seq=i + 1)
        resp = sr1(pkt, timeout=2, verbose=False)
        if resp and resp.haslayer(ICMPv6EchoReply):
            print(f"Reply from {resp[IPv6].src}: seq={i+1}")
            responses.append(resp)
        elif resp:
            print(f"Unexpected response: {resp.summary()}")
        else:
            print(f"Timeout: seq={i+1}")

    return responses

send_icmpv6_ping("2001:db8::1", "2001:db8::2")
```

## Paced IPv6 Packet Generation with Scapy

```python
from scapy.all import *
from scapy.layers.inet6 import *
import time

def generate_ipv6_udp_flood(src_net, dst, port, pps, duration, iface="eth0"):
    """Generate UDP packets at a target packets-per-second rate"""

    import ipaddress
    network = ipaddress.IPv6Network(src_net)
    if pps <= 0:
        raise ValueError("pps must be > 0")

    dst_mac = getmacbyip6(dst)
    if dst_mac is None:
        raise RuntimeError(f"Could not resolve a next-hop MAC for {dst}")

    packet_count = 0
    start = time.time()
    interval = 1.0 / pps

    print(f"Sending {pps} pkt/s to [{dst}]:{port} on {iface} for {duration}s")

    while time.time() - start < duration:
        # Rotate source address without materializing the whole subnet.
        if network.prefixlen >= 127:
            src = str(network.network_address + (packet_count % network.num_addresses))
        else:
            usable_hosts = network.num_addresses - 1
            src = str(network.network_address + 1 + (packet_count % usable_hosts))

        pkt = (Ether(dst=dst_mac) /
               IPv6(src=src, dst=dst) /
               UDP(sport=RandShort(), dport=port) /
               Raw(b'X' * 64))

        sendp(pkt, iface=iface, verbose=False)
        packet_count += 1
        time.sleep(interval)

    elapsed = time.time() - start
    print(f"Sent {packet_count} packets in {elapsed:.1f}s ({packet_count/elapsed:.0f} pkt/s)")

# Generate 1000 pkt/s for 10 seconds
generate_ipv6_udp_flood("2001:db8::/64", "2001:db8:2::1", 9000, 1000, 10)
```

## TRex IPv6 Traffic Profile

Cisco TRex is a stateless traffic generator capable of line-rate packet generation:

```python
# trex_ipv6_profile.py - TRex traffic profile for IPv6

from trex.stl.api import *

class IPv6Profile:
    def get_streams(self, direction=0, **kwargs):
        # High-rate IPv6 UDP load stream
        pkt = STLPktBuilder(
            pkt=Ether() /
                IPv6(src="2001:db8:1::1", dst="2001:db8:2::1") /
                UDP(sport=1024, dport=5001) /
                Raw(b'P' * 64)
        )

        return [
            STLStream(
                packet=pkt,
                mode=STLTXCont(pps=1_000_000),  # 1 Mpps
            )
        ]

def register():
    return IPv6Profile()
```

```bash
# Start TRex server
sudo ./t-rex-64 -i

# In another shell, connect with the TRex console
./trex-console

# Load and start the IPv6 profile
trex> start -f trex_ipv6_profile.py -p 0 --force

# View statistics
trex> stats

# Stop
trex> stop -a
```

## NDP Stress Testing with Scapy

```python
from scapy.all import *
from scapy.layers.inet6 import *
import ipaddress
import time

def send_neighbor_solicitations(src, target_addr, iface, count=100):
    """Send multiple NDP Neighbor Solicitations to stress-test NDP cache"""

    target = ipaddress.IPv6Address(target_addr)
    low24 = int(target) & 0xffffff
    mcast = ipaddress.IPv6Address(int(ipaddress.IPv6Address("ff02::1:ff00:0")) | low24)
    iface_mac = get_if_hwaddr(iface)
    dst_mac = "33:33:%02x:%02x:%02x:%02x" % tuple(mcast.packed[-4:])

    pkt = (Ether(dst=dst_mac, src=iface_mac) /
           IPv6(src=src, dst=str(mcast), hlim=255) /
           ICMPv6ND_NS(tgt=target_addr) /
           ICMPv6NDOptSrcLLAddr(lladdr=iface_mac))

    print(f"Sending {count} NS to {target_addr}")
    for i in range(count):
        sendp(pkt, iface=iface, verbose=False)
        time.sleep(0.01)

    print("Done. Check NDP cache with: ip -6 neigh show")

send_neighbor_solicitations("2001:db8::2", "2001:db8::1", "eth0", 50)
```

## TCP Connection Rate Tester

```python
import socket
import time
import threading

def tcp_connect_rate(host, port, duration, workers=50):
    """Measure IPv6 TCP connection rate"""

    connected = [0]
    failed = [0]
    stop = threading.Event()
    lock = threading.Lock()

    def worker():
        while not stop.is_set():
            try:
                with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                    s.settimeout(2)
                    s.connect((host, port, 0, 0))
                with lock:
                    connected[0] += 1
            except Exception:
                with lock:
                    failed[0] += 1

    threads = [threading.Thread(target=worker) for _ in range(workers)]
    for t in threads: t.start()

    time.sleep(duration)
    stop.set()
    for t in threads: t.join()

    total = connected[0] + failed[0]
    print(f"TCP connect rate to [{host}]:{port}")
    print(f"  Total: {total} in {duration}s ({total/duration:.0f} conn/s)")
    print(f"  Success: {connected[0]}, Failed: {failed[0]}")

tcp_connect_rate("2001:db8::1", 80, 10, workers=20)
```

## Conclusion

Scapy is the most flexible tool for protocol-level IPv6 traffic generation in test labs, but it is not designed for line-rate throughput. TRex enables line-rate IPv6 testing for performance benchmarking and capacity planning. NDP stress tests using Scapy ICMPv6 ND packets validate neighbor discovery behavior under load. TCP connection rate tests measure server IPv6 stack performance. Combine these tools with network namespace topologies for comprehensive IPv6 stack testing.
