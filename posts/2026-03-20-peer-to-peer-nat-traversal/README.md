# How to Implement Peer-to-Peer NAT Traversal for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, NAT Traversal, P2P, UDP, Networking, STUN

Description: Learn how peer-to-peer NAT traversal works for IPv4 networks, including UDP hole punching, STUN protocol for external IP discovery, and rendezvous server coordination.

## Why NAT Traversal Is Needed

```text
Peer A (192.168.1.10)   ←→   NAT (public IP 1.2.3.4)   ←→   Internet
Peer B (10.0.0.5)       ←→   NAT (public IP 5.6.7.8)   ←→   Internet
```

Peers behind NAT cannot connect directly using private IPs. NAT traversal techniques allow them to discover each other's public IP/port and establish a direct connection.

## Step 1: Discover External IP with STUN

```python
import socket
import struct

# Minimal STUN binding request

STUN_SERVERS = [
    ("stun.l.google.com",  19302),
    ("stun1.l.google.com", 19302),
]

def get_external_ip_port(local_port: int = 0) -> tuple[str, int]:
    """Use STUN to discover external IP and port (UDP hole punch address)."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", local_port))
    sock.settimeout(3.0)

    # STUN Binding Request (RFC 5389)
    # Message type 0x0001, length 0, magic cookie, transaction ID
    msg = struct.pack("!HHI12s",
        0x0001, 0, 0x2112A442,
        b"\x00" * 12  # transaction ID
    )

    for stun_host, stun_port in STUN_SERVERS:
        try:
            sock.sendto(msg, (stun_host, stun_port))
            data, _ = sock.recvfrom(2048)
            # Parse XOR-MAPPED-ADDRESS attribute (0x0020)
            # offset: 20 bytes header, then TLV attributes
            offset = 20
            while offset < len(data):
                attr_type   = struct.unpack_from("!H", data, offset)[0]
                attr_length = struct.unpack_from("!H", data, offset + 2)[0]
                if attr_type == 0x0020:  # XOR-MAPPED-ADDRESS
                    family = data[offset + 5]
                    if family == 0x01:   # IPv4
                        xport = struct.unpack_from("!H", data, offset + 6)[0]
                        xaddr = struct.unpack_from("!I", data, offset + 8)[0]
                        port  = xport ^ 0x2112
                        ip    = socket.inet_ntoa(struct.pack("!I", xaddr ^ 0x2112A442))
                        sock.close()
                        return ip, port
                # Attribute values are padded to 4-byte boundary (RFC 5389 §15)
                offset += 4 + ((attr_length + 3) & ~3)
        except Exception:
            continue

    sock.close()
    raise RuntimeError("STUN failed")

ext_ip, ext_port = get_external_ip_port(54321)
print(f"External address: {ext_ip}:{ext_port}")
```

## Step 2: Rendezvous Server

```python
# Simple UDP rendezvous server - runs on a public IP
import socket

peers: dict[str, tuple[str, int]] = {}

server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
server.bind(("0.0.0.0", 5000))
print("Rendezvous server on :5000")

while True:
    data, addr = server.recvfrom(1024)
    msg = data.decode().strip().split()
    cmd = msg[0]

    if cmd == "REGISTER" and len(msg) == 2:
        peer_name = msg[1]
        peers[peer_name] = addr
        server.sendto(f"OK {addr[0]} {addr[1]}".encode(), addr)

    elif cmd == "LOOKUP" and len(msg) == 2:
        target = msg[1]
        if target in peers:
            tip, tport = peers[target]
            server.sendto(f"PEER {tip} {tport}".encode(), addr)
        else:
            server.sendto(b"NOT_FOUND", addr)
```

## Step 3: UDP Hole Punching

```python
import socket
import time

def hole_punch(local_port: int, peer_ip: str, peer_port: int) -> socket.socket:
    """
    Send UDP packets to peer's NAT address to open a NAT mapping.
    Both peers must do this simultaneously (coordinated via rendezvous server).
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", local_port))
    sock.settimeout(5.0)

    # Send several punches to open the NAT mapping
    for _ in range(5):
        sock.sendto(b"PUNCH", (peer_ip, peer_port))
        time.sleep(0.1)

    # Wait for peer's punch to arrive
    try:
        data, addr = sock.recvfrom(1024)
        print(f"P2P connection established with {addr}")
        return sock
    except socket.timeout:
        raise RuntimeError("Hole punch failed - peers could not reach each other")
```

## Conclusion

UDP hole punching involves three steps: both peers use STUN to discover their external NAT address, exchange this information via a rendezvous server (on a public IP), and simultaneously send UDP packets to each other's external address to open symmetric NAT mappings. The key is simultaneity - both peers must send within a few seconds of each other. This technique works for most NAT types (full cone, address-restricted) but fails for symmetric NAT, which requires TURN relay as a fallback.
