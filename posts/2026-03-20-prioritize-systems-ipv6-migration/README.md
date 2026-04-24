# How to Prioritize Systems for IPv6 Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Prioritization, Planning, Network Strategy

Description: Create a prioritization framework for IPv6 migration across systems and services, balancing business risk, technical complexity, and strategic value.

## Introduction

Migrating all systems to IPv6 simultaneously is impractical. A prioritization framework helps sequence migration based on strategic impact, risk, and effort. Systems that provide IPv6 to many others (DNS, load balancers) should be migrated early; systems with high risk and complex change should come later after the team has practice.

## Prioritization Criteria

Score each system on these dimensions (1-5 scale):

| Criterion | Description |
|-----------|-------------|
| **Business Value** | How much does IPv6 on this system benefit users/business? |
| **Upstream Dependency** | How many other systems depend on this for IPv6? |
| **Effort to Migrate** | How complex is the change? (5 = easy, 1 = very hard) |
| **Risk if Done Late** | What is the risk of delaying this system's migration? |
| **External Facing** | Is this accessible to external IPv6 users? |

## Prioritization Scoring Tool

```python
#!/usr/bin/env python3
# ipv6_prioritization.py

from dataclasses import dataclass, field
from typing import List

@dataclass
class System:
    name: str
    business_value: int    # 1-5
    upstream_dependency: int  # 1-5 (5 = many systems depend on it)
    ease_of_migration: int    # 1-5 (5 = easiest)
    risk_if_delayed: int      # 1-5
    external_facing: int      # 1-5

    @property
    def priority_score(self) -> float:
        # Weighted formula
        return (
            self.business_value * 0.25 +
            self.upstream_dependency * 0.30 +
            self.ease_of_migration * 0.15 +
            self.risk_if_delayed * 0.20 +
            self.external_facing * 0.10
        )

systems = [
    System("DNS resolvers",        5, 5, 4, 5, 3),
    System("Core routers",         4, 5, 3, 5, 2),
    System("Internet firewall",    4, 4, 3, 4, 4),
    System("Web load balancer",    5, 3, 4, 4, 5),
    System("Public website",       5, 2, 4, 3, 5),
    System("API gateway",          4, 3, 3, 3, 5),
    System("Monitoring (Prometheus)", 3, 2, 4, 4, 2),
    System("CI/CD pipelines",      3, 1, 3, 2, 1),
    System("Internal CRM",         2, 1, 2, 2, 1),
    System("Legacy billing system",1, 1, 1, 1, 1),
]

print(f"{'System':<35} {'Score':>6} {'Rank':>5}")
print("-" * 60)
sorted_systems = sorted(systems, key=lambda s: s.priority_score, reverse=True)
for rank, s in enumerate(sorted_systems, start=1):
    print(f"{s.name:<35} {s.priority_score:>6.2f}  {rank:>5}")
```

## Migration Wave Framework

### Wave 1: Foundation (High Impact, Lower Risk)

These systems are common early priorities because they enable or de-risk everything else:

| System | Reason |
|--------|--------|
| DNS resolvers | DNS is a main IPv6 anchor; end hosts rely on AAAA responses to use IPv6 |
| Core routers | Carry IPv6 traffic between all other systems |
| Internet firewall | Must allow IPv6 before any external-facing service goes live |
| Network monitoring | Visibility before rollout; catch issues early |

### Wave 2: Internet-Facing Services (High Value)

Visible to external IPv6 users and generate business value:

| System | Migration Action |
|--------|-----------------|
| Web servers / CDN | Publish AAAA in DNS once the service is IPv6-ready; configure load balancer IPv6 VIPs |
| API gateways | Enable IPv6 listener; update TLS certificates if needed |
| Mail servers | Publish AAAA for the hosts referenced by MX; add SPF `ip6` mechanisms if needed; configure IPv6 SMTP |
| VPN endpoints | Enable IPv6 transport and client addressing for remote users |

### Wave 3: Internal Services

Lower urgency but necessary for full IPv6 operation:

| System | Migration Action |
|--------|-----------------|
| Internal applications | Fix socket binding; remove IPv4 hardcoding |
| Databases | Enable IPv6 listener; update connection strings |
| CI/CD pipelines | Enable IPv6 in build networks |
| IPAM/NMS | Enable IPv6 management |

### Wave 4: Legacy Systems

Complex or high-risk changes; tackle after team has practice:

| System | Strategy |
|--------|---------|
| Legacy billing/ERP | Use NAT64/DNS64 or an application proxy only for specific client-initiated access patterns if the vendor can't update |
| Hardware-based systems | Contact vendor for IPv6 roadmap |
| Outsourced/SaaS | Vendor dependency - engage early |

## Decision Matrix

```text
                    HIGH VALUE
                    ^
Wave 1              |              Wave 2
(Infra/Foundation)  |           (Internet-facing)
                    |
LOW EFFORT <--------+--------> HIGH EFFORT
                    |
Wave 3              |              Wave 4
(Internal services) |           (Legacy/complex)
                    |
                    LOW VALUE
```

## Conclusion

Prioritize IPv6 migration by starting with the systems that most reduce downstream risk and unblock later work (often DNS, core routers, and firewalls), then move to external-facing services that deliver business value, followed by internal services, and finally legacy or complex systems. Use the priority score formula to rank systems within each wave when resources are constrained. A phased wave approach limits blast radius by separating foundation work from later service rollouts.
