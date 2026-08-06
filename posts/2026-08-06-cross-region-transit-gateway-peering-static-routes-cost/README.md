# Cross-Region Transit Gateway Peering: Static Routes and Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Transit Gateway, Transit Gateway Peering, Amazon VPC, Cross-Region Networking, Cloud Cost, Network Architecture

Description: Build cross-Region Transit Gateway peering with explicit static routes, correct return paths, and a directional AWS cost model.

---

Cross-Region AWS Transit Gateway peering connects two Regional routing domains over the AWS network. It supports IPv4 and IPv6, works between the same or different AWS accounts, and can carry traffic from an attachment on one Transit Gateway to an attachment on the other.

What it does not provide is dynamic route propagation across the peering attachment. AWS supports only static routes for Transit Gateway peering. A remote VPC CIDR learned by one Transit Gateway is not automatically advertised into the peer's route tables. Every reachable remote prefix, or an intentional aggregate covering it, must be represented by a static route on the other side.

That distinction matters when people call the design "non-transitive." The data plane can route transitively from a local VPC attachment, through a peering attachment, to a remote VPC or VPN attachment. The route knowledge is not transitive: the peer does not dynamically learn and re-advertise those attachment routes. Treat the two Regional route domains as an explicit routing contract.

## The Complete Route Path

Assume a workload in VPC A in `us-east-1` must reach VPC B in `eu-west-1`:

```text
VPC A subnet route table
  -> Transit Gateway A VPC attachment
  -> Transit Gateway A associated route table
  -> static route for VPC B to the peering attachment
  -> Transit Gateway B peering attachment
  -> Transit Gateway B associated route table
  -> route for VPC B to its VPC attachment
  -> VPC B subnet route table
```

The reply needs the mirror image. A successful forward path does not create the return path.

For each direction, verify four layers:

| Layer | Required state |
| --- | --- |
| VPC route table | Remote prefix targets the local Transit Gateway |
| Ingress attachment association | Attachment is associated with the intended Transit Gateway route table |
| Transit Gateway route | Remote prefix resolves to the correct local or peering attachment |
| Security and return routing | Security groups, network ACLs, and reverse routes permit the reply |

An attachment is associated with one Transit Gateway route table, and that associated table is used when traffic enters through the attachment. An attachment can propagate routes into multiple route tables, but peering attachments do not propagate dynamic routes. This is why adding a static route to an unrelated table has no effect on the flow.

## Build the Peering Deliberately

The requester creates the peering attachment by naming its Transit Gateway, the peer Transit Gateway, the peer account, and peer Region. The owner of the peer Transit Gateway accepts it. Even in the same account, the accepter-side action is part of the documented workflow.

After the attachment becomes `available`:

1. Identify the route tables associated with every source attachment that may use the peer.
2. Add static routes for the remote prefixes to the peering attachment on Transit Gateway A.
3. Repeat on Transit Gateway B for the prefixes behind Transit Gateway A.
4. Add or verify the VPC subnet routes toward each local Transit Gateway.
5. Verify routes from the destination attachment back to the original source.
6. Test the application protocol in both directions and record the selected routes.

Use unique Transit Gateway Amazon-side ASNs. Peering does not dynamically exchange BGP routes today, so duplicate ASNs do not break the current static data path. AWS nevertheless recommends unique ASNs to preserve compatibility if route propagation for peering is introduced later.

## Aggregate Only When the Aggregate Is True

Static routing creates a lifecycle problem. Adding a VPC in Region B changes the contract in Region A. Advertising every VPC CIDR individually is precise but creates many route updates. Advertising a Regional aggregate reduces churn but is safe only if IP address management guarantees that the entire aggregate belongs behind that peer.

For example, a static route for `10.64.0.0/12` to the peering attachment is reasonable only when:

