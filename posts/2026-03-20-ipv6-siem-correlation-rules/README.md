# How to Write IPv6 SIEM Correlation Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SIEM, Correlation Rules, Security Analytics, Threat Detection, Splunk, Elastic

Description: Build multi-event IPv6 correlation rules in SIEM platforms to detect complex attacks including lateral movement, exfiltration, and IPv6-specific protocol abuse.

## Correlation vs Detection Rules

| Type | Scope | Example |
|---|---|---|
| Single-event detection | One log entry | RA from unauthorized source |
| Correlation rule | Multiple events over time | Scan → auth attempt → successful login |
| Behavioral baseline | Deviation from normal | Sudden spike in IPv6 prefix count |

Correlation is most valuable for detecting multi-stage attacks that evade single-event rules.

## Correlation Scenario 1: IPv6 Reconnaissance → Exploitation

```text
Attack chain:
1. Attacker probes multiple IPv6 addresses within a target /64 (many ICMP probe failures)
2. Finds active host (ICMP reply)
3. Attempts SSH login (multiple failures)
4. Successful login

Correlation: Events 1-4 from same /64 source prefix within 30 minutes
```

```text
| tstats count as events
    where (index=firewall OR index=auth)
    by _time, src_prefix64, event_type span=30m
| stats
    sum(eval(if(event_type="icmp_drop", events, 0))) as scan_events,
    sum(eval(if(event_type="icmp_reply", events, 0))) as live_hosts,
    sum(eval(if(event_type="ssh_fail", events, 0))) as ssh_fails,
    sum(eval(if(event_type="ssh_success", events, 0))) as ssh_success
    by src_prefix64, _time
| where scan_events > 20 AND live_hosts > 0 AND ssh_fails > 3 AND ssh_success > 0
| eval threat="IPv6_Recon_To_Exploit"
```

## Correlation Scenario 2: IPv6 Lateral Movement

```text
sequence by source.prefix64 with maxspan=10m
  [network where network.type == "ipv6" and event.action == "allowed"
   and cidrMatch(source.ip, "2001:db8:100:10::/64")
   and cidrMatch(destination.ip, "2001:db8:10::/64")]
  [network where network.type == "ipv6" and event.action == "allowed"
   and cidrMatch(destination.ip, "2001:db8:20::/64")]
  [network where network.type == "ipv6" and event.action == "allowed"
   and cidrMatch(destination.ip, "2001:db8:30::/64")]
```

## Correlation Scenario 3: IPv6 Data Exfiltration

```text
index=netflow network_type=ipv6
| stats
    sum(bytes_out) as total_bytes_out,
    dc(dst_ip) as unique_destinations,
    earliest(_time) as first_seen,
    latest(_time) as last_seen
    by src_ip
| where total_bytes_out > 1000000000
| eval gb_out = round(total_bytes_out / 1000000000, 2)
| eval duration_min = round((last_seen - first_seen) / 60, 1)
| eval mbps = round(total_bytes_out * 8 / (last_seen - first_seen + 1) / 1000000, 2)
| where NOT cidrmatch("2001:db8:ffff::/48", src_ip)
| eval threat="IPv6_Data_Exfiltration_Suspect"
| table src_ip, gb_out, unique_destinations, duration_min, mbps
| sort -gb_out
```

## IPv6 Prefix-Based Correlation

```python
#!/usr/bin/env python3
# extract-prefix64.py - Helper for SIEM correlation
# Extracts /64 prefix for grouping related IPv6 addresses

import ipaddress

def get_prefix64(ip_str: str) -> str:
    """Get the /64 prefix of an IPv6 address."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if isinstance(ip, ipaddress.IPv6Address):
            net = ipaddress.ip_network(f"{ip}/64", strict=False)
            return str(net.network_address)
    except ValueError:
        pass
    return ip_str

# In Logstash/Elasticsearch ingest pipeline:
# Add prefix64 as a derived field at ingestion time for datasets where /64
# is the right correlation boundary, such as client subnets using temporary addresses
# Reduces correlation complexity and avoids on-the-fly parsing in queries

# Example: compute_prefix64 ingest processor
ingest_pipeline = {
    "processors": [
        {
            "script": {
                "lang": "painless",
                "source": """
                    if (ctx.containsKey("source") && ctx.source != null && ctx.source.ip != null) {
                        try {
                            String sourceIp = ctx.source.ip.toString();
                            java.net.InetAddress addr = java.net.InetAddress.getByName(sourceIp);
                            if (addr instanceof java.net.Inet6Address) {
                                byte[] bytes = addr.getAddress();
                                ctx.source.prefix64 = String.format(
                                    "%02x%02x:%02x%02x:%02x%02x:%02x%02x::",
                                    bytes[0] & 0xff, bytes[1] & 0xff,
                                    bytes[2] & 0xff, bytes[3] & 0xff,
                                    bytes[4] & 0xff, bytes[5] & 0xff,
                                    bytes[6] & 0xff, bytes[7] & 0xff
                                );
                            }
                        } catch (Exception ignored) {
                        }
                    }
                """
            }
        }
    ]
}
```

## Baseline Deviation Correlation

```text
| tstats count as current_count
    where index=firewall earliest=-1h latest=now
    by src_prefix64

| join type=left src_prefix64 [
    | tstats count as historical_count
        where index=firewall earliest=-7d latest=-1h
        by _time, src_prefix64 span=1h
    | stats avg(historical_count) as avg_count stdev(historical_count) as stdev_count by src_prefix64
]

| eval z_score = case(
    isnull(avg_count), 99,
    stdev_count > 0, (current_count - avg_count) / stdev_count,
    current_count > avg_count, 99,
    current_count < avg_count, -99,
    true(), 0
)
| eval status = case(
    isnull(avg_count), "new_source",
    z_score > 3, "anomalous_spike",
    z_score < -3, "anomalous_drop",
    true(), "normal"
)
| where status != "normal"
| table src_prefix64, current_count, avg_count, z_score, status
| sort -z_score
```

## QRadar Building Block Chain

```text
# QRadar: multi-event correlation using BB chaining

BB1: IPv6_Scan_Observed
  When: ICMPv6 type 128 OR TCP SYN → drop, from same source, > 50 unique dests in 5m

BB2: IPv6_Auth_Failure
  When: SSH or RDP auth failure from IPv6 source, > 5 in 10m

BB3: IPv6_Auth_Success
  When: SSH or RDP auth success from IPv6 source

# Correlation rule: Scan → Auth Failure → Success
Rule: IPv6_Reconnaissance_Attack_Chain
  Test 1: BB1 fired for source_ip within last 30m
  Test 2: BB2 fired for same source_ip within last 30m
  Test 3: BB3 fires for same source_ip
  Action: Create offense, severity=HIGH
```

## Conclusion

IPv6 SIEM correlation rules are most effective when they track attack chains across multiple log sources and time windows. Key design principles: when your addressing plan uses /64 client subnets and temporary IPv6 addresses, a derived /64 prefix can be a useful correlation key alongside individual /128 addresses; set appropriate time windows (30 minutes for recon-to-exploit), and chain building blocks (scan → auth failure → auth success). Extract and index a derived prefix field at ingestion time to avoid expensive on-the-fly parsing in correlation queries. Baseline deviation detection - comparing current /64 activity to 7-day historical averages using Z-score - catches novel sources that single-event rules miss.
