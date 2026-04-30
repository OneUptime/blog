# How to Perform IPv4 Traceroute Using Scapy in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, Traceroute, IPv4, ICMP, Networking

Description: Learn how to implement IPv4 traceroute using Scapy by incrementing TTL values and collecting ICMP Time Exceeded responses to map the network path.

## How Traceroute Works

Traceroute sends packets with incrementing TTL (Time to Live) values. When a router decrements TTL to 0, it sends back an ICMP "Time Exceeded" message. By collecting these responses, we can map each hop on the path to the destination.

These examples require privileges that allow Scapy to send packets, such as running with `sudo` on Linux or from an elevated command prompt on Windows.

## Basic Traceroute with ICMP

```python
from scapy.all import IP, ICMP, sr1, UDP

def traceroute_icmp(destination: str, max_hops: int = 30, timeout: int = 2) -> None:
    """Perform ICMP traceroute to the destination."""
    print(f"Traceroute to {destination} (max {max_hops} hops):\n")

    for ttl in range(1, max_hops + 1):
        # Craft IP packet with current TTL value
        packet = IP(dst=destination, ttl=ttl) / ICMP()

        reply = sr1(packet, timeout=timeout, verbose=False)

        if reply is None:
            print(f"  {ttl:2d}  * * * (no reply)")
            continue

        # Extract the replying hop's IP
        hop_ip = reply[IP].src

        # ICMP type 11 = Time Exceeded (router dropped our packet)
        # ICMP type 0  = Echo Reply (we reached the destination)
        if reply[ICMP].type == 11:
            print(f"  {ttl:2d}  {hop_ip}")
        elif reply[ICMP].type == 0:
            print(f"  {ttl:2d}  {hop_ip}  (destination reached)")
            break
        else:
            print(f"  {ttl:2d}  {hop_ip}  (ICMP type {reply[ICMP].type})")
            break

traceroute_icmp("8.8.8.8")
```

## Traceroute with RTT Measurement

```python
from scapy.all import IP, ICMP, sr1
import time

def traceroute_with_rtt(destination: str, max_hops: int = 30, probes: int = 3) -> None:
    """Traceroute with RTT measurement (3 probes per hop like real traceroute)."""
    print(f"traceroute to {destination}, {max_hops} hops max\n")

    for ttl in range(1, max_hops + 1):
        hop_ip = None
        rtts = []
        reached_destination = False

        for _ in range(probes):
            pkt = IP(dst=destination, ttl=ttl) / ICMP()
            t0 = time.time()
            reply = sr1(pkt, timeout=2, verbose=False)
            rtt = (time.time() - t0) * 1000

            if reply:
                hop_ip = reply[IP].src
                rtts.append(f"{rtt:.2f} ms")
                if ICMP in reply and reply[ICMP].type == 0:
                    reached_destination = True
            else:
                rtts.append("*")

        rtt_str = "  ".join(rtts)
        if hop_ip:
            print(f"  {ttl:2d}  {hop_ip:<18} {rtt_str}")
            if reached_destination:
                print("     (destination reached)")
                return
        else:
            print(f"  {ttl:2d}  * * *")

traceroute_with_rtt("8.8.8.8")
```

## UDP-Based Traceroute (Classic Unix Method)

```python
from scapy.all import IP, UDP, ICMP, sr1

def traceroute_udp(destination: str, max_hops: int = 30, base_port: int = 33434) -> None:
    """UDP traceroute (classic Unix traceroute method)."""
    print(f"UDP traceroute to {destination}:\n")

    for ttl in range(1, max_hops + 1):
        # Start at port 33434 and increment for each probe, like classic traceroute
        pkt = IP(dst=destination, ttl=ttl) / UDP(dport=base_port + ttl - 1)

        reply = sr1(pkt, timeout=2, verbose=False)

        if reply is None:
            print(f"  {ttl:2d}  *")
            continue

        hop_ip = reply[IP].src
        print(f"  {ttl:2d}  {hop_ip}")

        # ICMP type 3 code 3 = Port Unreachable = destination reached
        if ICMP in reply and reply[ICMP].type == 3 and reply[ICMP].code == 3:
            print("     (destination reached)")
            break
```

## Using Scapy's Built-In Traceroute

```python
from scapy.all import traceroute

# Scapy has a built-in TCP traceroute that returns results and can graph them

result, unans = traceroute(["8.8.8.8", "1.1.1.1"], maxttl=20, verbose=False)
result.show()

# Generate a visual graph (requires graphviz)
# result.graph(target="> /tmp/traceroute.svg")
```

## Conclusion

Implementing traceroute with Scapy requires incrementing the IPv4 TTL and collecting ICMP Time Exceeded replies. ICMP-based traceroute is simplest; UDP-based is the traditional Unix approach. Scapy's built-in `traceroute()` function handles the full implementation and can even render path graphs.
