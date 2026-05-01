# Validation Summary: How to Understand DHCP vs Static IP Addressing

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- Static IPv4 addressing
- DHCP reservations/manual allocation
- DHCP options for boot configuration
- DNS updates related to DHCP
- Python 3

## Sources Consulted
- RFC 2131: Dynamic Host Configuration Protocol — https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132: DHCP Options and BOOTP Vendor Extensions — https://www.rfc-editor.org/rfc/rfc2132
- RFC 4702: The DHCP Client FQDN Option — https://www.rfc-editor.org/rfc/rfc4702
- Python documentation, formatted string literals — https://docs.python.org/3/reference/lexical_analysis.html#f-strings
- Python documentation, `str.lower()` — https://docs.python.org/3/library/stdtypes.html#str.lower

## Issues Found
- The comparison table said DHCP DNS stability "Requires dynamic DNS." RFC 2131 states DHCP itself does not handle DNS registration, and RFC 4702 defines one mechanism for DHCP-related DNS updates. I changed this to "Usually needs DNS updates or reservations" to avoid overstating one implementation path.
- The failure-mode row said "DHCP server outage = no IP," which was too absolute. RFC 2131 allows clients to keep using a lease until expiration and only requires them to stop network processing if the lease expires without a DHCPACK. I changed the wording to "Outage can block new leases or renewals" and updated the takeaway accordingly.
- The Python helper only matched exact `iot` strings, so the included `iot_sensor` example fell into the fallback path even though the article recommends DHCP for IoT devices. I added a simple `startswith("iot")` check so the sample output matches the guidance.

## Review Notes
- The networking guidance is accurate for typical DHCPv4 environments and the cited RFCs are DHCPv4-focused.
- The Python snippet is syntactically valid and was executed locally after the edit to confirm the sample behavior.
