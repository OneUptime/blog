# Validation Summary: How to Use Wildcard Masks in Access Control Lists

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Cisco IOS Access Control Lists (standard and extended)
- IPv4 wildcard masks
- Python 3 `ipaddress` standard library module
- Linux `iptables`

## Sources Consulted
- Cisco IOS documentation on ACLs and wildcard masks (https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html)
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html) — `IPv4Network.hostmask` and `IPv4Network.network_address`
- iptables(8) man page — `-A`, `-s`, `-j ACCEPT/DROP` semantics
- RFC 791 / general IPv4 addressing for bit-level wildcard behavior

## Issues Found
- **Python code produced double-spaced output.** The original `acl_entry(action, cidr)` function was called with `action=''`, which caused the returned string to begin with a leading space. The subsequent f-string `f"  permit ip {acl_entry('', subnet)} any"` then inserted an extra space between `ip` and the network address, so the actual runtime output had two spaces — not matching the documented single-space output block. Fixed by removing the unused `action` parameter and calling `acl_entry(subnet)` directly. The function now returns just the `<address> <wildcard>` pair and the printed line matches the documented output exactly.

## Review Notes
- The ACL syntax, wildcard-mask-to-prefix conversions (0.0.0.0, 0.0.0.255 = /24, 0.0.0.63 = /26, 0.0.3.255 = /22, 255.255.255.255 = any), and the non-contiguous wildcard example (0.0.0.254 matching even hosts) are all correct.
- Worth noting for readers: while non-contiguous wildcard masks are syntactically valid in Cisco IOS ACLs, some newer ACL-processing hardware/software platforms discourage or optimize poorly around them. The post's claim that they are "valid and unique to ACLs" is accurate in the strict sense.
- The `access-list 10 ...` examples use a standard ACL (number 1–99), where the `ip` keyword and protocol/destination fields are not applicable — only source address/wildcard. This is correctly demonstrated. The later Python example switches to a named extended ACL (`ip access-list extended`) where `permit ip <src> <src-wc> <dst> <dst-wc>` is required; this is also correct.
- The iptables examples use `-A INPUT`, which appends rules. If readers copy-paste repeatedly they will accumulate duplicate rules — a minor operational caveat, not a technical error.
