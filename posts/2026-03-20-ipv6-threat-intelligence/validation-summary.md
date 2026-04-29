# Validation Summary: How to Use IPv6 Threat Intelligence

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- STIX 2.1
- MISP
- PyMISP
- Splunk
- nftables
- Python
- Bash

## Sources Consulted
- OASIS STIX 2.1 Errata 01: https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.pdf
- PyMISP API source and docs: https://pymisp.readthedocs.io/en/latest/_modules/pymisp/api.html
- PyMISP event model/source: https://pymisp.readthedocs.io/en/latest/_modules/pymisp/mispevent.html
- MISP Automation and API guide: https://www.circl.lu/doc/misp/automation/
- MISP core source for attribute handling and CIDR-aware `ip-src`/`ip-dst` behavior: https://github.com/MISP/MISP/blob/2.5/app/Model/MispAttribute.php
- Splunk `lookup` command docs: https://docs.splunk.com/Documentation/SplunkCloud/latest/SearchReference/Lookup
- Splunk conditional functions (`cidrmatch`) docs: https://docs.splunk.com/Documentation/SplunkCloud/latest/SearchReference/ConditionalFunctions
- Splunk `transforms.conf` reference: https://docs.splunk.com/Documentation/Splunk/9.4.2/Admin/Transformsconf
- nftables sets documentation: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981.txt

## Issues Found
- The STIX example used invalid sample IPv6 literals such as `2001:db8:attacker::1` and `2001:db8:malicious::/48`. These were replaced with valid documentation-prefix IPv6 examples.
- The STIX indicator objects were not fully conformant: one indicator was missing required `created` and `modified` properties, and the timestamp examples did not include millisecond precision. I added the missing properties and normalized timestamps to valid STIX timestamp form.
- The STIX prefix indicator used `LIKE` against a CIDR string. I replaced it with `ISSUBSET`, which is the STIX set operator defined for IPv4/IPv6 address values and subnet matching.
- The PyMISP search examples used `pythonify=True` but then treated returned attributes like dictionaries. I changed the examples to use the documented `controller="attributes"` search path and attribute access via object properties such as `ioc.value` and `ioc.event_id`.
- The MISP URL and IOC examples used invalid IPv6 host/address strings. These were corrected to valid IPv6 literals.
- The SIEM export script assumed MISP attributes expose a `confidence` field and tried to derive a `/64` prefix by manipulating the textual IPv6 form. I replaced that with CIDR-based export using Python's `ipaddress` module so exact `/128` indicators and broader IPv6 prefixes are exported correctly.
- The Splunk example used regex-based `/64` reconstruction, which is unreliable for compressed IPv6 notation. I replaced it with a documented CIDR lookup flow using a `transforms.conf` stanza with `match_type = CIDR(cidr)`.
- The nftables script used a brittle `text` export plus `grep`, recreated sets in a non-idempotent way, and would duplicate rules across runs. I changed it to use documented JSON REST search, explicit `Content-Type`, deduplicated values, interval sets with `auto-merge`, and a guard to avoid adding the blocking rule multiple times.
- The introductory and concluding explanations were tightened so they describe prefix-level tracking and CIDR-based matching more accurately, instead of overstating `/64` blocking as the default recommendation.

## Review Notes
- The corrected Splunk example depends on a lookup stanza named `ipv6_iocs` in `transforms.conf`; using the CSV file name alone is not enough for CIDR matching.
- The nftables example now explicitly requires `jq` and root privileges.
- Prefix-level intelligence is useful for tracking and enrichment, but operational blocking at `/64` or larger can still be broad in real environments and should be applied with care.
