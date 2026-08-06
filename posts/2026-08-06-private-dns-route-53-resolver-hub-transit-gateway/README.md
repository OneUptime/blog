# Private DNS Across Transit Gateway with a Resolver Hub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Route 53 Resolver, Private DNS, Hybrid Networking, DNS

Description: Build a Route 53 Resolver hub for private DNS between spoke VPCs and on-premises networks connected through Transit Gateway.

---

AWS Transit Gateway routes IP packets. It does not make Route 53 private hosted zones transitive, and it does not turn the Amazon-provided resolver in one VPC into a DNS server for every attached network.

A scalable hybrid design separates two concerns:

- Transit Gateway provides reachability between endpoint subnets, spoke VPCs, and the on-premises network.
- Route 53 VPC Resolver endpoints, rules, and private hosted-zone associations determine which DNS server answers each namespace.

That distinction prevents a common failure: a TCP connection to an application IP succeeds across Transit Gateway, but its private name returns `NXDOMAIN` or times out.

## The Hub-and-Spoke DNS Pattern

Create a network-services VPC in each AWS Region that needs hybrid DNS. In that VPC, deploy:

- One inbound Resolver endpoint with at least two IP addresses in different Availability Zones.
- One outbound Resolver endpoint with at least two IP addresses in different Availability Zones.
- Security groups dedicated to inbound and outbound DNS flows.
- Routes from the endpoint subnets to on-premises DNS servers through Transit Gateway and the hybrid attachment.

The query paths are different.

### On-premises to AWS private DNS

1. An on-premises resolver receives a query for an AWS-owned private suffix such as `aws.corp.example`.
2. A conditional forwarder sends the query to the inbound endpoint IP addresses.
3. Route 53 VPC Resolver answers from a private hosted zone associated with the VPC that contains the inbound endpoint, or resolves another name visible to that VPC.

### AWS to on-premises private DNS

1. A workload in a spoke VPC sends its normal query to the VPC-local AmazonProvidedDNS resolver.
2. A Resolver forwarding rule associated with that spoke matches an on-premises suffix such as `corp.example`.
3. The rule sends the query through the shared outbound endpoint.
4. The outbound endpoint ENI sends the query to the configured on-premises resolver IP address across Transit Gateway.

Spoke workloads do not need to send DNS packets to the hub VPC themselves. They continue to use their local VPC Resolver. Associating a forwarding rule with a spoke tells the managed Resolver service to use the outbound endpoint named in that rule.

## Do Not Route to the VPC+2 Resolver

Route 53 VPC Resolver is available inside each VPC at the VPC base address plus two, at `169.254.169.253`, and at `fd00:ec2::253`. AWS documents these as VPC-local or link-local resolver addresses. Private hosted-zone visibility is based on VPC association, not on a packet route through Transit Gateway.

Do not configure an on-premises conditional forwarder to a hub VPC's `10.x.x.2` address. Do not add Transit Gateway routes in an attempt to reach another VPC's AmazonProvidedDNS address. Use the IP addresses allocated to an inbound Resolver endpoint.

Likewise, enabling DNS support on a Transit Gateway VPC attachment does not make custom private hosted-zone names transitive. AWS explicitly calls out that Transit Gateway does not provide resolution for custom private hosted-zone names in attached VPCs.

## Make Private Hosted Zones Visible Deliberately

An inbound endpoint does not automatically discover private hosted zones associated only with spoke VPCs. If inbound queries should resolve records in a private hosted zone, associate that zone with the VPC that contains the inbound endpoint.

Treat these as two independent control-plane decisions:

- Associate a private hosted zone with every VPC whose local Resolver should answer from it. This can include spoke VPCs and the Resolver hub VPC.
- Associate an outbound forwarding rule with every VPC whose queries for that suffix should go to on-premises DNS.

For a cross-account private hosted zone, use the documented cross-account VPC association workflow or a centrally governed Route 53 mechanism such as Profiles where it fits the organization. Sharing an outbound Resolver rule does not share private hosted-zone visibility.

Also enable both `enableDnsSupport` and `enableDnsHostnames` in VPCs that use private hosted zones. AWS requires both attributes for custom private DNS names and private DNS on interface VPC endpoints.

## Share Forwarding Rules, Not Endpoint IPs, with Spokes

Create one forwarding rule per on-premises namespace and point it at the on-premises DNS servers through the outbound endpoint. Then share the rule through AWS Resource Access Manager and associate it with spoke VPCs.

AWS documents that sharing a rule also indirectly shares the outbound endpoint selected by the rule. Consumer accounts can associate the shared rule with their VPCs, but cannot edit or delete it. This produces a clean ownership model:

| Component | Typical owner | Consumer action |
| --- | --- | --- |
| Inbound endpoint | Network services account | Configure on-premises forwarders to its IPs |
| Outbound endpoint | Network services account | None directly |
| Forwarding rule | Network services account | Associate shared rule with spoke VPC |
| Private hosted zone | DNS or application account | Associate authorized VPCs |
| Transit Gateway routes | Network services account | Provide endpoint-to-resolver reachability |

A forwarding rule works only after association with the querying VPC. Sharing alone is not enough.

## Route the Endpoint ENIs in Both Directions

Resolver endpoint addresses are private addresses on elastic network interfaces. They need ordinary network reachability.

For inbound queries, verify all of the following:

- On-premises routes contain the inbound endpoint subnet prefixes through Direct Connect or VPN.
- The hybrid attachment's associated Transit Gateway route table has a route to the Resolver hub VPC attachment.
- The Resolver hub subnet route table has a return route to the on-premises client or resolver CIDRs through Transit Gateway.
- The inbound endpoint security group permits the selected DNS protocol from the on-premises resolver CIDRs.

