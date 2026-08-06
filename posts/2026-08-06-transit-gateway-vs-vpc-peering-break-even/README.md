# Transit Gateway or VPC Peering: Find the Real Break-Even Point

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Transit Gateway, VPC Peering, Amazon VPC, Cloud Cost Optimization, Network Architecture, FinOps

Description: Compare Transit Gateway and VPC peering with topology math, directional traffic costs, and an honest break-even calculation.

---

There is no universal VPC count at which AWS Transit Gateway becomes cheaper than VPC peering. There is a clear topology threshold, but the AWS bill depends on Availability Zones, Regions, traffic direction, attachment owners, and every service placed on the path.

VPC peering is a direct, one-to-one connection. AWS charges nothing to create the connection, and data that remains in one Availability Zone is free even across accounts. Transit Gateway is a Regional virtual router with hourly attachment and data-processing charges. It adds transitive routing, centralized route domains, and connectivity to VPN and Direct Connect attachments that VPC peering cannot provide through a peer.

The useful decision is therefore not "three VPCs means peering, four means Transit Gateway." Calculate three separate break-even points: topology complexity, direct AWS network cost, and operational capability.

## Compare the Routing Models First

VPC peering connects exactly two VPCs. Each owner accepts or creates the connection, installs routes to the peer CIDRs, and permits the traffic in security controls. The VPCs cannot have overlapping IPv4 or IPv6 CIDRs.

Peering is not transitive. If VPC A peers with B and C, B cannot reach C through A. B and C need their own peering connection. A peer also cannot use another VPC's internet gateway, NAT device, Site-to-Site VPN, Direct Connect connection, or gateway endpoint. AWS calls this edge-to-edge routing and explicitly does not support it.

Transit Gateway uses attachments and route tables. Each attachment is associated with one route table for ingress lookups and can propagate routes to one or more route tables. That hub-and-spoke model can route between VPC, VPN, Direct Connect gateway, Connect, Network Firewall, and peering attachments according to the configured route domains.

Both models reject ambiguous network plans. You cannot create VPC peering between overlapping VPCs, and Transit Gateway cannot route between VPCs with identical or overlapping CIDRs. Choosing a hub does not eliminate IP address management.

## Calculate the Topology Break-Even

For a full mesh of `N` VPCs, the number of VPC peering connections is:

```text
peering connections = N * (N - 1) / 2
Transit Gateway VPC attachments = N
```

The counts are equal at three VPCs:

| VPCs | Full-mesh peerings | TGW VPC attachments |
| ---: | ---: | ---: |
| 2 | 1 | 2 |
| 3 | 3 | 3 |
| 4 | 6 | 4 |
| 10 | 45 | 10 |
| 50 | 1,225 | 50 |

At four fully meshed VPCs, Transit Gateway uses fewer relationship objects. This is a topology break-even, not a monetary one. Each peering still has route entries and policy on both sides, while a Transit Gateway design also has VPC routes, attachment associations, propagations, and central routes. Count managed changes, not only objects.

The full-mesh assumption is often wrong. If 20 isolated application VPCs each talk only to one shared service VPC, 20 peerings may be perfectly understandable. If those applications need east-west traffic, centralized inspection, and two on-premises connections, the hub capabilities matter much sooner.

Model the required graph:

- list every VPC as a node;
- list only required communication as edges;
- mark hybrid, egress, inspection, and cross-Region paths;
- group edges by trust domain and owning team;
- project additions and removals for the next 12 to 24 months.

Do not pay for a full mesh that policy should forbid.

## Build a Directional Cost Model

For direct network comparison, use current prices from the exact Regions involved. A reusable model is:

```text
C_peering = F_peering + sum(GB_flow * peering_variable_rate_flow)

C_tgw =
    attachment_count * billed_hours * attachment_hour_rate
  + sum(GB_source_attachment * TGW_processing_rate)
  + other_attachment_hours
  + peering_or_inter-Region_transfer
  + inspection_and_service_costs
```

