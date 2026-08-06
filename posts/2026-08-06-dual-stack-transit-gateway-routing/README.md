# Dual-Stack Routing Through AWS Transit Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, IPv6, Dual Stack, VPC, Hybrid Networking

Description: Build dual-stack Transit Gateway routing while handling IPv6 propagation, hybrid links, egress, inspection, and security independently from IPv4.

---

AWS Transit Gateway can route IPv4 and IPv6 packets through the same VPC attachment, but dual stack is not one routing configuration with wider addresses. It is two forwarding systems that share some infrastructure.

An existing IPv4 path can stay completely healthy while IPv6 fails because of a missing attachment option, `::/0` route, IPv6 BGP peer, security rule, or ICMPv6 response. Treat every layer as address-family-specific and validate the paths separately.

## One Attachment, Two Routing Planes

Transit Gateway route tables support IPv4 and IPv6 routes. The same VPC attachment can carry both families, but the following objects remain independent:

| Layer | IPv4 decision | IPv6 decision |
| --- | --- | --- |
| Workload ENI | IPv4 address | IPv6 address |
| Subnet | IPv4 CIDR | IPv6 CIDR |
| VPC route table | IPv4 destination and target | IPv6 destination and target |
| VPC attachment | IPv4 works by default | IPv6 support must be enabled for interface addressing and propagation |
| Transit Gateway route table | IPv4 routes | IPv6 routes |
| Site-to-Site VPN | IPv4 inner traffic | IPv6 inner traffic on a separate VPN connection |
| Direct Connect VIF | IPv4 BGP peer | IPv6 BGP peer |
| Security controls | IPv4 CIDRs and ICMP | IPv6 CIDRs and ICMPv6 |
| Internet egress | NAT gateway or internet gateway | Egress-only or internet gateway, or a documented centralized pattern |

`0.0.0.0/0` never matches an IPv6 packet. `::/0` never matches an IPv4 packet. The same separation applies to specific prefixes, blackhole routes, prefix lists, security groups, and network ACLs.

## Enable IPv6 on Existing VPC Attachments

When IPv6 support is enabled on a Transit Gateway VPC attachment, AWS does two relevant things:

- Assigns an IPv6 address to the Transit Gateway network interface in each selected attachment subnet.
- Allows IPv6 VPC CIDRs to propagate into Transit Gateway route tables where route propagation is configured.

An attachment created before the VPC gained IPv6 is not automatically retrofitted. Modify the attachment and explicitly enable IPv6 support. The selected attachment subnets need IPv6 CIDRs, and AWS does not allow creation of a Transit Gateway attachment using IPv6-only subnets. Use IPv4-capable or dual-stack attachment subnets.

In Terraform, make the option explicit:

```hcl
resource "aws_ec2_transit_gateway_vpc_attachment" "spoke" {
  subnet_ids         = var.attachment_subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.core.id
  vpc_id             = aws_vpc.spoke.id

  ipv6_support = "enable"
}
```

The option is not a packet filter. AWS documents that, even while IPv6 support is disabled, static IPv6 Transit Gateway routes can target the attachment and IPv6 traffic can enter Transit Gateway from the VPC when the VPC route table and security controls permit it. Disabling the setting mainly removes attachment-interface IPv6 addressing and automatic VPC IPv6 CIDR propagation. Do not use it as an emergency IPv6 deny switch.

## Build IPv6 Routes at Both Table Layers

For VPC-to-VPC communication, the source subnet needs a VPC route to Transit Gateway and the route table associated with the source attachment needs a route to the destination attachment.

The VPC route is explicit:

```hcl
resource "aws_route" "service_ipv6" {
  route_table_id              = aws_route_table.application.id
  destination_ipv6_cidr_block = "2001:db8:1200::/56"
  transit_gateway_id          = aws_ec2_transit_gateway.core.id
}
```

The Transit Gateway route can be propagated from an IPv6-enabled VPC attachment or installed statically. Propagation still follows the selected Transit Gateway route-table boundaries; enabling IPv6 on an attachment does not publish its prefix to every table.

For each routing domain, review these entries as pairs:

