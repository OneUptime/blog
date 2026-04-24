# Validation Summary: How to Plan a Private IPv4 Address Scheme Using RFC 1918 Ranges

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 private addressing
- RFC 1918
- CIDR and subnet planning
- Python `ipaddress`
- Docker networking
- AWS VPC networking
- VPN routing and overlap detection
- IPAM / network design

## Sources Consulted
- RFC 1918 - Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- Docker networking overview: https://docs.docker.com/network/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- AWS default VPC components: https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc-components.html
- AWS VPC CIDR block rules: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Linksys support article showing a default LAN IP of `192.168.1.1`: https://support.linksys.com/kb/article/219/
- ASUS support article showing default LAN IPs such as `192.168.1.1` and `192.168.50.1`: https://www.asus.com/support/faq/1011245/
- TP-Link support article showing default LAN IPs such as `192.168.0.1` and `192.168.1.1`: https://www.tp-link.com/support/faq/2392/
- Oracle documentation showing that VCN CIDRs are chosen by the user and should use RFC 1918 space rather than a fixed provider default: https://docs.oracle.com/en-us/iaas/tools/oci-cli/3.70.0/oci_cli_docs/cmdref/network/vcn/create.html

## Issues Found
- The post labeled `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16` as `Class A`, `Class B`, and `Class C`. RFC 1918 does not define the latter two as single classful networks; it defines them as contiguous private blocks. I removed the class labels to keep the explanation CIDR-accurate.
- The conflict list said `172.16.0.0/12` was frequently used by cloud providers and cited Oracle and AWS VPC. AWS documents `172.31.0.0/16` as the default VPC CIDR, and Oracle documents VCN CIDRs as user-selected RFC 1918 ranges rather than a fixed `172.16.0.0/12` default. I replaced that line with the documented AWS default.
- The home-router examples mapped specific vendors to `192.168.0.0/24` and claimed `192.168.1.0/24` for most home routers worldwide. Vendor documentation does not support those exact mappings as written, so I changed them to generic "common consumer-router default" examples.
- The Docker note was softened from an absolute "often used" statement to wording that matches Docker's documented default address pool behavior around `172.17.0.0/16`.
- The sentence saying overlapping ranges mean split tunneling "will break" was too absolute. I changed it to "can break access to internal resources" because the exact behavior depends on the VPN client's routing model.

## Review Notes
- The Python overlap-check example is syntactically correct and aligns with the current `IPv4Network.overlaps()` API.
- The site and enterprise allocation examples are design guidance, not RFC requirements, but the CIDR math in those examples is internally consistent.
- Docker documents the default `bridge` network as a legacy detail and recommends user-defined bridge networks for production use.
