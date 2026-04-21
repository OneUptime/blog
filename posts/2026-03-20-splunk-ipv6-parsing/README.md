# How to Parse IPv6 Addresses in Splunk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Splunk, IPv6, SIEM, Log Parsing, SPL, Security Analytics

Description: Configure Splunk to correctly parse, normalize, and search IPv6 addresses in logs including field extractions, regex patterns, and lookup tables for IPv6 analysis.

## IPv6 Parsing Challenges in Splunk

IPv6 addresses appear in multiple formats in logs:
- Full: `2001:0db8:0000:0000:0000:0000:0000:0001`
- Compressed: `2001:db8::1`
- Mixed: `::ffff:192.168.1.1` (IPv4-mapped)
- With brackets: `[2001:db8::1]:443`
- With port: `2001:db8::1/443` (Cisco ASA syslog format)

Splunk's automatic field extraction often misidentifies IPv6 as multiple fields or fails entirely.

## Props.conf: IPv6 Field Extraction

```ini
# /opt/splunk/etc/system/local/props.conf

# Extract IPv6 addresses from common log formats

[syslog]
# Extract source IPv6 from firewall logs
EXTRACT-src_ipv6 = (?:SRC=|src=|source=|from\s+)\[?(?P<src_ip>[0-9A-Fa-f:.%]*:[0-9A-Fa-f:.%]+)\]?(?::\d+|/\d+)?

# Extract destination IPv6
EXTRACT-dst_ipv6 = (?:DST=|dst=|dest=|destination=)\[?(?P<dst_ip>[0-9A-Fa-f:.%]*:[0-9A-Fa-f:.%]+)\]?(?::\d+|/\d+)?

# Extract IPv6 from nginx access logs
[nginx_access]
EXTRACT-client_ipv6 = ^\[?(?P<client_ip>[0-9A-Fa-f:.%]*:[0-9A-Fa-f:.%]+)\]?\s

# Extract from Apache combined log (handles both IPv4 and IPv6)
[access_combined]
EXTRACT-remote_host = ^\[?(?P<remote_host>(?:[0-9A-Fa-f:.%]*:[0-9A-Fa-f:.%]+|[0-9]{1,3}(?:\.[0-9]{1,3}){3}))\]?\s
```

## Transforms.conf: IPv6 Prefix Lookup

```ini
# /opt/splunk/etc/apps/network_security/local/transforms.conf
# Lookup table for IPv6 prefix classification
[ipv6_prefix_lookup]
filename = ipv6_prefixes.csv
match_type = CIDR(prefix)
case_sensitive_match = false
```

```csv
# /opt/splunk/etc/apps/network_security/lookups/ipv6_prefixes.csv
prefix,type,description
2001:db8::/32,documentation,RFC 3849 documentation prefix
fc00::/7,ula,Unique Local Address
fe80::/10,link-local,Link-Local
ff00::/8,multicast,Multicast
2001::/32,teredo,Teredo tunnel
2002::/16,6to4,6to4 tunnel
::1/128,loopback,Loopback
```

## SPL: IPv6 Search Patterns

```text
index=firewall
| where cidrmatch("::/0", src_ip)
| stats count by src_ip, action
| sort -count
```

```text
index=firewall
| normalizeipv6 field=src_ip output=src_ip_expanded format=exploded
| rex field=src_ip_expanded "^(?P<src_prefix64>(?:[0-9a-f]{4}:){4})"
| eval src_prefix64=rtrim(src_prefix64, ":")."::/64"
| stats dc(src_ip) as unique_hosts, count as events by src_prefix64
| sort -events
```

```text
index=network
| where cidrmatch("2001::/16", src_ip) OR cidrmatch("fe80::/10", src_ip)
| lookup ipv6_prefix_lookup prefix AS src_ip OUTPUT type AS addr_type description
| eval addr_type=coalesce(addr_type, "global")
| stats count by addr_type, src_ip
```

## SPL: IPv6 Subnet Matching

Use `cidrmatch()` for IPv6 CIDR matching:

```text
index=firewall
| where cidrmatch("2001:db8::/32", src_ip)
| stats count by src_ip, dst_ip, action
```

