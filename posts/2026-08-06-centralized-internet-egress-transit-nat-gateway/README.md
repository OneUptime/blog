# Centralized Internet Egress with Transit Gateway and NAT Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, NAT Gateway, Internet Egress, VPC, Cloud Cost

Description: Route private spoke VPCs through a central NAT Gateway with complete forward and return routes, zonal resilience, and an honest per-gigabyte cost model.

---

A centralized egress VPC lets many private spoke VPCs share outbound IPv4 addresses, controls, and logging. AWS Transit Gateway carries spoke traffic to the egress VPC, a public NAT Gateway translates it, and an internet gateway provides internet reachability.

The architecture is not one default route. It is a chain of VPC and Transit Gateway route tables with a stateful NAT return path. It also adds Transit Gateway and NAT Gateway processing charges to internet data transfer and can add cross-Availability-Zone cost when zonal placement is careless.

Build the packet path and cost equation before deciding that one central NAT is cheaper than NAT gateways in each VPC.

## Define the Components

Use this example:

| Component | CIDR or role |
| --- | --- |
| Spoke A VPC | `10.10.0.0/16` |
| Spoke B VPC | `10.20.0.0/16` |
| Egress VPC | `10.100.0.0/16` |
| Transit Gateway spoke table | Sends default traffic to egress attachment |
| Transit Gateway egress table | Sends replies to spoke attachments |
| Egress attachment subnets | Private, one per required zone |
| NAT gateways | Public, normally one per supported zone |
| Internet gateway | Attached to egress VPC |

Spoke workloads have no public IPv4 addresses and their VPCs do not need internet gateways for this path. The NAT Gateway's Elastic IP becomes the public source seen by internet destinations.

This provides outbound connections and their replies. A public NAT Gateway does not accept unsolicited inbound internet sessions for private spoke workloads.

## Trace the Forward Route

For a packet from `10.10.4.25` to `198.51.100.40`, the forward path is:

1. the spoke workload subnet sends `0.0.0.0/0` to Transit Gateway;
2. the Transit Gateway table associated with the spoke attachment sends `0.0.0.0/0` to the egress VPC attachment;
3. Transit Gateway delivers the packet into a private egress attachment subnet;
4. that subnet's route table sends `0.0.0.0/0` to the NAT Gateway;
5. the NAT Gateway translates the private source to its Elastic IP;
6. the NAT public subnet sends `0.0.0.0/0` to the internet gateway;
7. the internet gateway sends the packet to the internet.

Every numbered step has an independently managed routing or stateful component.

## Configure the Spoke VPC Tables

Each private workload subnet that needs central egress requires:

| Destination | Target |
| --- | --- |
| Spoke VPC CIDR | `local` |
| `0.0.0.0/0` | Transit Gateway ID |

A default route sends private, AWS-service, and internet destinations to Transit Gateway unless a more-specific route wins. Add private service paths deliberately:

- gateway VPC endpoint routes for supported services such as Amazon S3 and DynamoDB;
- interface endpoint access for services exposed privately;
- specific corporate or peer routes where they should not use internet egress;
- explicit denied routes or segmentation controls.

Using private endpoints can reduce NAT and Transit Gateway processing, keep traffic off the public path, and improve policy control. Compare endpoint hourly and data processing prices with actual traffic rather than assuming one option is always cheaper.

## Configure the Transit Gateway Tables

Associate spoke attachments with a spoke-ingress table:

| Destination | Target | Type |
| --- | --- | --- |
| `0.0.0.0/0` | Egress VPC attachment | Static |

Associate the egress VPC attachment with a separate return table:

| Destination | Target | Type |
| --- | --- | --- |
| `10.10.0.0/16` | Spoke A attachment | Propagated |
| `10.20.0.0/16` | Spoke B attachment | Propagated |

The separate tables prevent the packet returning from the egress VPC from matching the default route back to the egress VPC. They also let spoke domains share egress without automatically gaining routes to one another.

Do not propagate spoke routes into the spoke-ingress table when spokes should remain isolated. Propagate them into the egress return table so NAT-translated replies can reach the correct spoke.

## Put the Egress Attachment in Private Subnets

AWS's documented centralized egress example places the Transit Gateway attachment in a private subnet. Its route table is:

| Destination | Target |
| --- | --- |
| Egress VPC CIDR | `local` |
| `0.0.0.0/0` | NAT Gateway ID |

If the attachment uses the public NAT subnet, traffic arriving with the spoke's private source can follow the internet gateway route directly. The internet gateway cannot provide internet access for that unassociated private source, so the packet is dropped instead of being translated.

Use dedicated attachment subnets and make the NAT Gateway the explicit next hop.

For a zonal NAT design, give each attachment subnet a default route to the NAT Gateway in the same Availability Zone. This avoids making a healthy zone depend on a NAT Gateway in another zone and reduces avoidable cross-zone transfer.

## Configure the NAT Public Subnet Return Routes

The NAT Gateway lives in a public subnet whose route table needs both internet and spoke routes:

| Destination | Target |
| --- | --- |
| Egress VPC CIDR | `local` |
| `10.10.0.0/16` | Transit Gateway ID |
| `10.20.0.0/16` | Transit Gateway ID |
| `0.0.0.0/0` | Internet gateway ID |

On the forward path, the default route sends translated traffic to the internet gateway. On the return path, the NAT Gateway restores the spoke's private destination, and the specific spoke route sends the reply back to Transit Gateway.

If the spoke routes are missing, outbound packets can leave but replies cannot return to the workload. A route to only the egress VPC CIDR is insufficient because the translated destination belongs to a remote spoke CIDR.

