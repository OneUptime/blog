# How to Understand NAT Types (Full Cone, Restricted, Symmetric)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, IPv4, VoIP, Gaming

Description: Learn the four NAT types defined by RFC 3489 - Full Cone, Restricted Cone, Port Restricted Cone, and Symmetric - and their impact on peer-to-peer and VoIP applications.

## Why NAT Types Matter

Different NAT behaviors affect:
- **Peer-to-peer applications** (gaming, WebRTC, torrents)
- **VoIP (SIP/RTP)** - media traversal
- **NAT traversal** (STUN, TURN, ICE)
- **Gaming consoles** - PlayStation NAT type 1/2/3, Xbox Open/Moderate/Strict

## The Four NAT Types

### 1. Full Cone NAT (Open NAT)

Once a mapping `(internal IP:port → public IP:port)` is created by any outbound packet, **any external host** can send packets back to that public IP:port.

```text
Inside: 192.168.1.10:5000 → Public: 203.0.113.1:10000
Any internet host → 203.0.113.1:10000 → 192.168.1.10:5000 ✓
```

**P2P performance**: Excellent. Easiest for peer traversal.

### 2. Restricted Cone NAT

Same mapping as Full Cone, but **only** hosts that the internal client has previously sent packets to can send back.

```text
Inside: 192.168.1.10:5000 sent to 8.8.8.8 → mapping created
8.8.8.8 can now send to 203.0.113.1:10000 ✓
1.1.1.1 cannot → dropped ✗ (unless also contacted previously)
```

**P2P performance**: Good. STUN-based NAT traversal usually works.

### 3. Port Restricted Cone NAT

Like Restricted Cone, but the restriction includes both the IP **and the port** of the external host.

```text
Inside sent to 8.8.8.8:80 → mapping created
8.8.8.8:80 can reply ✓
8.8.8.8:443 cannot (different port) ✗
```

**P2P performance**: Moderate. STUN works if both peers are not symmetric NAT.

### 4. Symmetric NAT (Strict NAT)

Each unique `(destination IP, destination port)` creates a **different** external port mapping. The mapping is tied to the specific destination.

```text
192.168.1.10:5000 → 8.8.8.8:80   mapped to 203.0.113.1:10001
192.168.1.10:5000 → 1.1.1.1:80   mapped to 203.0.113.1:10002 (different!)
```

External hosts cannot initiate connections. STUN cannot work reliably because the mapped port seen by the STUN server differs from the port used for the actual peer.

**P2P performance**: Poor. Requires TURN relay for WebRTC/VoIP.

## Comparison Table

| NAT Type | Inbound from any | Inbound from contacted IP | Inbound from contacted IP+Port | P2P |
|----------|-----------------|--------------------------|-------------------------------|-----|
| Full Cone | ✓ | ✓ | ✓ | Excellent |
| Restricted Cone | ✗ | ✓ | ✓ | Good |
| Port Restricted Cone | ✗ | ✗ (unless port matches) | ✓ | Moderate |
| Symmetric | ✗ | ✗ | ✗ | Poor (needs TURN) |

## Detecting Your NAT Type

```bash
# Install stun client

apt install stun-client

# Test against a STUN server
stun stun.l.google.com:19302

# Output shows:
# "Full Cone NAT"
# "Restricted Cone NAT"
# "Port Restricted Cone NAT"
# "Symmetric NAT"
```

Python STUN detection:

```python
# pip install pynat
from pynat import get_ip_info
topology, ext_ip, ext_port = get_ip_info()
print(f"NAT Type: {topology}")
print(f"External IP: {ext_ip}:{ext_port}")
```

## Gaming Console NAT Types

| Console NAT Type | Equivalent RFC Type |
|----------------|-------------------|
| PlayStation Type 1 (Open) | Full Cone or no NAT |
| PlayStation Type 2 (Moderate) | Cone NAT |
| PlayStation Type 3 (Strict) | Symmetric or Port Restricted |
| Xbox Open | Full Cone |
| Xbox Moderate | Restricted/Port Restricted Cone |
| Xbox Strict | Symmetric |

## Key Takeaways

- Full Cone NAT is the most permissive and best for P2P/gaming.
- Symmetric NAT requires TURN relay for WebRTC or VoIP media traversal.
- Most home routers use Port Restricted Cone or Symmetric NAT.
- Use `pynat` or a STUN client to detect your actual NAT type.

**Related Reading:**

- [How to Understand NAT Traversal for VoIP and SIP](https://oneuptime.com/blog/post/2026-03-20-nat-traversal-voip-sip/view)
- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
- [How to Work Around CGNAT for Port Forwarding](https://oneuptime.com/blog/post/2026-03-20-cgnat-workaround-port-forwarding/view)
