# Validation Summary: How to Use the Type of Service Field in IPv4 Headers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv4
- Type of Service (ToS)
- Differentiated Services Code Point (DSCP)
- Explicit Congestion Notification (ECN)
- Linux `iptables`
- Linux `tc`
- `tcpdump`
- Python `socket`
- OpenTofu
- AWS EC2

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers": https://www.rfc-editor.org/rfc/rfc2474
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP": https://www.rfc-editor.org/rfc/rfc3168
- IANA, "Differentiated Services Field Codepoints (DSCP)": https://www.iana.org/assignments/dscp-registry
- Python documentation, `socket` module: https://docs.python.org/3/library/socket.html
- Linux kernel documentation, `ip-sysctl`: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `tc(8)` man page: https://www.man7.org/linux/man-pages/man8/tc.8.html
- AWS VPC documentation, "What is Traffic Mirroring?": https://docs.aws.amazon.com/vpc/latest/mirroring/what-is-traffic-mirroring.html
- Terraform Registry, `aws_lb` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform Registry, `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The RFC history and field layout were oversimplified. RFC 2474 defines the DS field and RFC 3168 later assigns the low 2 bits to ECN, so I corrected the introduction and updated the header diagrams accordingly. I also fixed the RFC 791 layout, which was missing one reserved bit.
- The Python `parse_tos_byte()` example incorrectly treated only `ecn >= 2` as ECN-capable. Per RFC 3168, ECN-capable codepoints are `01` and `10`, so I changed the logic to `ecn in (1, 2)`.
- The Linux section said `tc qdisc show` and `tc class show` display DSCP markings. Those commands show traffic-control configuration, not packet markings, so I corrected the wording and added `tc filter show dev eth0`.
- The `tcp_ecn` explanation was outdated and framed as a generic Linux ECN switch even though it is a TCP-specific kernel setting. I corrected the comment to match current kernel documentation, including the modern `3-5` Accurate ECN modes.
- The OpenTofu section incorrectly implied that AWS Traffic Mirroring or an Application Load Balancer attribute could apply DSCP markings, and the resource examples were incomplete. I replaced that with an EC2 `user_data` example and clarified that the marking is applied by the guest OS.

## Review Notes
- The Linux packet-marking examples are valid for `iptables` systems, including the common nftables-backed `iptables` frontend, but they still require appropriate privileges and a QoS policy downstream that honors DSCP.
