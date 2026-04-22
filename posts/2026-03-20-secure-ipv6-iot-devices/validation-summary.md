# Validation Summary: How to Secure IPv6 IoT Devices

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 addressing and firewalling
- Linux ip6tables/netfilter
- ICMPv6 and Neighbor Discovery
- CoAP, CoAPS, DTLS, and aiocoap
- IEEE 802.15.4, Thread, 6LoWPAN, and OpenThread CLI
- Linux IPv6 sysctl settings
- OpenSSL X.509 certificate generation

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4864: Local Network Protection for IPv6 - https://datatracker.ietf.org/doc/rfc4864/
- RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls - https://datatracker.ietf.org/doc/rfc4890/
- RFC 6105: IPv6 Router Advertisement Guard - https://datatracker.ietf.org/doc/html/rfc6105
- RFC 7252: The Constrained Application Protocol (CoAP) - https://datatracker.ietf.org/doc/html/rfc7252
- aiocoap Context and credentials documentation - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.protocol.html and https://aiocoap.readthedocs.io/en/latest/module/aiocoap.credentials.html
- aiocoap tinydtls server transport documentation - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.transports.tinydtls_server.html
- Linux iptables extensions manual - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux-WPAN documentation and wpan-tools source - https://linux-wpan.org/documentation.html and https://github.com/linux-wpan/wpan-tools
- OpenThread CLI documentation - https://openthread.io/reference/cli and https://openthread.io/reference/cli/commands
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- OpenSSL req and x509 documentation - https://docs.openssl.org/3.1/man1/openssl-req/ and https://docs.openssl.org/master/man1/openssl-x509/
- Local command help: `ip6tables -m conntrack --help`, `ip6tables -m limit --help`, `openssl req -help`, and `openssl x509 -help`

## Issues Found
- The introduction and conclusion overstated IPv6 exposure by saying every IoT device is globally routable and directly exposed. Updated the wording to distinguish globally scoped IPv6 addressing from reachability controlled by routing and stateful firewalls.
- Several documentation-prefix IPv6 examples used invalid hexadecimal groups such as `mgmt`, `mesh`, `sensor1`, and `cloud`. Replaced them with valid `2001:db8::/32` example addresses and prefixes.
- The firewall rule order dropped inbound traffic before the trusted management allow rule, making that allow rule unreachable. Moved the management allow before the broad inbound drop.
- The firewall examples used the older `state` match and a broad IoT egress allow that conflicted with the later cloud allowlist. Updated the examples to use `conntrack --ctstate` and an explicit cloud prefix.
- The aiocoap CoAPS example used Python `ssl.SSLContext` as DTLS credentials and referenced an undefined `root_resource`. Replaced it with a syntactically complete aiocoap DTLS-PSK example using `CredentialsMap`, a resource tree, and the `tinydtls_server` transport.
- The `iwpan` link-layer security commands were not supported by current wpan-tools. Replaced them with OpenThread CLI dataset network key commands for Thread networks.
- The rate limiting rule allowed any source to SSH to IoT devices and would not constrain the Step 1 management rule as written. Added the trusted source/destination match, `conntrack` state, and `--syn`, and clarified that it replaces the unrestricted SSH allow rule.
- The Neighbor Discovery section incorrectly referred to IPv6 `rp_filter` and set `accept_source_route=0`, which still permits IPv6 routing header type 2 on Linux. Updated it to use IPv6 sysctls and `accept_source_route=-1`.
- The OpenSSL CSR command would prompt for a private-key passphrase in OpenSSL 3 without `-noenc`, and the certificate lacked a Subject Alternative Name. Added `-noenc`, `-addext subjectAltName`, and `-copy_extensions copy`.

## Review Notes
- `ip6tables` remains available, but new Linux firewall examples are often better written in native `nftables`.
- aiocoap's `tinydtls_server` transport is documented as experimental and incomplete; production CoAPS deployments should verify library and transport support before standardizing on it.
- The ICMPv6 examples intentionally stay broad for readability; a production firewall should refine ICMPv6 filtering according to RFC 4890.
