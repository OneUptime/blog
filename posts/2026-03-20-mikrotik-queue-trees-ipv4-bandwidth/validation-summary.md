# Validation Summary: How to Set Up Queue Trees for IPv4 Bandwidth Management on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS
- Simple Queues
- Queue Trees (HTB - Hierarchical Token Bucket)
- Firewall Mangle (packet marking)
- PCQ (Per Connection Queuing)
- IPv4 Traffic Shaping / QoS

## Sources Consulted
- MikroTik official documentation (help.mikrotik.com): Queues, Simple Queue, Queue Tree pages
- MikroTik wiki Manual:Queues (archived/redirected to help.mikrotik.com)
- General MikroTik HTB queue tree configuration practices

## Issues Found

### 1. Mangle rule ordering (FIXED)
The original mangle rules placed the catch-all `DOWNLOAD` rule (matching `in-interface=ether1`) before the more specific `VOIP` rule. Since both rules use `passthrough=no`, the first matching rule terminates further mangle processing for that packet. As a result, VoIP traffic arriving via `ether1` would be marked as `DOWNLOAD` and never reach the `VOIP` rule, defeating the prioritization scheme.

**Fix**: Reordered the mangle rules so the more specific `VOIP` match comes before the broad `DOWNLOAD` match. Added an explanatory comment.

### 2. Queue tree hierarchy structure (FIXED)
The original queue tree had the parent `TOTAL-DOWNLOAD` configured with `packet-mark=DOWNLOAD`. In MikroTik HTB queue trees, when a queue has a `packet-mark`, it acts as a leaf that matches only that specific mark. A parent intended to aggregate child bandwidth should be defined without a `packet-mark`. Additionally, the child `GENERAL-DOWNLOAD` had no `packet-mark` at all, meaning it would not match any traffic and would never be used.

**Fix**: 
- Removed `packet-mark=DOWNLOAD` from the `TOTAL-DOWNLOAD` parent so it correctly serves as an aggregator that sums the bandwidth of its children.
- Added `packet-mark=DOWNLOAD` to the `GENERAL-DOWNLOAD` child so it actually matches the general (non-VoIP) download traffic that the mangle rule marks.
- Added a clarifying comment explaining the parent/child relationship.

## Review Notes

- The Simple Queue `max-limit=upload/download` order convention is a common source of confusion in MikroTik. The post's interpretation (`max-limit=5M/2M` for "5 Mbps download / 2 Mbps upload") follows the older / community-common interpretation where the first value is download. MikroTik's official docs themselves are inconsistent across pages on this point. Left unchanged because the comment matches the author's stated intent and the convention is debatable.
- The PCQ configuration is correct: `pcq-classifier=dst-address` for download (per-destination fair share) and `pcq-classifier=src-address` for upload (per-source fair share).
- The `/queue simple print stats interval=2` command is valid - the `interval=N` parameter works with `print` to refresh periodically.
- The post does not address combining `mark-connection` with `mark-packet`, which is the recommended pattern for performance in production setups (mark only the first packet per connection, then propagate via connection-mark). This is an advanced topic that could be a follow-up post but is not strictly necessary for an introductory guide.
- The `parent=global` in the queue tree applies queueing globally before the packet leaves any interface; for stricter shaping on a specific WAN/LAN interface, `parent=<interface-name>` could be used instead. Both approaches are valid.