`F_peering` is normally zero because AWS does not charge to create a VPC peering connection. The variable rate is not always zero:

- traffic over peering that stays within the same Availability Zone is free;
- same-Region peering traffic that crosses an Availability Zone is currently listed at `$0.01/GB` in both the "In" and "Out" direction;
- cross-Region peering uses the applicable inter-Region data transfer pricing.

For a 1 GB same-Region flow that crosses AZs, the current published VPC rate therefore produces `$0.02` in aggregate across the charged directions. Confirm payer allocation in the Cost and Usage Report rather than assuming one account receives the entire line item.

Transit Gateway charges the VPC owner for each attachment-hour and for each GB that the VPC sends into the Transit Gateway. The current US East (Ohio) pricing example uses `$0.05` per VPC attachment-hour and `$0.02/GB` of data processing. AWS states that its internal routing to another Availability Zone does not add a Transit Gateway cross-AZ charge. The example rates are not universal; substitute the current price for each Region.

Count traffic when it enters Transit Gateway. A 5 GB request from VPC A and a 100 GB response from VPC B produces 105 GB sent from VPC attachments into the gateway. If a centralized appliance, NAT gateway, or Network Firewall changes the path, map every charged ingress and service-processing point rather than applying one flat rate.

## Solve the Cost Break-Even Instead of Guessing

When the two options have different variable rates, the traffic break-even is:

```text
GB_break_even =
  (TGW fixed cost - peering fixed cost)
  / (peering variable rate - TGW variable rate)
```

This equation has a meaningful positive answer only when peering's variable rate is greater than Transit Gateway's. If the rates are equal, Transit Gateway's fixed attachment cost never disappears through higher traffic. If peering's rate is lower, there is no direct-network-cost traffic break-even under those assumptions.

Consider four VPCs, 730 hours, and 20 TiB of total bidirectional traffic, all crossing Availability Zones in US East (Ohio). Using the published example rates:

```text
Traffic: 20 * 1,024 GB = 20,480 GB

Peering variable cost:
  20,480 * ($0.01 in + $0.01 out) = $409.60

Transit Gateway fixed cost:
  4 * 730 * $0.05 = $146.00

Transit Gateway processing:
  20,480 * $0.02 = $409.60

Transit Gateway total:
  $146.00 + $409.60 = $555.60
```

Under these narrowly defined assumptions, the per-GB rates are equal, so Transit Gateway remains `$146.00` more expensive on the direct AWS network bill. If the peering traffic stays in one Availability Zone, peering's data charge is zero and the gap is larger. This is an illustrative calculation from current published rates, not a quotation for a future bill.

The conclusion changes when the architecture changes. A hub may remove duplicated virtual appliances, reduce the number of VPNs, centralize inspection, or avoid a peering quota. Conversely, routing every flow through inspection can add appliance hours, processing, NAT, and additional data paths. Put those deltas in separate rows so an architectural benefit is not disguised as a Transit Gateway transport discount.

## Put Operational Cost on the Same Page

The AWS invoice omits engineering work and change risk. Estimate the monthly operational load for each design:

```text
operational cost =
    planned route changes * average handling time
  + access and approval work
  + incident diagnosis time
  + audit and evidence work
  + expected cost of configuration failure
```

Use your own observed values. Do not invent an hourly engineer rate merely to force a preferred answer.

VPC peering can be the lower-risk design when there are few stable pairs, each VPC owner controls its routes, and no transit is required. Transit Gateway can be the lower-risk design when connectivity policy is centrally owned, the graph changes frequently, segmentation needs multiple route domains, or hybrid connectivity must be shared.

Centralization also concentrates mistakes. A propagated route or broad static route in a shared Transit Gateway table can affect many attachments. Separate route tables by trust domain, test route changes, and use blackhole routes or policy automation where appropriate.

## Compare Capabilities That Can Veto the Price Choice

