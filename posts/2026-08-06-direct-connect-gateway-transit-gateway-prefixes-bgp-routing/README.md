# Direct Connect Gateway to Transit Gateway: Prefixes, BGP, and Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Direct Connect, AWS Transit Gateway, BGP, Hybrid Cloud, Network Routing, Cloud Networking

Description: Design Direct Connect Gateway and Transit Gateway routing with correct allowed prefixes, BGP policy, route precedence, ownership, and cost.

---

Connecting AWS Direct Connect to AWS Transit Gateway creates several routing control planes, not one. A packet can cross an on-premises BGP policy, a transit virtual interface, a Direct Connect gateway, a Transit Gateway route table, and a VPC route table. A green BGP session proves only that the peers exchanged keepalives. It does not prove that AWS advertises the intended VPC prefixes, that Transit Gateway learned the on-premises prefixes, or that either return path is usable.

The most important distinction is this:

- Direct Connect Gateway allowed prefixes control which AWS-side prefixes are advertised to on-premises for a Transit Gateway association.
- The customer router advertises on-premises prefixes to AWS over BGP, and the Direct Connect gateway attachment can propagate those learned routes into selected Transit Gateway route tables.

Allowed prefixes are not a copy of the Transit Gateway route table and are not a substitute for BGP, Transit Gateway segmentation, security policy, or a return route.

## Map Every Component and Owner

The intended data path is:

```text
On-premises router
  -> Direct Connect connection
  -> transit virtual interface
  -> Direct Connect gateway
  -> Direct Connect gateway attachment
  -> Transit Gateway route table
  -> VPC attachment
  -> VPC subnet route table
  -> workload
```

A transit virtual interface is the Direct Connect VIF type used to access one or more Transit Gateways through a Direct Connect gateway. The Direct Connect gateway is a global resource and acts as a distributed set of BGP route reflectors; AWS documents that it is outside the data traffic path and has built-in availability.

Before implementation, record these owners separately:

| Resource or decision | Typical owner |
| --- | --- |
| Physical or hosted Direct Connect connection | Connectivity account or partner |
| Transit VIF and customer router BGP | Hybrid network team |
| Direct Connect gateway and allowed prefixes | Direct Connect gateway owner |
| Transit Gateway and route tables | Cloud network owner |
| VPC attachment and VPC routes | VPC and cloud network owners |
| On-premises route policy and firewall | Enterprise network owner |
| End-to-end application validation | Workload owner with network teams |

Accounts can differ. For a cross-account association, AWS requires the Transit Gateway owner to create an association proposal. The Direct Connect gateway owner accepts or rejects it and can specify allowed prefixes during acceptance. Treat that acceptance as a routing-policy approval, not a clerical step.

## Make the ASNs Different Before Building the VIF

The Transit Gateway Amazon-side ASN and Direct Connect gateway ASN must be different. AWS gives the example that using default ASN `64512` for both causes the association request to fail.

The customer router peer ASN on the transit VIF must also be different from the Direct Connect gateway ASN.

The Transit Gateway ASN is not visible in the AS path advertised to the on-premises router. The Direct Connect gateway replaces that path with its own ASN. This surprises teams that expect to identify a Regional Transit Gateway by AS path on the customer router.

Record at least three identities:

- customer router peer ASN on the transit VIF;
- Direct Connect gateway Amazon-side ASN;
- Transit Gateway Amazon-side ASN.

Direct Connect added long ASN support for virtual-interface BGP sessions in 2025. Current documentation accepts customer peer ASN values from `1` through `4294967294`, subject to reserved-range and ownership rules. Check the current service rules before allocating an ASN, and never reuse the Direct Connect gateway ASN for an associated Transit Gateway.

## Understand Allowed Prefixes Precisely