```text
index=network
| where cidrmatch("fc00::/7", src_ip)
| stats count by src_ip, dst_ip
| sort -count
```

```text
index=firewall
| eval in_corp=cidrmatch("2001:db8:100::/48", src_ip)
| eval in_dmz=cidrmatch("2001:db8:200::/48", src_ip)
| search in_corp=1 OR in_dmz=1
| stats count by src_ip, in_corp, in_dmz
```

## IPv6 Address Expansion for Normalization

```text
index=network
| eval normalized_src=lower(src_ip)
| rex field=normalized_src "^\[(?P<bracket_ip>[0-9a-f:.%]+)\](?::\d+)?$"
| eval normalized_src=coalesce(bracket_ip, normalized_src)
| rex field=normalized_src "^(?P<addr_only>[0-9a-f:.%]+)(?:/\d+)?$"
| eval normalized_src=coalesce(addr_only, normalized_src)
| fields - bracket_ip addr_only
```

```text
index=network src_ip="*:*"
| normalizeipv6 field=src_ip output=normalized_src format=compressed
| stats count by normalized_src
```

```ini
# /opt/splunk/etc/apps/network_security/default/commands.conf
[normalizeipv6]
filename = normalize_ipv6.py
chunked = true
python.version = python3
```

```python
# /opt/splunk/etc/apps/network_security/bin/normalize_ipv6.py
# Custom Splunk command for IPv6 normalization
import sys
import ipaddress
from splunklib.searchcommands import dispatch, StreamingCommand, Configuration, Option, validators


def clean_address(value):
    if value is None:
        return ''

    addr = str(value).strip()
    if addr.startswith('[') and ']' in addr:
        addr = addr[1:addr.index(']')]
    elif '/' in addr:
        host, suffix = addr.rsplit('/', 1)
        if suffix.isdigit():
            addr = host

    if '%' in addr:
        addr = addr.split('%', 1)[0]

    return addr


@Configuration(type='streaming')
class NormalizeIPv6Command(StreamingCommand):
    field = Option(require=True, validate=validators.Fieldname())
    output = Option(require=False, validate=validators.Fieldname())
    format = Option(require=False, default='compressed')

    def stream(self, records):
        for record in records:
            addr = clean_address(record.get(self.field, ''))
            try:
                ip_obj = ipaddress.ip_address(addr)
                target_field = self.output or self.field
                if (self.format or 'compressed').lower() == 'exploded':
                    record[target_field] = ip_obj.exploded
                else:
                    record[target_field] = ip_obj.compressed
            except ValueError:
                pass
            yield record

dispatch(NormalizeIPv6Command, sys.argv, sys.stdin, sys.stdout, __name__)
```

## Dashboard: IPv6 Traffic Overview

```xml
<!-- Splunk dashboard panel for IPv6 traffic -->
<panel>
  <title>IPv6 Traffic by Address Type</title>
  <chart>
    <search>
      <query>
        index=firewall
        | where cidrmatch("::/0", src_ip) AND NOT cidrmatch("::ffff:0:0/96", src_ip)
        | eval addr_type=case(
            cidrmatch("fe80::/10", src_ip), "Link-Local",
            cidrmatch("fc00::/7", src_ip), "ULA",
            cidrmatch("ff00::/8", src_ip), "Multicast",
            true(), "Global"
          )
        | timechart span=1h count by addr_type
      </query>
    </search>
    <option name="charting.chart">area</option>
  </chart>
</panel>
```

## Conclusion

Splunk IPv6 parsing often benefits from custom field extractions in `props.conf` because auto-extraction can struggle with colons and compressed notation. Use regex patterns to capture IPv6 candidates, then validate them with `cidrmatch("::/0", field)` or normalize them with a custom command. Splunk's `cidrmatch()` function supports IPv6 CIDR matching for subnet filtering. For normalization, create a custom streaming command using Python's `ipaddress.ip_address()` and the `.compressed` or `.exploded` address forms. Store prefix classification in a CSV lookup table with `match_type = CIDR(prefix)` and use `lookup` at search time to enrich IPv6 addresses with type information.