For outbound queries, verify the reverse set:

- The outbound endpoint subnet route table sends on-premises DNS server prefixes to Transit Gateway.
- The Resolver hub attachment's associated Transit Gateway route table selects the hybrid attachment.
- The on-premises network has a return route to the outbound endpoint subnet prefixes.
- The outbound endpoint security group permits DNS to the on-premises resolver addresses.

For classic DNS over port 53, allow both UDP and TCP. Most normal queries use UDP, but larger responses and retries can use TCP. Route 53 Resolver endpoints can also be configured for supported DNS-over-HTTPS protocols; align security rules, forwarders, and tests with the protocol actually selected.

Network ACLs are stateless, so include the required return traffic. Security groups are stateful, but they do not replace Transit Gateway, VPC, or on-premises routes.

## Design the Namespace to Avoid Loops

Write down one authoritative owner and one forwarding direction for each suffix.

| Namespace | Authority | AWS behavior | On-premises behavior |
| --- | --- | --- | --- |
| `aws.corp.example` | Route 53 private hosted zone | Resolve locally | Forward to inbound endpoint |
| `corp.example` | On-premises DNS | Forward through outbound endpoint | Resolve locally |
| Other names | Public DNS or local policy | Use recursive Resolver behavior | Use enterprise recursive policy |

Do not create a rule that forwards `corp.example` from AWS to on premises if the on-premises resolver forwards the same suffix straight back to the inbound endpoint. That is a forwarding loop, not high availability.

Resolver uses the most specific matching namespace. A forwarding rule for the same domain as a private hosted zone takes precedence over that private hosted zone. Overlapping rules can therefore redirect a name unexpectedly. Review parent and child suffixes together, including reverse zones such as `in-addr.arpa` and `ip6.arpa`.

Be careful with a private hosted zone that matches a public zone. If the private zone is visible but lacks the requested record type, Resolver returns `NXDOMAIN`; it does not fall back to the public zone for that name.

## Build Availability at the Endpoint and Path Layers

Each Resolver endpoint requires at least two IP addresses, and AWS directs you to place them in different Availability Zones. Configure on-premises forwarders to use every inbound endpoint address rather than a single preferred IP that is never tested.

An endpoint can be highly available while the path to it is not. Check that:

- Endpoint subnets are in distinct Availability Zones.
- Transit Gateway has attachment subnets in the required zones.
- Direct Connect or VPN has the intended path diversity.
- On-premises forwarders retry another endpoint address after failure.
- Outbound rules target more than one on-premises resolver where the namespace supports it.

Do not assume a health check removes a failed DNS target in the way an application load balancer would. Test the retry behavior and timeout settings of the actual recursive resolvers.

## Validate Each Query Path Separately

Use names with known A, AAAA, PTR, and negative responses. DNS caching can otherwise make a broken path look healthy.

From on premises, query each inbound endpoint IP directly over UDP and TCP:

```bash
dig @10.20.10.10 api.aws.corp.example A
dig @10.20.10.11 api.aws.corp.example A +tcp
```

From a spoke, query the default resolver for an on-premises name and confirm the answer comes through the associated forwarding rule:

```bash
dig db01.corp.example A
dig -x 10.60.4.25
```

Then test these failure cases:

- One inbound endpoint IP is unreachable.
- One outbound endpoint IP is unavailable.
- One on-premises DNS target is unavailable.
- The Transit Gateway route to the on-premises prefix is removed in a test environment.
- A shared rule is disassociated from one canary VPC.
- A private hosted-zone association is absent from the hub VPC.

Route 53 VPC Resolver query logging can record VPC-originated, inbound endpoint, and outbound endpoint queries. Logs include the query name, type, response code, source address, and endpoint identifiers. Resolver caches answers, so only unique queries that miss the cache are logged; absence of a repeated query is not proof that a client stopped asking.

## Troubleshooting Map

| Symptom | First checks |
| --- | --- |
| On-premises query times out | Forwarder destination, route to inbound endpoint subnet, inbound security group, return route |
| On-premises query returns `NXDOMAIN` | Private hosted-zone association with hub VPC, requested record and type, overlapping namespace |
| Spoke resolves public but not on-premises names | Shared rule association, suffix match, outbound endpoint status, outbound route |
| One VPC works and another fails | Per-VPC rule and hosted-zone associations, VPC DNS attributes |
| UDP works for small answers but large answers fail | TCP 53 rules, network ACLs, MTU and fragmentation behavior |
| Queries alternate between success and timeout | One endpoint IP or one on-premises target lacks a complete return path |

## Official Documentation

- [What is Route 53 VPC Resolver?](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html)
- [Forwarding inbound DNS queries to your VPCs](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html)
- [Forwarding outbound DNS queries to your network](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html)
- [Considerations when creating inbound and outbound endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-choose-vpc.html)
- [Managing forwarding rules](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html)
- [Working with private hosted zones](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html)
- [Understanding Amazon DNS](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)
- [Resolver query logging](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html)

## Conclusion

A Resolver hub succeeds when DNS policy and packet routing are designed separately. Use inbound endpoint IPs for on-premises-to-AWS queries, share outbound rules with spokes for AWS-to-on-premises queries, associate private hosted zones with every VPC that must see them, and build a complete Transit Gateway return path for each endpoint ENI. Then test both endpoint IPs, both transport protocols, and negative responses before scaling the pattern to every account.
