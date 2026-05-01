# How to Detect IPv6 BGP Hijacking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Security, Monitoring, Routing

Description: Practical techniques for detecting BGP route hijacking of your IPv6 prefixes using RPKI, route monitoring services, and traffic analysis.

## What is BGP Hijacking?

BGP hijacking occurs when an attacker announces your IPv6 prefixes from an unauthorized AS, diverting your traffic. Detection requires monitoring BGP global routing tables and comparing them against what you authorized.

## Detection Method 1: RPKI Validation

RPKI lets you validate a prefix/origin pair against published ROAs. With a covering ROA, an announcement from an unauthorized AS shows up as `invalid_asn`; without a covering ROA, the result is `unknown`:

```bash
# Check whether your authorized prefix/origin pair is RPKI-valid

curl "https://stat.ripe.net/data/rpki-validation/data.json?resource=64496&prefix=2001:db8::/32"

# Use RIPEstat routing-status to check current exact-prefix origins and more specifics
curl "https://stat.ripe.net/data/routing-status/data.json?resource=2001:db8::/32&min_peers_seeing=1"
```

## Detection Method 2: RIPE RIS BGP Monitoring

RIPE Routing Information Service (RIS) collects BGP data from route collectors worldwide:

```python
import requests

def check_bgp_announcements(prefix):
    """Check exact-prefix origins and more-specifics via RIPE RIS."""
    url = "https://stat.ripe.net/data/routing-status/data.json"
    params = {"resource": prefix, "min_peers_seeing": 1}

    response = requests.get(url, params=params, timeout=30)
    data = response.json().get("data", {})

    origins = data.get("origins", [])
    more_specifics = data.get("more_specifics", [])

    print(f"Current exact-prefix origins for {prefix}:")
    for origin in origins:
        asn = origin.get("origin", "Unknown")
        print(f"  AS{asn}")

    if more_specifics:
        print("Currently announced more-specifics:")
        for route in more_specifics:
            print(f"  {route.get('prefix', '')} via AS{route.get('origin', 'Unknown')}")

    return origins, more_specifics

# Check your prefix
origins, more_specifics = check_bgp_announcements("2001:db8::/32")

# Alert if an unexpected ASN is announcing the exact prefix
authorized_asns = {"64496", "64497"}
for origin in origins:
    asn = str(origin.get("origin", ""))
    if asn not in authorized_asns:
        print(f"ALERT: Unauthorized AS{asn} announcing your prefix!")

# Alert if an unexpected ASN is announcing a more specific prefix
for route in more_specifics:
    asn = str(route.get("origin", ""))
    if asn not in authorized_asns:
        print(f"ALERT: Unauthorized AS{asn} announcing more specific {route.get('prefix', '')}!")
```

## Detection Method 3: BGPStream

BGPStream is a framework for real-time and historical BGP data processing:

```python
# Install: pip install pybgpstream
import pybgpstream

stream = pybgpstream.BGPStream(
    from_time="2026-03-19 00:00:00 UTC",
    until_time="2026-03-19 01:00:00 UTC",
    collectors=["rrc00", "rrc01", "route-views2"],
    record_type="updates",
    filter="prefix exact 2001:db8::/32 and ipversion 6"
)

for elem in stream:
    if elem.type in ("A", "W"):  # Announcement or Withdrawal
        prefix = elem.fields.get("prefix", "")
        as_path = elem.fields.get("as-path", "")
        origin_asn = as_path.split()[-1] if as_path else "unknown"
        print(f"{elem.type} | {prefix} | path: {as_path} | origin: {origin_asn}")
```

## Detection Method 4: Traceroute-Based Detection

If you control both endpoints, regular traceroutes reveal unexpected path changes:

```bash
# Traceroute to your own IPv6 prefix from an external vantage point
traceroute -6 -n 2001:db8::1

# Or use RIPE Atlas for global vantage points
# Atlas probe measurement can be created via API

# Alert if the path changes unexpectedly
# Compare hop IPs and their mapped ASNs with a known-good baseline
```

## Automated Alert Script

```bash
#!/bin/bash
# bgp-hijack-check.sh - Run after each new RIS snapshot (00:00, 08:00, 16:00 UTC)

PREFIX="2001:db8::/32"
AUTHORIZED_ASNS="64496 64497"
ALERT_EMAIL="noc@example.com"

# Query RIPEstat routing-status for current exact-prefix origins and more specifics
ANNOUNCEMENTS=$(curl -s "https://stat.ripe.net/data/routing-status/data.json?resource=$PREFIX&min_peers_seeing=1" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', {})
for o in data.get('origins', []):
    print(o.get('origin', ''), '$PREFIX', sep='|')
for route in data.get('more_specifics', []):
    print(route.get('origin', ''), route.get('prefix', ''), sep='|')
")

# Check each observed announcement against the authorized list
while IFS='|' read -r asn seen_prefix; do
  [ -n "$asn" ] || continue
  case " $AUTHORIZED_ASNS " in
    *" $asn "*) ;;
    *)
      echo "ALERT: Unexpected AS$asn announcing $seen_prefix related to $PREFIX" | \
        mail -s "BGP Hijack Alert" "$ALERT_EMAIL"
      ;;
  esac
done <<< "$ANNOUNCEMENTS"
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor external reachability of your IPv6 addresses from multiple geographic locations. Reachability changes from specific regions can be a useful supporting signal, but they are not specific to BGP hijacks and should be correlated with control-plane data from RIS or BGPStream.

## Conclusion

IPv6 BGP hijacking detection requires RPKI deployment (most effective), BGP route collector monitoring (RIPE RIS, BGPStream), and regular external reachability testing. Combine all three approaches and automate alerts for rapid incident response.