- the allocation system reserves that block for the remote routing domain;
- no local attachment uses a more specific prefix unexpectedly;
- security policy permits every intended subnet in the aggregate;
- unused space cannot later be assigned behind a different next hop without review;
- both sides maintain compatible return-route aggregates.

Transit Gateway uses longest-prefix match first. A more specific local route can therefore override a broad peering aggregate. For routes with the same CIDR, AWS applies its documented attachment-type priority, with static routes ahead of propagated routes. That makes a broad static route powerful: it can change forwarding without changing route propagation. Review it as policy, not just as route compression.

Create a route manifest in source control or another governed system:

```yaml
peer: tgw-peer-use1-euw1
side: us-east-1
route_table: tgw-rtb-production
destinations:
  - cidr: 10.64.0.0/12
    owner: eu-network-platform
    purpose: eu-production-allocation
    change_ticket: NET-4821
```

This schema is a recommended control, not an AWS resource format. Compare the intended manifest with the actual route tables and fail changes that introduce overlap, an unowned aggregate, or a one-sided route.

## Isolation Still Happens on Both Transit Gateways

Peering two Transit Gateways does not merge their route tables. Each side retains its own associations, propagations, static routes, and blackholes. That is useful for segmentation: production, development, and shared-services attachments can receive different views of the peer.

Avoid installing the remote aggregate into every route table automatically. For each route table, answer:

- Which local attachments may initiate toward the peer?
- Which remote prefixes may they reach?
- Which peer-originated attachments may return to this local prefix?
- Is a blackhole route required to prevent a broader fallback route?
- Which account owns changes on each side?

Security groups and network ACLs remain separate controls. Transit Gateway route tables decide the next hop; they do not authenticate an application or replace subnet and workload policy.

## Plan for DNS Separately

AWS documents a specific DNS limitation for Transit Gateway peering: Route 53 Resolver in another Region cannot resolve public or private IPv4 DNS hostnames to private IPv4 addresses across the peering connection. Do not assume that a working IP route creates cross-Region private DNS behavior.

Design DNS forwarding, Resolver endpoints and rules, private hosted-zone associations, or application-specific service discovery for the required names. Test DNS from the actual source VPC and Region. A probe from an administrator workstation can use a different resolver path and hide the problem.

## Understand Encryption and Failure Domains

AWS states that inter-Region Transit Gateway peering traffic stays on the AWS global network and is encrypted with AES-256 at the virtual network layer. Traffic is also encrypted at the physical layer when it traverses links outside AWS's physical control. This protection does not remove the need for application-layer encryption where identity, payload confidentiality, or compliance requires it.

The two Transit Gateways remain Regional resources. A peering design should therefore define:

- what happens when one Region or peering attachment is unavailable;
- whether applications fail closed, use another Region, or use a separate recovery path;
- how static routes are withdrawn or changed during recovery;
- how DNS aligns with the network failover decision;
- who has authority to change both accounts and Regions during an incident.

Transit Gateway peering does not support equal-cost multipath routing. AWS explains that peering has no dynamic routing and the same static route cannot target two different peering attachments. Do not model two peerings as an ECMP pair.

## Calculate Costs by Direction

Cross-Region peering has both fixed and variable components:

```text
monthly cost =
    VPC attachment-hours
  + peering attachment-hours on Transit Gateway A
  + peering attachment-hours on Transit Gateway B
  + source-side Transit Gateway data processing
  + inter-Region data transfer out
  + other service and observability charges
```

AWS bills each Transit Gateway owner for its side of a peering attachment. VPC attachment-hours are billed to the VPC account owner. Transit Gateway data processing is charged for each GB sent from a VPC, Direct Connect, VPN, or Network Firewall attachment into the Transit Gateway. AWS does not charge Transit Gateway data processing for bytes sent from a peering attachment into the destination Transit Gateway.