Use specific spoke CIDRs or a reviewed aggregate. A broad `10.0.0.0/8` route is compact but can capture private destinations that belong to VPN, Direct Connect, or another routing domain.

## Preserve Zonal Resilience

A conventional public NAT Gateway is zonally scoped. For high availability across three workload zones, deploy a NAT Gateway in each egress zone and select a Transit Gateway attachment subnet in each of those zones.

Use per-zone attachment-subnet route tables:

```text
attachment subnet A -> NAT Gateway A
attachment subnet B -> NAT Gateway B
attachment subnet C -> NAT Gateway C
```

Then test traffic sourced from every spoke zone. AWS Transit Gateway tries to maintain zone affinity for ordinary VPC attachments, but missing attachment zones or custom routes can create cross-zone paths.

AWS also offers Regional NAT Gateway, which automatically expands and contracts across the Availability Zones in the workload footprint and has its own route table. It uses a different resource and billing model from a zonal public NAT Gateway. Evaluate current Regional NAT Gateway availability, routing requirements, and pricing before choosing it for a central design.

Do not centralize every Region through one inter-Region path. Keep egress Regional unless a specific compliance design justifies the latency, failure-domain, and inter-Region transfer implications.

## Build the Real Cost Equation

For each gigabyte sent by a spoke workload through a conventional centralized egress path, evaluate:

```text
monthly cost =
  Transit Gateway attachment-hours
  + Transit Gateway data processing
  + NAT Gateway-hours
  + NAT Gateway data processing
  + internet data transfer out
  + applicable regional or cross-zone data transfer
  + logging, firewall, endpoint, and public IPv4 costs
```

Use current prices for the deployment Region. AWS prices and discount interactions can change, so do not encode one Region's rates into architecture policy.

Important ownership details include:

- Transit Gateway charges data processing for bytes sent from a VPC attachment into Transit Gateway;
- the VPC owner that sends traffic to Transit Gateway is charged under the documented model;
- NAT Gateway charges hourly and per processed gigabyte;
- internet data transfer out is separate;
- standard AWS data transfer charges can apply in addition to Transit Gateway charges;
- cross-zone routing to a zonal NAT Gateway can add data transfer cost;
- traffic through a firewall adds its own hourly and processing model, subject to current pricing discounts.

Centralization reduces the number of NAT gateways only when the shared design uses fewer billed NAT resources than decentralized alternatives. Transit Gateway attachment and per-gigabyte costs can outweigh that saving at higher traffic volumes.

## Reduce Avoidable Processing

Classify destinations from flow data:

| Destination class | Better path to evaluate |
| --- | --- |
| Amazon S3 or DynamoDB | Gateway VPC endpoint |
| AWS APIs | Interface endpoints or central endpoint design |
| Corporate networks | Direct Connect or Site-to-Site VPN path |
| Other VPC services | Transit Gateway service route or PrivateLink |
| Public internet | NAT and internet gateway |

Add more-specific routes so private service traffic does not fall through `0.0.0.0/0` to NAT. Confirm DNS resolves to the intended private endpoint; a route cannot help when the application still selects a public address.

Track bytes by spoke, destination class, zone, and egress resource. Allocation tags alone do not attribute shared per-gigabyte charges to a service accurately.

## Add Inspection Without Breaking Symmetry

If AWS Network Firewall or a third-party appliance must inspect egress, expand the egress VPC path:

```text
Transit Gateway attachment
  -> same-zone firewall endpoint
  -> NAT Gateway
  -> internet gateway
```

The return path must traverse the same firewall endpoint in reverse. AWS Network Firewall does not support asymmetric routing. Use the documented centralized deployment, same-zone route tables, and Transit Gateway appliance mode on the inspection VPC attachment where required.

Do not insert a middlebox by changing only the forward default route. The NAT public subnet, firewall endpoint subnet, and Transit Gateway return table all need matching reverse paths.

## Validate the End-to-End Path

For each spoke and zone:

1. confirm the workload subnet's active default route targets Transit Gateway;
2. confirm the source attachment's associated table defaults to the egress attachment;
3. confirm the egress attachment subnet defaults to the intended NAT Gateway;
4. confirm the NAT subnet defaults to the internet gateway;
5. confirm the NAT subnet has a more-specific route back to the spoke through Transit Gateway;
6. confirm the egress attachment's associated table routes back to the spoke;
7. observe the expected NAT Elastic IP at an approved external test endpoint;
8. test DNS, TCP, UDP, large packets, and representative long-lived sessions;
9. impair one zone and verify the designed failure behavior;
10. compare measured bytes with the cost allocation model.

Use Transit Gateway and VPC Flow Logs to bracket failures. NAT Gateway CloudWatch metrics can identify port allocation errors, connection attempts, packet drops, and traffic volume. Route-analysis tools do not replace a live NAT translation test.

## Official Documentation

- [AWS Transit Gateway centralized outbound internet routing](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html#tgw-centralized-router)
- [Amazon VPC NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [Amazon VPC route options for NAT](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-nat)
- [Regional NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [Internet gateways](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)

## Conclusion

Centralized NAT egress requires six coherent decisions: spoke VPC default, spoke Transit Gateway default, private egress attachment route, NAT public-subnet internet route, NAT subnet return route, and Transit Gateway return route. Deploy zonal resilience deliberately and total Transit Gateway, NAT, transfer, endpoint, firewall, and logging costs per real traffic path. Sharing a NAT Gateway simplifies policy, but it is not automatically the cheapest or most available design.
