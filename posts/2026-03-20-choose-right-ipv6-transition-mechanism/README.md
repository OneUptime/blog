# How to Choose the Right IPv6 Transition Mechanism for Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv6 Transition, Network Planning, NAT64, DS-Lite, MAP-T

Description: A decision framework for selecting the appropriate IPv6 transition technology based on your network type, scale, and operational requirements.

## The IPv6 Transition Landscape

There are many IPv6 transition technologies, each designed for specific scenarios. Choosing the wrong one leads to wasted effort, poor performance, or incomplete IPv4 compatibility. This guide helps you match your situation to the right technology.

## Decision Framework

```mermaid
flowchart TD
    A[What is your network type?] --> B{Enterprise / Data Center}
    A --> C{ISP / Carrier}
    A --> D{Mobile Network}

    B --> E{Need IPv4 for servers?}
    E -->|Yes| F[Dual-Stack]
    E -->|Servers are IPv6-only| G[NAT64 + DNS64]

    C --> H{How many subscribers?}
    H -->|Small, can afford per-IP| I[Dual-Stack or 6rd]
    H -->|Large, need IPv4 conservation| J{Need statefulness?}
    J -->|Yes| K[DS-Lite or lw4o6]
    J -->|No| L[MAP-E or MAP-T]

    D --> M[464XLAT with CLAT + PLAT]
```

## Enterprise / Data Center Networks

**Recommended: Dual-Stack (transitional) → Native IPv6**

Most enterprises should run dual-stack during transition and progressively move workloads to native IPv6:

- New services: IPv6-native from day one
- Existing IPv4 services: Enable IPv6 on the service, publish AAAA records, keep A records
- Client access: Dual-stack clients generally prefer IPv6 but fall back quickly if IPv4 works better (Happy Eyeballs)

**When to use NAT64+DNS64**: When you want an IPv6-only segment (e.g., new data center pods) that still needs to reach legacy IPv4 external services.

## ISP / Broadband Provider

Choose based on subscriber scale and operational preferences:

| Technology | Best When | Drawback |
|---|---|---|
| Dual-Stack | IPv4 pool is sufficient | Requires IPv4 plus IPv6 per sub |
| DS-Lite | IPv4 pool is limited; prefer simpler CPE | AFTR state at scale |
| lw4o6 | Large scale; can afford complex CPE | CPE must do NAT |
| MAP-E | Very large scale; stateless preferred | Complex provisioning |
| MAP-T | Like MAP-E but prefer no tunnel overhead | Fewer CPE implementations |

## Mobile Networks

**Recommended: 464XLAT**

Many mobile networks deploy IPv6-only data services. 464XLAT is the standardized mechanism used to preserve IPv4 app compatibility because:

- Devices get IPv6 connectivity on the access network (saves IPv4 address space)
- CLAT on device handles IPv4-only apps transparently
- PLAT (NAT64) at the carrier handles translation
- CLAT is implemented on Android, iOS, Linux, Windows, and Chrome OS; exact support varies by OS release and device

## Cloud / Kubernetes Environments

**Recommended: Native IPv6 + NAT64+DNS64 for legacy access**

For Kubernetes and cloud environments:

- Assign IPv6 addresses to pods and services natively
- Use CoreDNS with DNS64 plugin for pods that need IPv4 connectivity
- Configure NAT64 (Jool) on an egress gateway for IPv4 translation

## Technology Comparison Matrix

| Technology | IPv6-only clients | IPv4 apps | Stateful? | Complexity | Best for |
|---|---|---|---|---|---|
| Dual-Stack | No | Yes | No | Low | Enterprise |
| 6in4/SIT | Yes | No | No | Low | Home users |
| NAT64+DNS64 | Yes | Partial | Yes | Medium | Enterprise, cloud |
| 464XLAT | Yes | Yes | Yes (PLAT) | Medium | Mobile carriers |
| DS-Lite | No | Yes | Yes (AFTR) | Medium | Broadband ISP |
| lw4o6 | No | Yes | Partial | High | Large ISP |
| MAP-E | No | Yes | No | High | Very large ISP |
| MAP-T | No | Yes | No | High | Very large ISP |

## Key Decision Criteria

**1. Do your clients have IPv4 addresses?**
- Yes → Dual-Stack or ISP technologies (DS-Lite, MAP)
- No → NAT64+DNS64 or 464XLAT

**2. Do you need IPv4-literal app support?**
- Yes → 464XLAT (adds CLAT) or Dual-Stack
- No → NAT64+DNS64 may be sufficient

**3. What is your scale?**
- Small (<10,000 users) → DS-Lite or NAT64+DNS64
- Large (>100,000 users) → lw4o6, MAP-E, or MAP-T

**4. Do you prefer stateless or stateful?**
- Stateless → MAP-E, MAP-T, SIIT
- Stateful acceptable → DS-Lite, NAT64

## Summary

No single IPv6 transition technology fits every use case. Enterprise networks benefit from dual-stack with eventual migration to native IPv6. Mobile carriers commonly use 464XLAT for IPv6-only data deployments. ISPs choose between DS-Lite, lw4o6, MAP-E, or MAP-T based on scale and operational complexity tolerance. Start with your client types, scale, and IPv4 dependency requirements to narrow down the right choice.