By default, AWS allocates Transit Gateway data processing and data transfer charges to the account that owns the source attachment. A Transit Gateway owner can instead use a Flexible Cost Allocation metering policy to allocate supported data processing and transfer usage to the source attachment owner, destination attachment owner, or Transit Gateway owner. Hourly attachment usage is not eligible for flexible allocation. For peering traffic, each Transit Gateway applies its own metering policy independently. This changes which account receives a charge, not the direction in which the usage is generated or the rate used to calculate it.

The AWS pricing example for 1 GB sent from US East (N. Virginia) to US West (Oregon) shows `$0.02` of source-side Transit Gateway data processing and `$0.02` of inter-Region data transfer out, for `$0.04` total variable cost. It shows no data-processing charge on the destination Transit Gateway and no charge for inbound inter-Region transfer. These are the example's Regions and rates, not global constants.

Model return traffic as a new direction. If the Oregon workload sends 1 GB back, Oregon becomes the source for Transit Gateway processing and inter-Region data transfer out. A request of 10 MB that produces a 2 GB response is not a 10 MB cost flow.

Use a directional worksheet:

| Flow | GB/month | Source Region | TGW processing rate | Inter-Region DTO rate | Variable cost |
| --- | ---: | --- | ---: | ---: | ---: |
| A request to B | 500 | Region A | current Region A rate | A to B rate | calculate |
| B response to A | 4,000 | Region B | current Region B rate | B to A rate | calculate |
| Replication A to B | 12,000 | Region A | current Region A rate | A to B rate | calculate |

Retrieve current rates from the pricing pages and inspect each Transit Gateway's cost allocation configuration at estimation and review time. Add taxes, monitoring, traffic mirroring, firewall inspection, NAT, load balancing, or Direct Connect where those services are actually on the path.

## Operate Static Routes as Production State

The most common failures are control-plane drift, not packet-forwarding defects:

- a new remote CIDR is added on only one side;
- the static route is placed in the wrong associated table;
- an aggregate captures a prefix that moved elsewhere;
- a route remains after an attachment is removed and becomes a blackhole;
- account or Region context causes an operator to change the wrong Transit Gateway;
- DNS still points to the old Region after the network route changes.

Monitor attachment state and route-table changes with the AWS control-plane audit trail. Use VPC Flow Logs and Transit Gateway Flow Logs to observe accepted and rejected flows where appropriate. Synthetic application probes should run from representative VPCs on both sides because a single central probe cannot prove every route-table association.

Before launch, verify:

- [ ] The peering attachment is accepted and `available` on both sides.
- [ ] Every source attachment uses the intended associated route table.
- [ ] Static remote routes exist on both Transit Gateways.
- [ ] Aggregates are backed by governed, non-overlapping allocations.
- [ ] VPC route tables cover forward and return traffic.
- [ ] Security controls allow only the intended flows.
- [ ] DNS has been tested from each source Region.
- [ ] Directional traffic and both owners' attachment-hours are in the cost model.
- [ ] Failover and rollback change network and DNS state coherently.

## Official Documentation

- [Transit Gateway Peering Attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html)
- [How AWS Transit Gateway Works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Create a Transit Gateway Peering Attachment](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering-create.html)
- [Accept a Transit Gateway Peering Attachment](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering-accept-reject.html)
- [Transit Gateway Quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [Flexible Cost Allocation](https://docs.aws.amazon.com/vpc/latest/tgw/metering-policy.html)
- [AWS Transit Gateway Pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon EC2 On-Demand Data Transfer Pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)

## Conclusion

Cross-Region Transit Gateway peering provides a scalable transit data path, but it does not exchange attachment routes dynamically. Build a two-sided static routing contract, associate the right ingress tables, govern aggregates, and test DNS and return paths independently. Calculate every flow by source direction: the source side generates Transit Gateway processing and outbound inter-Region transfer usage, while traffic entering from the peer is not processed again by the destination Transit Gateway. Apply the default sender-based allocation or each gateway's custom metering policy to determine which account is billed for that usage.