Allowed prefixes behave differently for a Direct Connect gateway associated with a virtual private gateway and one associated with a Transit Gateway. For a Transit Gateway association, AWS directly provisions and advertises only the entered prefixes to on-premises over the transit VIF. They appear as originating from the Direct Connect gateway ASN.

The advertised prefix does not have to equal an attached VPC CIDR. AWS documents all of these outcomes for a Transit Gateway with VPC CIDR `10.0.0.0/16`:

- allowed prefix `22.0.0.0/24` advertises `22.0.0.0/24`, not the VPC CIDR;
- allowed prefix `10.0.0.0/24` advertises that more specific `/24`, not the VPC `/16`;
- allowed prefix `10.0.0.0/8` advertises the `/8` aggregate.

This is not the filtering behavior used with a virtual private gateway. Do not reuse a virtual-gateway mental model for a Transit Gateway association.

The direct-provisioning behavior has an operational consequence: an allowed prefix can be visible on the on-premises router even when no attached VPC owns it or the Transit Gateway route table cannot deliver it. That is an inference from the documented behavior, and it should be tested as a potential blackhole condition. Keep an authoritative mapping from every advertised aggregate to reachable, governed child prefixes.

When one Direct Connect gateway is associated with multiple Transit Gateways, their allowed-prefix lists cannot overlap. AWS specifically notes that `0.0.0.0/0` cannot be used for one association when it overlaps prefixes on another. The API rejects the overlap.

Changing allowed prefixes moves the association from `associated` to `updating`. AWS says other prefixes are not affected, but traffic using the prefix being added, removed, or modified can be delayed or dropped. Make an allowed-prefix edit through a maintenance and rollback plan.

## Separate AWS-to-On-Premises and On-Premises-to-AWS Routing

For AWS to on-premises traffic:

1. A workload subnet route sends the on-premises prefix to Transit Gateway.
2. The route table associated with the VPC attachment selects the Direct Connect gateway attachment.
3. Direct Connect carries the packet over the selected transit VIF.
4. The customer router has learned the AWS allowed prefixes needed for the reply.

For on-premises to AWS traffic:

1. The customer router selects an AWS prefix learned from the allowed-prefix advertisement and forwards the packet over the transit VIF.
2. The Direct Connect gateway delivers it to the Direct Connect gateway attachment.
3. The route table associated with that attachment selects the destination VPC attachment.
4. The attachment subnet and target subnet route tables deliver the packet.
5. For the reply, the customer advertises its on-premises prefix over BGP and the Direct Connect gateway attachment propagates that route into the VPC-facing Transit Gateway table.

Transit Gateway propagation does not filter individual advertised routes. AWS states that routes learned from an on-premises router through BGP can be propagated to any Transit Gateway route table and that advertised routes cannot be filtered at the propagation step. Apply customer-router prefix policy before advertisement, then expose learned routes only to intended Transit Gateway route tables. Allowed prefixes should not be treated as a firewall for on-premises advertisements.

In a segmented Transit Gateway design, this often means at least two views:

- VPC-ingress tables contain approved on-premises routes targeting the Direct Connect gateway attachment.
- Direct-Connect-ingress tables contain approved VPC or service routes targeting their VPC attachments.

Each attachment is associated with one table for packets entering through it. Propagation inserts routes into tables; association selects the lookup table. Enabling propagation without checking association is a common reason that a route is visible but unused.

## Apply Transit Gateway Route Precedence in the Right Order

Transit Gateway first chooses the most specific destination prefix. Only when route CIDRs are equal does attachment-type priority apply. For an equal CIDR, the current documented order begins:

1. static routes;
2. prefix-list referenced routes;
3. VPC-propagated routes;
4. Direct Connect gateway-propagated routes;
5. Transit Gateway Connect-propagated routes;
6. Site-to-Site VPN over private Direct Connect-propagated routes;
7. Site-to-Site VPN-propagated routes.

This produces several practical rules:

