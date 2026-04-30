# Validation Summary: How to Perform IPv6 MITM Attacks in Lab Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Neighbor Discovery Protocol (NDP)
- ICMPv6 Neighbor Advertisements
- THC-IPv6 (`parasite6`, `fake_router6`)
- SI6 Networks IPv6 Toolkit (`na6`)
- Scapy
- Linux `sysctl`
- `tcpdump`
- `ip6tables`
- mitmproxy

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 3971, SEcure Neighbor Discovery (SEND): https://datatracker.ietf.org/doc/html/rfc3971
- RFC 6105, IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc6105
- THC-IPv6 upstream repository and tool help/source (`parasite6`, `fake_router6`): https://github.com/vanhauser-thc/thc-ipv6
- SI6 Networks IPv6 Toolkit `na6` man page: https://manpages.debian.org/testing/ipv6toolkit/na6.1.en.html
- Scapy IPv6/ICMPv6 API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- mitmproxy transparent proxy documentation: https://docs.mitmproxy.org/stable/howto/transparent/
- mitmproxy proxy modes documentation: https://docs.mitmproxy.org/stable/concepts/modes/
- mitmproxy options reference: https://docs.mitmproxy.org/stable/concepts/options/

## Issues Found
- The example IPv6 addresses were invalid (`2001:db8::attacker`, `2001:db8::victim`, `2001:db8::router`). I replaced them with valid RFC 3849 documentation addresses so the examples are syntactically correct.
- The `parasite6` example used an unsupported positional target argument. I corrected it to the documented `parasite6 -l eth0` form and updated the explanation to match the tool's actual behavior.
- The `fake_router6` explanation incorrectly described NDP cache poisoning of the gateway. I changed the description to the tool's documented role: advertising the attacker as a rogue default router.
- The `na6` example used unsupported `--loop` and `--sleep` flags and omitted the target/MAC options needed for the attack packets to advertise the attacker's MAC. I replaced it with documented `na6` flags and wrapped the one-shot command in shell loops to preserve the intended repeated behavior.
- The Scapy example was missing `import time`, used invalid IPv6 addresses, and passed `iface` to `send()` even though Scapy's L3 `send()` documentation states that `iface` has no effect there. I corrected all three points.
- The mitmproxy section claimed HTTP/HTTPS interception while only redirecting TCP port 80. I narrowed the example to HTTP and added the transparent HTTPS caveat required by the official mitmproxy documentation.
- The verification section used `ip -6 route show`, which does not verify that traffic is actually traversing the MITM host. I replaced it with packet capture and forwarded-packet counter checks.

## Review Notes
- The examples now consistently use `2001:db8::/32`, which is the correct documentation prefix for lab/tutorial material.
- Transparent HTTPS interception with mitmproxy still requires the test client to trust the mitmproxy CA; the post now states that explicitly.