| Purpose | IPv4 | IPv6 |
| --- | --- | --- |
| Spoke to shared services | `10.40.0.0/16 -> tgw-id` | `2001:db8:1200::/56 -> tgw-id` |
| Spoke default to inspection | `0.0.0.0/0 -> inspection attachment` | `::/0 -> inspection attachment` |
| Inspection return to spoke | Spoke IPv4 CIDR | Spoke IPv6 CIDR |
| On-premises route | On-premises IPv4 CIDR | On-premises IPv6 CIDR |

Do not copy every IPv4 route mechanically. Some IPv4 destinations do not offer IPv6, and the chosen IPv6 egress architecture may intentionally differ.

## Propagation Can Change Segmentation

Automatic VPC CIDR propagation is convenient, but enabling IPv6 support on an existing attachment can introduce newly propagated IPv6 routes into every Transit Gateway route table where that attachment already has propagation configured.

Before the change, inventory:

- Every route table into which the attachment propagates.
- Every attachment associated with those route tables.
- Overlapping or more-specific IPv6 prefixes.
- Blackhole routes used as segmentation guardrails.
- Inspection tables that need an IPv6 next hop rather than direct propagation.

In a segmented environment, first prepare the permitted IPv6 route tables and security policy. Then enable attachment support and verify the resulting routes before adding workload subnet routes. Otherwise, turning on IPv6 can create reachability that the IPv4 design intentionally denied.

## Site-to-Site VPN Is Not Dual Stack on One Connection

Current AWS Site-to-Site VPN behavior is an important exception to the shared-infrastructure model. A VPN connection terminated on Transit Gateway can carry either IPv4 inner packets or IPv6 inner packets, but not both simultaneously. Use separate VPN connections for IPv4 and IPv6 traffic.

AWS also documents that IPv6 support cannot be enabled on an existing Site-to-Site VPN connection. Create a new connection with the required inner address family. Depending on the design, AWS supports IPv4 or IPv6 outer tunnel addresses with the documented inner-family combinations, but a working IPv4 tunnel does not prove that an IPv6 route exists.

For the IPv6 VPN, verify:

- Both tunnels and their BGP sessions.
- IPv6 customer-gateway routes advertised to Transit Gateway.
- AWS IPv6 routes advertised toward the customer gateway.
- Transit Gateway route-table propagation and association in both directions.
- Customer edge firewall and route policy for IPv6.

Include both VPN connections in failover tests. Testing only the IPv4 VPN leaves the IPv6 failure mode untouched.

## Direct Connect Needs an IPv6 BGP Peer

A Direct Connect private or transit virtual interface can support an IPv4 BGP peer, an IPv6 BGP peer, or one of each. The IPv6 peer is a separate BGP session; AWS automatically allocates its peer addresses.

For Transit Gateway connectivity through a Direct Connect gateway:

- Configure an IPv6 BGP peer on the transit virtual interface.
- Include the intended IPv6 aggregates in the Direct Connect gateway association's allowed-prefix list.
- Advertise the intended on-premises IPv6 prefixes toward AWS.
- Verify the Transit Gateway table into which the Direct Connect gateway attachment propagates.

With a Transit Gateway association, Direct Connect allowed prefixes are the prefixes AWS advertises to on-premises. Include IPv4 and IPv6 deliberately rather than assuming that VPC IPv6 CIDRs are inferred.

Direct Connect CloudWatch BGP metrics include an `IpAddressFamily` dimension. Alarm on accepted and advertised prefix counts separately for `ipv4` and `ipv6`; a green physical `ConnectionState` cannot detect an IPv6-only BGP failure.

## IPv6 Egress Is Not IPv4 NAT with a New Default Route

IPv4 private subnets often send `0.0.0.0/0` through a centralized NAT gateway. Native IPv6 addresses are globally unique, and a NAT gateway does not provide general NAT66 egress for them.

The simplest outbound-only IPv6 pattern is decentralized:

- Deploy an egress-only internet gateway in each spoke VPC.
- Add `::/0` from the private subnet to that VPC's egress-only internet gateway.
- Keep the existing IPv4 default pointed at the centralized Transit Gateway and NAT architecture if required.

An egress-only internet gateway is stateful and prevents internet hosts from initiating IPv6 connections through it. It is a VPC component, so placing one in a central egress VPC is not a drop-in replacement for every spoke's IPv4 NAT path.