- A more specific BGP route through Direct Connect can beat a less specific static route because longest-prefix match happens first.
- A static route with the exact same CIDR beats the Direct Connect propagated route.
- A VPC-propagated route with the exact same CIDR outranks a Direct Connect gateway-propagated route.
- AS path prepending cannot make a Direct Connect route beat a same-CIDR static or VPC route because BGP attributes are considered only after prefix and attachment type.

For equal CIDRs from the same BGP-capable attachment type, Transit Gateway considers shorter AS path, lower MED, and eBGP over iBGP. If an inbound Direct Connect route has no MED, Transit Gateway assigns MED `0`; VPN and Connect inbound routes without MED receive `100`.

AWS also warns that it cannot guarantee consistent selection when prefix, attachment type, and the listed BGP attributes are all equal. Make equal paths intentionally eligible for ECMP or make the policy unequal. Do not rely on an incidental winner.

Transit Gateway displays only the preferred route. If Direct Connect and Site-to-Site VPN both advertise the same prefix, the VPN backup might not appear until the Direct Connect route is withdrawn. A route-table screenshot that shows no backup is therefore not proof that the backup was never learned. Test withdrawal and observe the replacement route.

## Use BGP Policy for the Paths It Actually Controls

For private and transit VIFs, AWS evaluates customer-advertised routes for traffic returning from AWS using:

1. longest prefix length;
2. local preference;
3. AS path length;
4. MED.

AWS recommends local preference rather than MED for active-passive designs with equal prefix lengths. Direct Connect supports these mutually exclusive communities on prefixes advertised by the customer:

- `7224:7100` - low preference;
- `7224:7200` - medium preference;
- `7224:7300` - high preference.

Use the same community and equal BGP attributes on redundant paths intended for active-active ECMP. Use high preference on the primary and low preference on the standby for active-passive routing. Local preference is evaluated before AS path, so AS prepending does not override a higher Direct Connect local-preference community.

These communities influence AWS's choice of return path toward on-premises. They do not change which AWS prefixes the Direct Connect gateway advertises; that is the allowed-prefix list. They also do not override Transit Gateway's same-CIDR attachment-type order.

AWS can use ECMP across multiple transit VIFs when the destination prefix, AS path length, and BGP attributes are equal. Transit Gateway documentation recommends using a single Direct Connect gateway with multiple transit VIFs for this redundancy model rather than creating multiple gateways merely for ECMP. Design connections at separate Direct Connect locations according to the required resiliency model and ensure each surviving path has enough capacity.

## Validate the Route Contract

Create a route contract that shows both directions:

| Prefix | Origin | Advertised by | Installed in | Preferred path | Backup |
| --- | --- | --- | --- | --- | --- |
| `10.64.0.0/12` | AWS allocation | DXGW allowed prefixes | Customer routers | DX location A | DX location B |
| `172.20.0.0/16` | Data center | Customer BGP | TGW production table | DX VIF A | Site-to-Site VPN |
| `172.30.8.0/21` | Branch | Customer BGP | TGW shared-services table | DX VIF A and B ECMP | none |

For each row, verify the exact prefix on both ends. An aggregate advertisement is insufficient evidence that every child prefix has a valid Transit Gateway and VPC path.

A production test should include:

- BGP session state and received/advertised prefix counts on every VIF;
- the actual AWS allowed-prefix list on the DXGW association;
- Direct Connect routes propagated into the intended Transit Gateway tables;
- Transit Gateway routes from Direct Connect ingress to destination VPCs;
- VPC route tables for forward and return traffic;
- security groups, network ACLs, host firewalls, and application listeners;
- active-active distribution or active-passive preference;
- failover after withdrawing a route, disabling a VIF, or following the approved resiliency test;
- restoration without an unexpected route becoming preferred.

Do not test only with ICMP. Use the production protocol, meaningful payload sizes, and representative source networks. Collect VPC Flow Logs, Transit Gateway Flow Logs, Direct Connect metrics, router BGP logs, and application telemetry around the same timestamps.

