# How to Train ISP Support Staff on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, Training, Support, Customer Service, Education

Description: A practical training framework for ISP support staff to confidently diagnose and resolve customer IPv6 issues.

## Why IPv6 Training Matters for Support Teams

First-line support staff are often the bottleneck in IPv6 deployment. Without proper training, support agents escalate IPv6 tickets unnecessarily or provide incorrect guidance, leading to customer frustration and operational cost.

## Training Curriculum Overview

A two-day intensive training program covers:

**Day 1 - IPv6 Fundamentals**
- IPv6 address format and notation
- Address types (global unicast, link-local, ULA, multicast)
- How SLAAC and DHCPv6 work
- Differences from IPv4 (usually no NAT, ICMPv6, NDP)

**Day 2 - Customer Troubleshooting**
- ISP-specific IPv6 architecture
- Common customer issues and diagnoses
- Tools and commands
- Escalation procedures

## Module 1: IPv6 Basics for Support Staff

Key concepts to convey:

```text
IPv4 vs IPv6 Quick Reference
═══════════════════════════════════════════
IPv4 Address:    192.168.1.100
IPv6 Address:    2001:0db8:0000:0001:0000:0000:0000:0100
Compressed IPv6: 2001:db8:0:1::100

Key differences for support staff:
- IPv6 addresses are longer - this is normal
- Customers have multiple IPv6 addresses per device - this is normal
- IPv6 usually does not use NAT - devices with global addresses are globally addressable, but firewall rules control inbound access
- Link-local (fe80::) addresses are always present - they are not global
```

## Module 2: Common Support Scenarios

### Scenario 1: "I don't have IPv6"

```text
Decision Tree:
1. Check if ISP provides IPv6 on customer's plan
2. If yes: verify CPE model supports IPv6
3. Check CPE IPv6 settings are enabled (usually auto or DHCPv6)
4. Verify RADIUS session shows IPv6 attributes
5. If all OK but still no IPv6: escalate to Tier 2
```

### Scenario 2: "Some sites are slow with IPv6"

Explain Happy Eyeballs to the customer:

```text
"Your device may try IPv6 and IPv4 close together and use whichever
connection succeeds first.
If it's consistently slow, we can investigate the path to that specific site."
```

### Scenario 3: "My security camera doesn't work"

Explain that IPv6 devices with global addresses can be reachable without port forwarding if the router firewall allows inbound connections.

## Module 3: Diagnostic Commands

Teach support staff to guide customers through these checks:

```bash
# Windows - check IPv6 status

ipconfig | findstr "IPv6"

# Mac - check IPv6 status
ifconfig | grep "inet6"

# Test IPv6 connectivity
ping -6 ipv6.google.com          # Windows
ping -6 ipv6.google.com          # Linux
ping6 ipv6.google.com            # macOS/BSD

# Test IPv6 website
curl -6 https://ipv6.google.com
```

And the key online test: `https://test-ipv6.com`

## Assessment Exercise

Create a practical assessment where trainees must:
1. Identify the correct IPv6 address type from a list
2. Walk through a simulated customer IPv6 connectivity case
3. Use the diagnostic tools to find the fault
4. Document the resolution in the ticketing system

## Knowledge Base Articles

Create KB articles for the most common IPv6 issues:
- "Customer reports no IPv6 connectivity - Basic Steps"
- "IPv6 address showing fe80 only - Explanation"
- "IPv6 performance issues - Happy Eyeballs explanation"
- "Home router IPv6 setup guides by vendor"

## Ongoing Learning

- Subscribe to IPv6 training resources from RIPE NCC Academy, ARIN, and Internet Society
- Monthly IPv6 case review meetings to share unusual customer issues
- Update training materials as new CPE models are supported

## Conclusion

Training ISP support staff on IPv6 requires balancing technical depth with practical applicability. A structured curriculum covering fundamentals, decision trees for common issues, and hands-on diagnostic exercises prepares staff to handle most IPv6 support calls without unnecessary escalation.