| Requirement | VPC peering | Transit Gateway |
| --- | --- | --- |
| Direct one-to-one VPC path | Strong fit | Supported with an extra routing hop |
| Full transitive hub | Not supported | Supported |
| Use a peer's NAT, VPN, or Direct Connect | Not supported | Supported through designed attachments and routes |
| Central route-domain segmentation | Pairwise VPC routes | Multiple Transit Gateway route tables |
| Same-AZ data path with no peering charge | Supported | TGW processing still applies |
| Overlapping VPC CIDRs | Not supported | Routing between overlaps not supported |
| Very sparse, stable graph | Often simpler | May add unnecessary fixed cost |
| Rapidly changing many-VPC graph | Pairwise changes grow | Hub model often reduces coordination |

These are design characteristics, not a verdict. For example, a central inspection requirement can make Transit Gateway the viable choice even if peering transport is cheaper. A two-VPC latency-sensitive data plane may favor peering even if the company uses Transit Gateway elsewhere.

Measure performance before migration. AWS describes VPC peering as having no separate gateway, single point of failure, or bandwidth bottleneck. Transit Gateway adds a routing hop and enforces different MTU behavior. AWS's migration guidance warns that moving from a same-Region peering path's 9001-byte MTU to Transit Gateway's 8500-byte MTU can disrupt traffic. Current Transit Gateway documentation says Path MTU Discovery is supported for traffic entering on VPC and Connect attachments, but not on Site-to-Site VPN, Direct Connect, or peering attachments. Test application payloads, throughput, connection behavior, and failure recovery rather than comparing only nominal service scale.

## Use a Decision Record, Not a Slogan

A useful decision record includes:

- current and projected VPC count;
- required communication graph, not a presumed full mesh;
- Regions and Availability Zones for both ends of each major flow;
- monthly GB in each direction from billing or flow data;
- current attachment and transfer rates with retrieval date;
- hybrid, egress, inspection, and cross-account requirements;
- route-table change ownership and expected change frequency;
- quota headroom and growth trigger;
- latency, throughput, MTU, and availability tests;
- a migration and rollback plan.

Set a measurable trigger for reevaluation. Examples include a projected peering quota threshold, more than a defined number of pairwise route changes per month, the first shared Direct Connect requirement, or a new inspection mandate. "We might have many VPCs someday" is not a cost model.

## Migrate Without a Flag Day

AWS's migration guidance demonstrates using more specific VPC routes to move selected subnet traffic from peering to Transit Gateway while a broader route remains on peering. This can provide a controlled canary because longest-prefix match selects the new path.

Before changing production routes:

1. Create and validate attachments, associations, propagations, and return routes.
2. Ensure packets fit the Transit Gateway MTU and test the real application protocol.
3. Start with a specific source and destination subnet pair.
4. Observe both forward and return paths for asymmetry.
5. Expand only after error rate, latency, and throughput remain acceptable.
6. Retain the peering route for the defined rollback window.
7. Delete unused peerings only after confirming no routes or DNS dependencies remain.

Long-lived parallel paths can create asymmetric routing, especially with stateful appliances. Treat coexistence as a staged migration state with an owner and expiry.

## Official Documentation

- [What Is VPC Peering?](https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html)
- [How VPC Peering Connections Work](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html)
- [VPC Peering Configurations](https://docs.aws.amazon.com/vpc/latest/peering/peering-configurations-full-access.html)
- [How AWS Transit Gateway Works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway Pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon VPC Pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS Guidance for Migrating VPC Peering to Transit Gateway](https://aws.amazon.com/blogs/networking-and-content-delivery/best-practices-and-considerations-to-migrate-from-vpc-peering-to-aws-transit-gateway/)

## Conclusion

Four fully meshed VPCs are the point where the peering-connection count exceeds the number of Transit Gateway attachments, but that is only a topology result. Calculate fixed attachment-hours and directional per-GB charges with current Regional prices. Then include requirements that money alone cannot satisfy: transit, hybrid connectivity, centralized policy, quota headroom, MTU, and operational ownership. The real break-even is the point where the chosen design meets the required graph at the lowest total cost and risk.