AWS documents more complex centralized IPv6 egress patterns for organizations that require centralized inspection. Those patterns use IPv6-to-IPv6 prefix translation with NAT66 instances and NAT gateways, or proxy instances with a Network Load Balancer. Select and validate one of those architectures rather than routing `::/0` to an IPv4 NAT design and expecting it to work.

NAT64 solves a different problem. With DNS64, Route 53 Resolver synthesizes an address under `64:ff9b::/96` for an IPv4-only destination. A route for that prefix to a NAT gateway enables an IPv6-only workload to reach IPv4. It does not provide native IPv6 internet egress and does not replace `::/0` policy.

## Inspection Requires IPv6 Symmetry Too

A stateful inspection path needs both families represented in every forward and return table. If the spoke sends `::/0` to Transit Gateway, but the inspection route table contains only IPv4 spoke CIDRs, the return IPv6 packet cannot complete the flow.

Check all of the following:

- The firewall product and rule set support the intended IPv6 traffic.
- Spoke-facing Transit Gateway tables send IPv6 inspection destinations to the appliance or firewall attachment.
- Inspection-facing tables contain IPv6 routes to every spoke and egress destination.
- VPC route tables around appliance endpoints contain IPv6 forward and return routes.
- Appliance mode is enabled where the documented topology requires flow symmetry.
- Source or destination translation, if any, is the explicitly selected IPv6 architecture.

Appliance mode preserves Availability Zone affinity for the flow. It does not create missing IPv6 routes or add IPv6 firewall policy.

## Security Rules Must Name IPv6 Explicitly

An inbound rule from `10.0.0.0/8` does not allow the same clients over IPv6. Add the correct IPv6 source prefix, not `::/0`, unless every IPv6 address is genuinely trusted. Apply the same review to egress rules, network ACLs, host firewalls, Kubernetes policies, and load balancer address types.

Do not block essential ICMPv6 indiscriminately. IPv6 routers do not fragment packets in transit. Path MTU Discovery depends on ICMPv6 Packet Too Big messages, and blocking them can produce the classic symptom where small requests work but TLS handshakes or larger responses hang.

VPC Flow Logs and Transit Gateway Flow Logs record IPv6 addresses and help locate the last observed hop. Use both when the Transit Gateway route is active but a security group, network ACL, or appliance still denies the flow.

## Roll Out with IPv6-Only Tests

Dual-stack applications can hide defects through IPv4 fallback. A normal hostname test may succeed because the client never used its AAAA answer.

Use explicit address-family tests:

```bash
dig api.internal.example AAAA
curl -6 --connect-timeout 5 https://api.internal.example/health
ping -6 2001:db8:1200::10
tracepath6 2001:db8:1200::10
```

Test one path at a time:

1. VPC-to-VPC through each routing domain.
2. Spoke-to-inspection and the return path.
3. On-premises-to-VPC over Direct Connect.
4. On-premises-to-VPC over the IPv6 VPN backup.
5. Native IPv6 internet egress.
6. NAT64 to an IPv4-only destination, if used.
7. DNS A and AAAA behavior, including negative answers.
8. Failover and failback while long-lived IPv6 sessions are active.

Capture the selected Transit Gateway route, BGP best path, firewall decision, and application result for each test. Do not accept an IPv4 result as evidence for its IPv6 counterpart.

## Official Documentation

- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [IPv6 connectivity with Transit Gateway](https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/amazon-vpc-connectivity-options-for-ipv6.html)
- [IPv4 and IPv6 traffic in Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/ipv4-ipv6.html)
- [Create a Direct Connect transit virtual interface](https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html)
- [Allowed prefixes interactions for Direct Connect gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html)
- [Enable outbound IPv6 with an egress-only internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html)
- [DNS64 and NAT64](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-nat64-dns64.html)
- [Centralized egress for IPv6](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-egress-for-ipv6.html)
- [Network MTU and Path MTU Discovery for EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html)

## Conclusion

Transit Gateway can carry IPv4 and IPv6 over shared attachments, but it does not make their routes, hybrid sessions, security policy, or egress equivalent. Enable IPv6 explicitly on VPC attachments, build separate routes at the VPC and Transit Gateway layers, use separate VPN connections for each inner family, and configure an IPv6 Direct Connect BGP peer. Most importantly, test with IPv6-only probes so IPv4 fallback cannot conceal a broken or uninspected path.
