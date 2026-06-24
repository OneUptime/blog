# How IPv6 Works on 5G Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 5G, Mobile Networks, 3GPP, PDU Session, NR, SAS, NSA

Description: Understand IPv6 addressing in 5G standalone and non-standalone networks, PDU session types, 5G network slicing with IPv6, and how UE devices receive IPv6 addresses over 5G.

---

5G networks are designed with native IPv6 support. 3GPP specifications define PDU session types for IPv4, IPv6, IPv4v6 (dual-stack), Ethernet, and Unstructured traffic in 5G Standalone (SA) architecture. IPv6 provides the address scale needed for large mobile and IoT deployments.

## 5G IPv6 Architecture

```text
5G IPv6 Network Architecture:

UE (User Equipment)
└── 5G NR Radio (gNB)
    ├── N2 (control plane) → AMF → SMF
    └── N3 (user plane) → UPF → DN → IPv6 Internet

SMF ↔ UPF over N4

PDU Session Types:
- IPv4: Legacy IPv4 only
- IPv6: IPv6 only (preferred for 5G-native)
- IPv4v6: Dual-stack (most common today)
- Ethernet: L2 transport
- Unstructured: Non-IP traffic
```

## 5G IPv6 Address Assignment

```text
How UE Gets IPv6 in 5G:

1. UE initiates PDU Session Establishment
2. SMF allocates a /64 IPv6 prefix and a link-local interface identifier
3. UPF configures uplink/downlink for the session
4. SMF sends Router Advertisement to UE via the UPF
   - RA includes the /64 prefix and link MTU
   - UE performs SLAAC to form its global IPv6 address
5. Optional: Stateless DHCPv6 can provide additional parameters such as DNS

IPv6 Prefix Types in 5G:
- /64 per IPv6 or IPv4v6 PDU session (standard UE case)
- Additional delegated prefixes via DHCPv6 Prefix Delegation (for RG/downstream use cases)
- Multiple prefixes for IPv6 multi-homing scenarios

Typical 5G IPv6 addresses:
2001:db8:100:1::1234/64  (example UE global address formed from an allocated /64)
```

## 3GPP 5G IPv6 PDU Session

```text
PDU Session Establishment (simplified):
UE → gNB → AMF → SMF
PDU Session Establishment Request:
  PDU Session Type: IPv6
  S-NSSAI: (network slice)

SMF → UPF:
  N4 Session Establishment Request
  IPv6 prefix: 2001:db8:100:1::/64

SMF → UE (via AMF/gNB):
  PDU Session Establishment Accept
  PDU Address: IPv6 link-local interface identifier
  Extended protocol configuration options (optional):
    IPv6 DNS: 2001:4860:4860::8888

SMF → UE (via UPF):
  IPv6 Router Advertisement
  Prefix: 2001:db8:100:1::/64
  MTU: 1400

UE processes Router Advertisement
UE uses SLAAC to form a global address within 2001:db8:100:1::/64
```

## Verify IPv6 on 5G Device (Android/Linux)

```bash
# Android device (via adb)

adb shell

# Check 5G interfaces
ip link show
# Look for: rmnet_data0, wwan0, or similar mobile data interface

# Check IPv6 addresses
ip -6 addr show rmnet_data0
# Should show global IPv6 from 5G PDU session

# Check default route
ip -6 route show

# Test IPv6 connectivity
ping -6 -I rmnet_data0 2606:4700:4700::1111

# Linux laptop with 5G modem (ModemManager)
nmcli device status  # Shows wwan0 state
nmcli device show wwan0 | grep '^IP6\.'

# Check ModemManager for IPv6 bearer info
mmcli -b /org/freedesktop/ModemManager1/Bearer/0
# Shows IPv6 bearer settings such as method, address, gateway, and DNS when exposed
```

## 5G Network Slicing with IPv6

```text
Network Slices and IPv6:
Each network slice can have different IPv6 addressing:

Slice 1 (eMBB - enhanced Mobile Broadband):
  PDU Session: IPv4v6 dual-stack
  IPv6 prefix: 2001:db8:1000::/48
  Use: Consumer internet

Slice 2 (URLLC - Ultra-Reliable Low Latency):
  PDU Session: IPv6
  IPv6 prefix: 2001:db8:2000::/48
  Use: Industrial IoT, autonomous vehicles

Slice 3 (mMTC - massive Machine Type Communication):
  PDU Session: IPv6 (massive IoT devices)
  IPv6 prefix: 2001:db8:3000::/48
  Use: Smart city sensors, meters
```

## 5G IPv6 Configuration on Open5GS (Open Source 5G Core)

```yaml
# /etc/open5gs/smf.yaml - Session Management Function

smf:
  sbi:
    server:
      - address: 127.0.0.4
        port: 7777

  pfcp:
    server:
      - address: 127.0.0.4  # N4 interface to UPF

  gtpu:
    server:
      - address: 127.0.0.4  # GTP-U endpoint

  metrics:
    server:
      - address: 127.0.0.4
        port: 9090

  session:
    # UE address pools for PDU sessions
    - subnet: 2001:db8:cafe::/48
      gateway: 2001:db8:cafe::1
      dnn: internet    # Data Network Name
    - subnet: 10.45.0.0/16
      gateway: 10.45.0.1
      dnn: internet    # IPv4 pool

  dns:
    - 2001:4860:4860::8888   # IPv6 DNS for UEs
    - 8.8.8.8                # IPv4 DNS

  # MTU for UE sessions
  mtu: 1400
```

## Monitor 5G IPv6 Traffic

```bash
# On UPF (User Plane Function) - capture 5G user plane
sudo tcpdump -i ogstun -nn ip6

# Check Open5GS UPF IPv6 forwarding
sudo sysctl net.ipv6.conf.all.forwarding
# Must be 1

# Monitor active PDU sessions (recent Open5GS main builds with infoAPI)
curl -s http://127.0.0.4:9090/pdu-info | python3 -m json.tool | grep -i ipv6

# Check IPv6 routes via ogstun
ip -6 route show table all | grep ogstun
```

5G networks treat IPv6 as a primary address family, with the SMF allocating an IPv6 prefix and link-local interface identifier for IPv6-capable PDU sessions, then sending Router Advertisements to the UE via the user plane so the UE can complete SLAAC-based configuration at scale.
