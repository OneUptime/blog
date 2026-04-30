# Validation Summary: How to Plan an IPv4 Addressing Scheme for Multi-Site Enterprise Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- CIDR subnetting
- RFC 1918 private addressing
- Route summarization
- Linux `iproute2`
- Enterprise network design

## Sources Consulted
- RFC 1918, "Address Allocation for Private Internets" - https://www.rfc-editor.org/rfc/rfc1918
- RFC 3021, "Using 31-Bit Prefixes on IPv4 Point-to-Point Links" - https://www.rfc-editor.org/rfc/rfc3021
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan" - https://www.rfc-editor.org/rfc/rfc4632.html
- Amazon VPC CIDR blocks - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Azure Virtual Network FAQ - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Google Cloud VPC subnets - https://cloud.google.com/vpc/docs/subnets
- `ip-route(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The hierarchical example block was tagged as `javascript`, but the contents are plain text and not valid JavaScript. I changed the fence to `text` so the example is represented accurately.
- The guidance to "Reserve ranges not used by common cloud providers" was too broad. Current AWS, Azure, and Google Cloud documentation all support RFC 1918 addressing and emphasize avoiding overlap with the specific networks and service ranges you connect to. I updated the line to reflect that more precise requirement.
- The New York `/23` guest network was described as "512 hosts". A `/23` contains 512 total addresses, but under standard IPv4 subnetting it provides 510 usable host addresses. I corrected the wording.
- The route example used `ip route 10.1.0.0/16 via 10.0.0.2`, which is not valid `iproute2` syntax. I changed it to `ip route add 10.1.0.0/16 via 10.0.0.2` and clarified that the example is for a Linux-based router.

## Review Notes
The core design approach is technically sound: using RFC 1918 space, allocating summarizable per-site blocks, and carving `/30` or `/31` point-to-point subnets from a dedicated pool aligns with RFC 1918, RFC 4632, and RFC 3021. The recommendation to use `10.0.0.0/8` for a large multi-site enterprise is a design preference rather than a protocol requirement, but it is reasonable for the use case described.
