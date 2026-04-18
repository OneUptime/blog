# How to Validate IPv6 Route Origins with RPKI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RPKI, IPv6, BGP, Routing Security, Route Validation

Description: Learn how to validate IPv6 BGP route origins using RPKI, interpreting VALID, INVALID, and NOT FOUND states to make routing decisions.

## RPKI Validation States

Every IPv6 BGP prefix has one of three RPKI validation states:

| State | Meaning |
|-------|---------|
| **VALID** | A ROA exists and the announcing AS matches |
| **INVALID** | A ROA exists but the AS or prefix length doesn't match |
| **NOT FOUND** | No ROA exists for this prefix |

## Setting Up RPKI Validation with Routinator

```bash
# Install and start Routinator

sudo apt-get install routinator
sudo systemctl start routinator

# Trigger an immediate repository sync
routinator update
```

## Validating a Specific Prefix

```bash
# Check validity of a prefix/ASN pair
routinator validate --asn AS64496 --prefix 2001:db8::/32

# Example VALID response:
# 2001:db8::/32 => AS64496: valid

# Example INVALID response:
# 2001:db8::/48 => AS65000: invalid (covering ROA: 2001:db8::/32-48 AS64496)
```

## Dumping All Valid ROAs

```bash
# Dump all validated ROA payloads (VRPs) in CSV format
routinator vrps --format csv > /tmp/rpki-roas.csv

# Filter for IPv6 prefixes
grep ":" /tmp/rpki-roas.csv | head -20

# Count total validated IPv6 ROAs
grep ":" /tmp/rpki-roas.csv | wc -l
```

## Configuring BIRD2 for RPKI Validation

BIRD2 is a common routing daemon for Linux routers. Configure it to use RTR:

```python
# /etc/bird/bird.conf

# ROA table for IPv6
roa6 table rpki6;

# RPKI session to Routinator
protocol rpki routinator_v6 {
    remote ::1 port 3323;
    refresh keep 300;
    retry keep 90;
    expire keep 172800;
    roa6 { table rpki6; };
}

# Validation function
function rpki_check_v6() {
    case roa_check(rpki6, net, bgp_path.last) {
        ROA_VALID:    return true;
        ROA_INVALID:  return false;
        ROA_UNKNOWN:  return true;  # Accept unknown, adjust per policy
    }
}

# BGP import filter
filter bgp_in_v6 {
    if !rpki_check_v6() then {
        print "RPKI INVALID: ", net, " from AS", bgp_path.last;
        reject;
    }
    accept;
}
```

## Validating with FRRouting (FRR)

FRR is another popular routing daemon with RPKI support:

```bash
# Connect to FRR CLI
sudo vtysh

# Configure RPKI in FRR
configure terminal
  rpki
    rpki polling_period 300
    rpki cache 127.0.0.1 3323 preference 1
  exit
exit

# Verify RPKI cache state
show rpki cache-server

# Check validation status for a prefix
show rpki prefix 2001:db8::/32
```

## Bulk Validation Script

Use this Python script to validate multiple IPv6 prefixes:

```python
import requests
import json

# List of (prefix, asn) pairs to validate
prefixes_to_check = [
    ("2001:db8::/32", "AS64496"),
    ("2001:db8:100::/48", "AS64496"),
    ("2606:4700::/32", "AS13335"),  # Cloudflare
]

def validate_prefix(prefix, asn):
    """Query Routinator HTTP API for RPKI validity."""
    url = f"http://localhost:8323/api/v1/validity/{asn}/{prefix}"
    response = requests.get(url, timeout=5)
    data = response.json()
    return data.get("validated_route", {}).get("validity", {}).get("state", "unknown")

for prefix, asn in prefixes_to_check:
    state = validate_prefix(prefix, asn)
    print(f"{prefix} from {asn}: {state}")
```

## Monitoring RPKI Validation

Continuously monitor RPKI validation rates using [OneUptime](https://oneuptime.com). Track the percentage of your received IPv6 prefixes that are VALID versus INVALID to measure routing security posture over time.

## Conclusion

RPKI validation for IPv6 routes requires a running validator (Routinator, OctoRPKI), configuring your routing daemon to connect via RTR, and applying import filters that reject INVALID routes. Start with logging before rejecting to understand the impact on your network.
