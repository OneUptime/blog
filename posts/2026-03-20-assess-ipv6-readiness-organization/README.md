# How to Assess IPv6 Readiness for Your Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Assessment, Network Planning, IPv6 Readiness

Description: Conduct a systematic IPv6 readiness assessment covering network infrastructure, applications, security tools, monitoring systems, and team knowledge gaps.

## Introduction

An IPv6 readiness assessment identifies gaps between your current state and what is needed to successfully run dual-stack or IPv6-only infrastructure. It covers hardware capability, software support, operational processes, and team skills. This guide provides a structured assessment framework you can use as a checklist and scoring tool.

## Assessment Categories

### 1. Internet Connectivity

```bash
# Check if your upstream provider gives you IPv6 Internet connectivity

curl -6 https://api6.ipify.org 2>/dev/null || echo "No IPv6 Internet"

# Check for a global IPv6 address and a default route
ip -6 address show scope global
ip -6 route show default
# Should show a default route via your upstream IPv6 router
```

| Check | Pass Criteria | Status |
|-------|---------------|--------|
| Upstream provider offers IPv6 service | Global IPv6 address or delegated prefix assigned for your network plan | |
| IPv6 reachable from DMZ | `ping -6 2001:4860:4860::8888` succeeds | |
| AAAA DNS resolution works | `dig AAAA google.com` returns results | |

### 2. Network Equipment

```bash
# Audit core network devices for IPv6 support
# For Cisco IOS:
show ipv6 interface brief
show ipv6 protocols

# For Linux routers:
sysctl net.ipv6.conf.all.forwarding
ip -6 route show
```

| Equipment Category | IPv6 Support Required |
|-------------------|----------------------|
| Core routers | Full IPv6 forwarding, OSPFv3/BGP4+ |
| Distribution switches | VLAN IPv6, RA Guard, DHCPv6 snooping |
| Firewalls | Stateful IPv6 inspection, ACLv6 |
| Load balancers | Dual-stack VIPs, IPv6 health checks |
| VPN appliances | IKEv2 with IPv6, split tunneling |

### 3. Application Scanning

```python
#!/usr/bin/env python3
# scan_ipv4_hardcoding.py
# Find IPv4-hardcoded addresses in application code

import subprocess
import sys

def scan_for_ipv4_hardcoding(directory: str) -> list:
    """Find files with hardcoded IPv4 addresses."""
    # Regex for IPv4 addresses in code
    result = subprocess.run(
        ["grep", "-r", "-n", "--include=*.py", "--include=*.js",
         "--include=*.go", "--include=*.java",
         r"-E", r"\b([0-9]{1,3}\.){3}[0-9]{1,3}\b",
         directory],
        capture_output=True, text=True
    )
    findings = []
    for line in result.stdout.splitlines():
        if "# noqa" not in line and "test" not in line.lower():
            findings.append(line)
    return findings

findings = scan_for_ipv4_hardcoding(sys.argv[1] if len(sys.argv) > 1 else ".")
print(f"Found {len(findings)} potential hardcoded IPv4 addresses:")
for f in findings[:20]:
    print(f"  {f}")
```

### 4. Security Infrastructure

| Tool | IPv6 Capability Check |
|------|-----------------------|
| Firewall | Can create IPv6 ACLs/policies |
| IDS/IPS | Detects IPv6 attacks, Snort/Suricata with IPv6 rules |
| WAF | Handles IPv6 client addresses |
| SIEM | Parses and correlates IPv6 addresses |
| Vulnerability Scanner | Scans IPv6 addresses |
| DDoS Protection | IPv6 scrubbing capacity |

### 5. Monitoring and Observability

```bash
# Check if monitoring tools handle IPv6
# Prometheus: can scrape IPv6 targets?
curl -g -6 http://[::1]:9090/api/v1/query?query=up

# Nagios/Icinga: IPv6 check plugins installed?
check_ping -H 2001:db8::1 -w 100,10% -c 200,20% -6

# Zabbix: IPv6 agent support?
zabbix_get -s ::1 -p 10050 -k system.uptime
```

## Readiness Scoring

Use this scoring matrix to quantify your readiness:

| Category | Weight | Score (0-10) | Weighted Score |
|----------|--------|--------------|----------------|
| ISP/Connectivity | 20% | | |
| Network Equipment | 25% | | |
| Applications | 25% | | |
| Security Tools | 15% | | |
| Monitoring | 10% | | |
| Team Skills | 5% | | |
| **Total** | **100%** | | **/ 10** |

**Score Interpretation:**
- 8-10: Ready to begin migration immediately
- 5-7: Minor gaps; address before Phase 2
- 3-4: Significant gaps; 3-6 month preparation needed
- 0-2: Major overhaul required before migration

## Assessment Report Template

```markdown
# IPv6 Readiness Assessment Report

**Date:** 2026-03-20
**Assessed by:** [Network Team]

## Executive Summary
Overall readiness score: X/10

## Critical Gaps (blocking migration)
1. Firewall model XYZ does not support IPv6 stateful inspection → Replace by Q2
2. Application service-a has hardcoded IPv4 addresses → Developer fix required

## Moderate Gaps (must resolve before Phase 3)
1. SIEM does not parse IPv6 in log correlation rules
2. Vulnerability scanner license does not include IPv6 scanning

## Minor Gaps (nice to have)
1. Team training on IPv6 security concepts
2. IPAM tool needs IPv6 address plan imported

## Recommended Next Steps
1. Procure replacement firewall with IPv6 support
2. Begin application IPv4 hardcoding audit
3. Schedule team IPv6 training workshop
```

## Conclusion

A thorough readiness assessment covers six dimensions: connectivity, equipment, applications, security, monitoring, and team skills. Score each category and identify critical blockers before writing the migration roadmap. Common blocking gaps include applications with hardcoded IPv4 addresses, firewalls lacking IPv6 stateful inspection, and SIEMs unable to correlate IPv6 events. Addressing these gaps upfront prevents mid-migration surprises.
