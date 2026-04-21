# Validation Summary: How to Subnet a Class A Network into Smaller Subnets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4 subnetting
- Classful IPv4 addressing
- CIDR route aggregation
- Python `ipaddress` module
- Cisco IOS-style BGP `network` command

## Sources Consulted
- RFC 791: Internet Protocol - https://www.rfc-editor.org/rfc/rfc791.html
- RFC 1918: Address Allocation for Private Internets - https://www.rfc-editor.org/rfc/rfc1918.html
- RFC 4632: Classless Inter-domain Routing (CIDR) - https://datatracker.ietf.org/doc/rfc4632/
- Python `ipaddress` module documentation - https://docs.python.org/3/library/ipaddress.html
- Python expression/operator precedence documentation - https://docs.python.org/3/reference/expressions.html#operator-precedence
- Cisco IOS XE BGP command reference - https://www.cisco.com/c/en/us/td/docs/routers/sdwan/command/iosxe/qualified-cli-command-reference-guide/m-bgp-commands.pdf
- Cisco BGP route advertisement troubleshooting documentation - https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/19345-bgp-noad.html

## Issues Found
- The second Python example used `indent = "  " * cidr.count("/") // 3`, which evaluates left to right at the multiplication/floor-division precedence level and raises `TypeError` by trying to floor-divide a string. I changed it to compute a prefix-length-based hierarchy depth and use the resulting indentation in the printed output.
- The hierarchy heading and takeaway skipped the `/20` site tier even though the worked example allocates `/20` sites between `/16` regions and `/24` VLANs. I updated the wording to include `/20`.
- The BGP summary text did not make clear that `10.0.0.0/8` is RFC 1918 private space and should be summarized inside a private routing domain, not advertised on the public Internet. I updated the wording and comments to say internal BGP/private routing domain and noted that the Cisco `network ... mask ...` command requires a matching local route.

## Review Notes
The host counts use the conventional IPv4 usable-host formula of total addresses minus the network and broadcast addresses. That is appropriate for the `/8`, `/16`, `/20`, `/24`, and `/26` examples in this post; `/31` point-to-point links and `/32` host routes have special behavior outside this article's scope.
