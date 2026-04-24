# Validation Summary: How to Configure IBM QRadar for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IBM QRadar SIEM
- IPv6
- Syslog
- QRadar network hierarchy
- QRadar custom properties and regex extraction
- QRadar building blocks and custom rules
- Ariel Query Language (AQL)
- NetFlow v9 / IPFIX / QFlow
- CIDR matching
- 6to4 and Teredo IPv6 transition ranges

## Sources Consulted
- IBM Docs: IPv6 addressing in QRadar deployments - https://www.ibm.com/docs/en/qradar-on-cloud?topic=tasks-ipv6-addressing-in-qradar-deployments
- IBM Docs: Adding a log source - https://www.ibm.com/docs/en/qradar-on-cloud?topic=management-adding-log-source
- IBM Docs: Verifying that QRadar receives syslog events - https://www.ibm.com/docs/en/qsip/7.5.0?topic=problems-verifying-that-qradar-receives-syslog-events
- IBM Docs: Network hierarchy - https://www.ibm.com/docs/en/qradar-on-cloud?topic=tasks-network-hierarchy
- IBM Docs: Defining your network hierarchy - https://www.ibm.com/docs/en/qradar-on-cloud?topic=hierarchy-defining-your-network
- IBM Docs: Creating a custom property - https://www.ibm.com/docs/en/qsip/7.5.0?topic=properties-creating-custom-property
- IBM Docs: Event, flow, and simarc fields for AQL queries - https://www.ibm.com/docs/en/qsip/7.4.0?topic=language-event-flow-simarc-fields-aql-queries
- IBM Docs: AQL data retrieval functions - https://www.ibm.com/docs/en/qsip/7.4.0?topic=language-aql-data-retrieval-functions
- IBM Docs: AQL logical and comparison operators - https://www.ibm.com/docs/en/qsip/7.5.0?topic=language-aql-logical-comparison-operators
- IBM Docs: CIDR IP addresses in AQL queries - https://www.ibm.com/docs/SS42VS_7.4/com.ibm.qradar.doc/r_aql_cidr_examples.html
- IBM Docs: Adding or editing a flow source - https://www.ibm.com/docs/en/qradar-on-cloud?topic=sources-adding-editing-flow-source
- IBM Docs: Flow sources - https://www.ibm.com/docs/en/qradar-on-cloud?topic=monitoring-flow-sources
- IBM Docs: Scheduled search - https://www.ibm.com/docs/en/qradar-on-cloud?topic=searches-scheduled-search
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 3056: Connection of IPv6 Domains via IPv4 Clouds - https://www.rfc-editor.org/rfc/rfc3056
- RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) - https://www.rfc-editor.org/rfc/rfc4380

## Issues Found
- Several example IPv6 addresses were invalid because they used non-hex placeholders such as `corp`, `dmz`, `guest`, `device`, and `core`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The syslog section incorrectly instructed readers to add QRadar firewall access rules for UDP 514. Current IBM documentation states that QRadar collectors already listen on UDP/TCP 514 for syslog and specifically says not to configure the QRadar firewall for basic syslog reception. I changed the guidance to checking intervening network firewalls instead.
- The log-source creation path was outdated for current QRadar documentation. I updated it to the QRadar Log Source Management flow used in current IBM docs.
- The custom-property regex examples were too loose for IPv6 and the `/64` example did not state its assumptions. I tightened the IPv6 extraction patterns and clarified that the prefix example assumes a fully expanded IPv6 literal in the log text.
- The link-local example used `fe80:*`, which is not the RFC-defined link-local range. I changed it to `fe80::/10` per RFC 4291.
- The Teredo/6to4 detection rule used loose string patterns instead of the RFC-defined address ranges. I changed the rule to use `2002::/16` for 6to4 and `2001::/32` for Teredo.
- The AQL examples used `sourceip` and `destinationip` string matching for IPv6 analysis. IBM documents dedicated IPv6 AQL fields (`sourcev6`, `destinationv6`) and CIDR matching via `INCIDR(...)`, so I rewrote the queries to use those fields and operators.
- One AQL example referenced a `message` field that is not listed in IBM’s supported event fields for AQL. I changed it to `payload`.
- The QFlow section described a `Host` field and an `Enable IPv6 Flow Parsing` setting that do not match current QRadar flow-source documentation. I rewrote the section so the QRadar side uses a monitoring port and the exporter/router sends NetFlow v9 or IPFIX to QRadar.
- The reporting section relied on an unverified `IP Version: IPv6` report filter and a specific report template. Current IBM docs document report creation from saved searches, so I changed the guidance to use saved IPv6 searches as the report basis.

## Review Notes
- In QRadar 7.5.0 Update Package 4 and later, the Admin tab opens the QRadar Log Source Management app for log source creation. Older screenshots and guides often show the earlier Log Sources icon flow.
- The updated AQL examples are aligned to documented IPv6 fields and operators. They are a safer reference than string matching on `sourceip` or `destinationip`.
- The `/64` custom-property regex example remains intentionally limited to logs that contain fully expanded IPv6 addresses. If the source logs use compressed IPv6 notation heavily, a different parsing strategy or normalization step is preferable.