## Use a Safe Implementation Sequence

1. Allocate non-overlapping AWS and on-premises prefixes.
2. Choose distinct Transit Gateway and Direct Connect gateway ASNs.
3. Provision resilient Direct Connect connections and transit VIFs.
4. Create the Transit Gateway to Direct Connect gateway association, or the cross-account proposal.
5. Review and accept an explicit allowed-prefix list.
6. Associate the Direct Connect gateway attachment with its intended Transit Gateway ingress table.
7. Propagate approved on-premises BGP routes only to required VPC-ingress tables.
8. Propagate or install approved VPC routes into the Direct-Connect-ingress table.
9. Add VPC subnet routes and validate attachment-subnet return routing.
10. Apply BGP communities and customer-router filters.
11. Test both directions, all intended paths, and failure recovery.
12. Record live route evidence and cost ownership before launch.

Make prefix changes in small groups. AWS notes that modifying an allowed prefix can disrupt that prefix while the association updates. Keep the previous list, customer-router configuration, route-table state, and a named rollback operator available.

## Model All Cost Components

AWS Direct Connect pricing has three main components for Regional or Transit Gateway connectivity: capacity, port hours, and data transfer out through the Direct Connect location. Data transfer into AWS over Direct Connect is currently `$0.00/GB` in all locations. Data transfer out varies by the source AWS Region and Direct Connect location.

Transit Gateway adds its own charges. The Direct Connect gateway owner is billed hourly for the Direct Connect attachment. Data processing applies for each GB sent from Direct Connect into Transit Gateway and for each GB a VPC sends into Transit Gateway. Standard data transfer and any VPN, firewall, NAT, monitoring, partner, or cross-connect charges remain separate.

Model direction explicitly:

```text
On-premises to AWS:
  Direct Connect port/capacity
  + Direct Connect data transfer in at the current rate
  + TGW processing for bytes sent from Direct Connect to TGW

AWS to on-premises:
  Direct Connect port/capacity
  + TGW processing for bytes sent from the source VPC to TGW
  + Direct Connect data transfer out for Region and DX location

Both directions:
  + DXGW attachment-hours
  + VPC attachment-hours
  + partner, cross-connect, logging, and optional service charges
```

The current pricing page lists Direct Connect data transfer in as free, but that does not make inbound hybrid traffic free because Transit Gateway and other path components can still process it. Retrieve current Regional prices when estimating and reconcile the payer accounts through Cost and Usage Reports.

## Official Documentation

- [Direct Connect Gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways-intro.html)
- [Create a Transit Virtual Interface](https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html)
- [Allowed Prefixes Interactions for Direct Connect Gateways](https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html)
- [Direct Connect Routing Policies and BGP Communities](https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html)
- [Associate Direct Connect with a Transit Gateway](https://docs.aws.amazon.com/directconnect/latest/UserGuide/associate-tgw-with-direct-connect-gateway.html)
- [Create a Cross-Account Transit Gateway Association Proposal](https://docs.aws.amazon.com/directconnect/latest/UserGuide/multi-account-tgw-create-proposal.html)
- [How AWS Transit Gateway Works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Direct Connect Pricing](https://aws.amazon.com/directconnect/pricing/)
- [AWS Transit Gateway Pricing](https://aws.amazon.com/transit-gateway/pricing/)

## Conclusion

A Direct Connect gateway and Transit Gateway association has two route exchanges with different controls. Allowed prefixes define what AWS advertises to on-premises; customer BGP advertisements and Transit Gateway propagation define what AWS learns from on-premises. Apply longest-prefix match and attachment-type precedence before BGP attributes, use local-preference communities for equal-prefix return-path policy, and test route withdrawal rather than assuming a hidden backup works. The reliable design is an owned, bidirectional route contract with explicit prefixes, tables, ASNs, failover evidence, and cost direction.
