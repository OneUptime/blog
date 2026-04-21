# How to Understand Stateful vs Stateless NAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, IPv4, Architecture

Description: Learn the difference between stateful and stateless NAT, when each is used, and how they compare in performance and use cases.

## Stateful NAT

Stateful NAT maintains a **connection tracking table** that records active sessions. For each NAT translation, the device stores:

- Source IP and port (original)
- Translated IP and port
- Destination IP and port
- Protocol and connection state (TCP state, UDP timeout)

### How Stateful NAT Works

```text
Client: 192.168.1.10:54321 → 8.8.8.8:53

NAT creates entry:
  192.168.1.10:54321 ↔ 203.0.113.1:1024 → 8.8.8.8:53

Reply arrives: 8.8.8.8:53 → 203.0.113.1:1024
NAT looks up table → translates back to 192.168.1.10:54321
```

### Examples of Stateful NAT

- Linux netfilter (iptables/nftables) with conntrack
- Cisco IOS NAT
- AWS NAT Gateway
- pfSense NAT
- Most home routers

### Advantages

- Works with PAT (many hosts, one public IP)
- Return traffic automatically matched to correct internal host
- Can provide a firewall-like effect because unsolicited inbound packets lack matching state, but NAT is not a firewall by itself
- Handles TCP, UDP, ICMP with appropriate state

### Disadvantages

- Memory-intensive (state table per connection)
- Limits on concurrent sessions (conntrack max)
- Single point of failure (state is local)
- Complexity in HA/failover scenarios

## Stateless NAT

Stateless NAT performs **per-packet translation** without maintaining any session state. Each packet is translated independently based on configured rules.

### How Stateless NAT Works

```text
Rule: Map 203.0.113.x → 192.168.1.x (1:1 prefix mapping)
203.0.113.10 → 192.168.1.10  (always, no state needed)
203.0.113.20 → 192.168.1.20  (always, no state needed)
```

### Examples of Stateless NAT

- NPTv6 (IPv6 prefix translation, RFC 6296)
- SIIT/stateless IP/ICMP translation (RFC 7915)
- Some hardware implementations of fixed 1:1 or prefix translation
- Static 1:1 NAT without port translation

### Advantages

- No per-session memory overhead for state tables
- No state-table session limits
- Easily distributable across multiple devices (no shared state)
- Deterministic, predictable behavior

### Disadvantages

- Cannot support dynamic many-to-one PAT (requires state for port tracking)
- No protection against unsolicited inbound packets
- Requires a fixed external address or prefix mapping for each internal address
- Does not handle protocols that embed IP addresses in payloads

## Comparison Table

| Feature | Stateful NAT | Stateless NAT |
|---------|-------------|--------------|
| Session tracking | Yes | No |
| Dynamic PAT support | Yes | No |
| Per-session memory overhead | Yes | No |
| State-table session limits | Yes | No |
| Firewall-like effect | Often, for unsolicited inbound traffic | No state-based filtering |
| HA/failover | Complex | Simple |
| Performance | State lookup overhead | No state lookup overhead |
| Use cases | Typical home/enterprise | Network prefix translation, large-scale 1:1 |

## Stateless NAT in Practice: NPTv6

RFC 6296 defines NPTv6 (Network Prefix Translation for IPv6) as a stateless 1:1 prefix mapping:

```text
Internal: fd00::/48
External: 2001:db8::/48

fd00::1 ↔ 2001:db8::1
fd00::2 ↔ 2001:db8::2
```

## Key Takeaways

- Stateful NAT tracks connections and is required for PAT (many-to-one).
- Stateless NAT is simpler and scales well for fixed or algorithmic mappings, commonly 1:1 address or prefix mappings.
- Most enterprise and home NAT uses stateful NAT with connection tracking.
- Stateless NAT is useful in high-performance scenarios and IPv6 prefix translation because it does not require per-flow state.

**Related Reading:**

- [How to Understand NAT and Its Impact on End-to-End Connectivity](https://oneuptime.com/blog/post/2026-03-20-nat-end-to-end-connectivity/view)
- [How to Scale NAT for Large Networks](https://oneuptime.com/blog/post/2026-03-20-scale-nat-large-networks/view)
- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
