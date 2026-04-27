# Validation Summary: How to Configure OSPF Authentication (Plain Text and MD5)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- OSPF authentication (Null / Plain Text / MD5 / Cryptographic)
- Cisco IOS / IOS XE configuration
- Cisco IOS key chain feature
- OSPFv2 cryptographic authentication via key chain

## Sources Consulted
- RFC 2328 (OSPF Version 2), Appendix D — Authentication: https://www.rfc-editor.org/rfc/rfc2328.txt
- Cisco "Configure Authentication in OSPF" (Doc ID 13697): https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13697-25.html
- Cisco "What Do %OSPF-4-ERRRCV Error Messages Mean?" (Doc ID 6154): https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/6154-19.html
- Cisco IOS XE OSPFv2 Cryptographic Authentication (16.x/17.x): https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iro-ospfv2-crypto-authen.html
- Cisco "Troubleshoot OSPF Neighbor Problems" (Doc ID 13699): https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13699-29.html
- Cisco IOS key chain `send-lifetime` / `accept-lifetime` command reference

## Issues Found

1. **Incorrect interpretation of `%OSPF-4-BADAUTH: Bad authentication type` log message.**
   The post originally claimed this message indicated an MD5 key mismatch. Per Cisco documentation, this message specifically indicates an **authentication type** mismatch (e.g., one router configured for MD5 while the other uses plain text or null). An MD5 key mismatch produces a different message such as `Mismatched key id (No message digest key N on interface)` or `Message has wrong message digest key`.
   - **Fix:** Updated the comment for that log line to correctly describe it as an auth type mismatch, and added a separate example log entry for the actual MD5 key mismatch case.

2. **Misleading wording in Method 2 ("MD5 authentication uses a key chain").**
   The traditional `ip ospf message-digest-key` mechanism does not use the IOS "key chain" feature — it uses individual key IDs configured directly on the interface. Using the term "key chain" in Method 2 conflated it with the actual key chain feature shown in Method 4.
   - **Fix:** Rephrased to "MD5 authentication is configured per interface using a key ID and key string. Multiple `message-digest-key` entries can be added on the same interface for key rotation."

## Review Notes

- The OSPF authentication type table (Type 0/1/2) is correct per RFC 2328 Appendix D.
- The 8-character limit for `ip ospf authentication-key` is correct on Cisco IOS (longer values are truncated to 8 with a warning on IOS 12.4+). The example password `Passw0rd` is exactly 8 characters.
- All Cisco IOS / IOS XE command syntax shown (`ip ospf authentication-key`, `ip ospf message-digest-key`, `ip ospf authentication [message-digest]`, `area X authentication [message-digest]`, `ip ospf authentication key-chain <name>`) is valid.
- Key chain `accept-lifetime` / `send-lifetime` syntax with both explicit end times and `infinite` is correct.
- The statement "If auth is wrong, neighbor will stay in INIT or not appear at all" is reasonable. In practice, a fully symmetric auth misconfiguration usually causes the neighbor to never appear, while asymmetric misconfigurations can leave one side in INIT. The post's wording covers both cases adequately.
- For OSPFv2 cryptographic authentication via key chain on IOS XE, production deployments should set a `cryptographic-algorithm` (e.g., `hmac-sha-256`) inside the key. The post does not show this, but the example as written is still valid for MD5-based key chain auth. Could be worth a future enhancement note for readers wanting stronger algorithms than MD5.
