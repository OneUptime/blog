# How to Configure IBM QRadar for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: QRadar, IPv6, SIEM, Security Analytics, IBM, Log Sources, Threat Detection

Description: Configure IBM QRadar SIEM to collect, parse, and analyze IPv6 network traffic logs including log source configuration, custom properties, and building block rules for IPv6.

## QRadar IPv6 Support Overview

QRadar supports IPv6 in multiple areas:
- Event source collection over IPv6 (for example, syslog and SNMP)
- IPv6 address parsing in events and flows
- Network hierarchy definitions for IPv6 subnets
- Rules and building blocks using IPv6 addresses
- Flow collector (QFlow) capturing IPv6 traffic

## Configuring Log Sources via IPv6

```text
QRadar Admin → QRadar Log Source Management → New Log Source → Single Log Source

Log Source Type: Linux OS / Cisco ASA / etc.
Protocol: Syslog
Log Source Identifier: 2001:db8:100::25   ← IPv6 address or host name

# QRadar event collectors already listen for syslog on UDP/TCP 514.
# Ensure any network firewalls between the device and QRadar allow UDP 514.

# Command line: verify QRadar listens on IPv6 for syslog
ss -6 -u -l -n | grep 514
# UNCONN ... :::514
```

## Network Hierarchy: IPv6 Subnets

```text
QRadar → Network Hierarchy → Add Network

Name: Corp_IPv6_Network
Network: 2001:db8:100::/48
Group: Internal Networks

Name: DMZ_IPv6
Network: 2001:db8:200::/48
Group: DMZ

Name: Guest_IPv6
Network: 2001:db8:300::/48
Group: Guest Networks

# This allows QRadar to classify traffic as:
# Local-Local, Local-Remote, Remote-Local, Remote-Remote
# based on IPv6 source/destination subnets
```

## Custom Event Properties for IPv6

```text
QRadar Admin → Custom Event Properties → Add Property

# Extract IPv6 source from custom log format
Property Name: IPv6_Source_Address
Field Type: IP
Regex: SRC=([0-9A-Fa-f:.]*:[0-9A-Fa-f:.]+)
Group: 1
Enabled: Yes

# Extract the first four hextets when the log contains a fully expanded IPv6 address
Property Name: IPv6_Source_Prefix64
Field Type: Text
Regex: SRC=((?:[0-9A-Fa-f]{1,4}:){3}[0-9A-Fa-f]{1,4}):
Group: 1

# IPv6 destination
Property Name: IPv6_Dest_Address
Field Type: IP
Regex: DST=([0-9A-Fa-f:.]*:[0-9A-Fa-f:.]+)
Group: 1
```

## Building Block Rules for IPv6

```text
QRadar → Rules → Add Building Block Rule

# BB: IPv6 Internal Source
Name: BB:IPv6_Internal_Source
Test: when the source IP is contained in any of:
    - Corp_IPv6_Network
    - DMZ_IPv6

# BB: IPv6 External Source
Name: BB:IPv6_External_Source
Test: when the source IP is NOT contained in:
    - Corp_IPv6_Network
    - DMZ_IPv6
    - Guest_IPv6
  AND when the source IP is one of the following:
    - ::/0

# BB: IPv6 Link-Local Observed
Name: BB:IPv6_LinkLocal_In_Logs
Test: when the source IP is one of the following:
    - fe80::/10
Note: Link-local addresses should not appear in routed logs
```

## Detection Rules

```text
# Rule: IPv6 Scanning Detection
Name: IPv6 Port Scan from External
Description: Detect external IPv6 host scanning multiple ports

Tests:
  AND the event(s) were detected by one or more of: Firewall Log Sources
  AND the event(s) match BB:IPv6_External_Source
  AND the source IP is the same across events
  AND the destination port count is greater than 20
  WITHIN 60 seconds

Response: Email security team, create offense

# Rule: IPv6 Tunnel Address Space Detected
Name: IPv6 6to4/Teredo Address Space
Tests:
  AND the source IP is one of the following:
      - 2002::/16      (6to4)
      - 2001::/32      (Teredo)
  AND the destination IP is contained in any of:
      - Corp_IPv6_Network
      - DMZ_IPv6
      - Guest_IPv6

Response: Low priority alert, track for volume
```

## AQL Queries for IPv6 Analysis

```sql
-- AQL: Find IPv6 traffic to external destinations
SELECT
    sourcev6,
    destinationv6,
    destinationport,
    protocolid,
    COUNT(*) as event_count
FROM events
WHERE LOGSOURCETYPENAME(devicetype) = 'Linux OS'
  AND sourcev6 IS NOT NULL
  AND destinationv6 IS NOT NULL
  AND INCIDR('2001:db8:100::/48', sourcev6)
  AND NOT INCIDR('2001:db8:100::/48', destinationv6)
LAST 24 HOURS
GROUP BY sourcev6, destinationv6, destinationport, protocolid
ORDER BY event_count DESC

-- AQL: IPv6 flows - top talkers
SELECT
    sourcev6,
    destinationv6,
    SUM(sourcebytes) as bytes_out,
    SUM(destinationbytes) as bytes_in,
    COUNT(*) as flows
FROM flows
WHERE sourcev6 IS NOT NULL
LAST 1 HOURS
GROUP BY sourcev6, destinationv6
ORDER BY bytes_out DESC
LIMIT 20

-- AQL: Find NDP-related events
SELECT *
FROM events
WHERE QIDNAME(qid) ILIKE '%neighbor%'
   OR QIDNAME(qid) ILIKE '%ndp%'
   OR payload ILIKE '%ICMPv6 Type 135%'
LAST 1 HOURS
```

## QFlow: IPv6 Flow Collection

```text
# QFlow / flow source configuration for IPv6 support
# Admin → Flow Sources → Add

Flow Source Name: Core_Switch_IPv6
Flow Source Type: Netflow v.1/v.5/v.7/v.9/IPFIX
Monitoring Port: 2055

# On the IPv6-capable exporter/router:
Destination IP: 2001:db8:100::10   ← QRadar Flow Collector / Flow Processor
Destination Port: 2055

# Verify IPv6 flows are being collected
# In QRadar Network Activity:
# Add columns: IPv6 Source Address, IPv6 Destination Address
# Filter: IPv6 Source Address or IPv6 Destination Address is not null
```

## Reporting

```text
# Create scheduled report: IPv6 Security Summary
QRadar → Reports → Create

Base the report on saved IPv6 event/flow searches with:
  - IPv6 Source Address or IPv6 Destination Address is not null
  - Time Period: Last 24 Hours

Include sections:
  - Top IPv6 Source IPs
  - Top Destination Ports for IPv6
  - IPv6 Traffic by Network Group (using Network Hierarchy)
  - IPv6 Offense Count

Schedule: Daily at 08:00, Email to security-team@example.com
```

## Conclusion

QRadar IPv6 support spans log collection (IPv6 syslog), flow analysis (NetFlow v9/IPFIX), and detection rules. Define IPv6 subnets in Network Hierarchy to enable Local/Remote classification for IPv6 sources and destinations. Custom Event Properties extract IPv6 addresses from non-standard log formats using regex. Building Blocks encapsulate IPv6 subnet membership tests for reuse across multiple rules. In AQL, use the IPv6-specific fields (`sourcev6`, `destinationv6`) and CIDR matching with `INCIDR(...)` instead of string matching on IPv4 fields. For flow collection, configure the IPv6-capable exporter to send NetFlow v9/IPFIX to the QRadar monitoring port and verify the IPv6 columns in Network Activity.
