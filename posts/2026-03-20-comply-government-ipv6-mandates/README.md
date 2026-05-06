# How to Comply with Government IPv6 Mandates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Government, Compliance, OMB, Federal Mandate, Policy

Description: Understand and comply with US government and international IPv6 deployment mandates, including OMB memoranda requirements, implementation timelines, and compliance verification approaches.

---

Multiple governments have issued IPv6 transition requirements. In the US, the federal government's OMB (Office of Management and Budget) memoranda apply to Federal agencies. In other jurisdictions, the source and scope of requirements vary: some are formal mandates, while others are procurement rules, roadmaps, or policy guidance.

## US Federal IPv6 Mandate (OMB)

```text
Key OMB IPv6 Memoranda:

1. M-05-22 (2005): "Transition Planning for Internet Protocol Version 6"
   - Required agencies to create IPv6 transition plans
   - Set a June 30, 2008 deadline for agency backbone infrastructures to use IPv6

2. OMB M-21-07 (2020): "Completing the Transition to IPv6"
   - Replaced earlier OMB IPv6 guidance with an IPv6-only strategic direction
   - Key requirements:
     * All new networked Federal information systems: IPv6-enabled at deployment by FY 2023
     * At least 20% of IP-enabled assets on Federal networks: IPv6-only by end of FY 2023
     * At least 50% of IP-enabled assets on Federal networks: IPv6-only by end of FY 2024
     * At least 80% of IP-enabled assets on Federal networks: IPv6-only by end of FY 2025
     * Shared services must provide full IPv6 support, including IPv6-only operation

3. Current status (as of 2026):
   - The FY 2025 milestone in M-21-07 is 80% of IP-enabled assets on Federal networks operating in IPv6-only environments
   - Agencies continue reporting IPv6 implementation progress through FISMA CIO metrics
```

## Compliance Requirements for Federal Agencies

```text
OMB M-21-07 Requirements:

1. Public-Facing Services:
   - Public/external-facing services (for example web, email, DNS, and ISP services) should operationally use native IPv6
   - Public service hostnames should publish AAAA records where the service is intended to be reachable over IPv6
   - HTTPS over IPv6 should present a certificate valid for the service name being used

   Verify:
   curl -6 https://agency.gov
   dig +short AAAA agency.gov

2. Internal Systems and Networks:
   - Internal client applications that communicate with public Internet services should operationally use native IPv6
   - Agencies must plan toward the M-21-07 IPv6-only asset milestones, not just dual-stack support
   - Procurement must specify IPv6 capability requirements

3. Shared and Cloud Services:
   - Shared services offered by the agency must provide full IPv6 support
   - Those services must be able to function in IPv6-only mode with feature and performance parity with IPv4
   - External interfaces and dependencies should be included in IPv6 migration plans
```

## Agency IPv6 Deployment Checklist

```bash
#!/bin/bash
# federal_ipv6_compliance_check.sh

# Sample checks for federal agency IPv6 readiness

AGENCY_DOMAIN="agency.gov"

echo "=== Federal IPv6 Compliance Check for $AGENCY_DOMAIN ==="

# Check 1: AAAA record exists
echo -n "AAAA record: "
AAAA=$(dig +short AAAA "$AGENCY_DOMAIN" 2>/dev/null)
if [ -n "$AAAA" ]; then
    echo "PASS ($AAAA)"
else
    echo "FAIL (no AAAA record)"
fi

# Check 2: IPv6 web access
echo -n "IPv6 HTTPS access: "
if curl -6 --max-time 10 -o /dev/null -s -w "%{http_code}" \
  "https://$AGENCY_DOMAIN" 2>/dev/null | grep -Eq "^(200|301|302)$"; then
    echo "PASS"
else
    echo "FAIL"
fi

# Check 3: Any advertised MX host has IPv6
echo -n "Mail server IPv6: "
MX_HOSTS=$(dig +short MX "$AGENCY_DOMAIN" | awk '{print $2}')
if [ -n "$MX_HOSTS" ] && printf '%s\n' "$MX_HOSTS" | while read -r host; do
    dig +short AAAA "$host"
done | grep -q ":"; then
    echo "PASS (at least one MX host has IPv6)"
else
    echo "WARN (no IPv6 found on advertised MX hosts)"
fi

echo "=== Check Complete ==="
```

## Contractor IPv6 Requirements

```text
Federal contractors typically encounter IPv6 requirements through acquisition language and system authorization, for example:

1. FISMA / system authorization:
   - Security plans, architectures, and monitoring processes for Federal systems must address production IPv6 use
   - Security tooling that supports Federal systems should be IPv6-capable and able to operate in IPv6-only environments

2. FedRAMP (Cloud services):
   - FedRAMP is a cloud security authorization program, not a standalone IPv6 mandate
   - Cloud services used by agencies still need to satisfy the agency's IPv6 requirements where applicable

3. Section 508 Compliance:
   - Section 508 governs accessibility for people with disabilities
   - It is separate from IPv6 compliance and should not be treated as an IPv6 mandate

Procurement Language (example):
"The offered solution MUST support the applicable USGv6 Profile
requirements (NIST SP 500-267Br1) and be capable of operating
in an IPv6-only environment."
```

## Reporting and Documentation

```text
Federal Agency IPv6 Reporting Requirements:

1. FISMA CIO Metrics:
   - Agencies report counts of GFE hardware assets that are IPv4-only, dual-stack, or IPv6-only
   - Current CIO metrics explicitly map this reporting to OMB M-21-07

2. Documentation Required:
   - Agency-wide IPv6 policy
   - IPv6 implementation plan and related IRM strategic planning updates
   - Network topology diagrams and security documentation showing IPv6 support

3. Tracking IPv6 Deployment Progress:
   - Use NIST's USGv6 deployment monitor to measure external DNS, mail, and web IPv6 reachability
   - Treat the monitor as a deployment measurement tool, not as a formal compliance certification
```

## International IPv6 Mandates

```text
Other Government IPv6 Policies and Programs:

European Union:
- The European Commission has identified IPv6 as an ICT specification that public procurers can reference
- Specific IPv6 requirements vary by institution and member state

China:
- China issued a 2017 action plan to accelerate large-scale IPv6 deployment
- The policy has been followed by continued programs to expand IPv6 use across networks, applications, and devices

India:
- The Department of Telecommunications has published a National IPv6 Deployment Roadmap
- National Telecom Policy 2012 explicitly recognizes IPv6 and encourages new IP-based services on it

Australia:
- ASD guidance addresses IPv6 security and deployment considerations
- Australian IPv6 requirements are generally agency-specific rather than a single OMB-style mandate
```

Government IPv6 requirements are a significant policy driver for adoption, with OMB M-21-07 being one of the most prescriptive in setting phased FY 2023-FY 2025 IPv6-only asset milestones and a strategic direction toward broader IPv6-only operation.
