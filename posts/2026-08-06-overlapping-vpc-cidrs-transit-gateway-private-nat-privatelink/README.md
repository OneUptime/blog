# Overlapping VPC CIDRs with Transit Gateway, PrivateLink, and Private NAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Transit Gateway, Amazon VPC, AWS PrivateLink, NAT Gateway, Cloud Networking, Network Architecture

Description: Understand why Transit Gateway cannot route overlapping VPC CIDRs and choose between renumbering, AWS PrivateLink, and private NAT.

---

An AWS Transit Gateway can connect thousands of networks, but it cannot make two identical addresses mean two different things. If two attached VPCs both use `10.20.0.0/16`, a destination such as `10.20.8.15` is ambiguous. Route propagation, route-table segmentation, and a more specific static route do not create the missing address identity.

AWS documents two concrete consequences:

- Transit Gateway does not support routing between VPCs with identical or overlapping CIDR ranges.
- If a newly attached VPC overlaps a VPC that is already attached, the new VPC's routes are not propagated into the Transit Gateway route table.

The attachment can therefore exist while the expected routes do not. The durable choices are to remove the overlap, expose a bounded service through AWS PrivateLink, or translate addresses through a private NAT design. Those choices solve different problems.

## Prove That the Failure Is CIDR Ambiguity

Start with the actual prefixes, not a connectivity symptom. Build an inventory containing every primary and secondary IPv4 CIDR, IPv6 CIDR, on-premises prefix, and translated range. Check for containment as well as equality: `10.20.0.0/16` overlaps `10.20.64.0/18` even though the strings differ.

Then inspect the routing conditions involved in a VPC-to-VPC flow:

1. The source subnet route table must send the destination toward the Transit Gateway.
2. The source attachment must be associated with the Transit Gateway route table that performs the lookup.
3. That table must contain an unambiguous route to the destination attachment.
4. The attachment-subnet route tables must allow traffic arriving from the Transit Gateway to reach workloads in the VPC; the automatically added local routes normally provide this for VPC CIDRs.
5. The destination subnet route table must contain a return route through the Transit Gateway.

If the CIDRs overlap, step 3 cannot describe both VPCs with the same destination prefix. Creating separate Transit Gateway route tables can isolate who is allowed to reach whom, but it does not give the same address a different meaning inside one packet. A static route can select one attachment for a prefix within a given Transit Gateway route table; it cannot make both overlapping VPCs directly reachable at the same destination address.

Do not confuse this limitation with the attachment-subnet rule. A VPC attachment still needs one selected subnet for each enabled Availability Zone, and workloads can reach the Transit Gateway only from enabled zones. Fixing the selected subnets helps an AZ reach the gateway, but it does not fix overlapping address space.

## Choose the Smallest Correct Remedy

Use the required communication shape to choose the remedy.

| Requirement | Preferred starting point | Why |
| --- | --- | --- |
| General, bidirectional IP connectivity | Renumber one network | Restores ordinary routing and preserves end-to-end addresses |
| Consumers call a defined service | AWS PrivateLink | Avoids routing the provider CIDR into the consumer VPC |
| Selected flows must cross while legacy addresses remain | Private NAT with non-overlapping transit ranges | Translates ambiguous source addresses into routable identities |
| Temporary migration coexistence | PrivateLink or private NAT, with a renumbering exit plan | Contains the overlap without making translation permanent by accident |

Renumbering is the cleanest network outcome because every endpoint becomes globally unambiguous within the connected routing domain. Its application and operational cost can be high, especially when IPs appear in allowlists, certificates, discovery systems, databases, or vendor configurations. Treat that cost as a migration program, not as evidence that a routing workaround is equivalent.

## Use PrivateLink for a Service Boundary

With an endpoint service powered by AWS PrivateLink, the provider places a Network Load Balancer in front of the service and grants selected principals permission to connect. A consumer creates an interface VPC endpoint in its own subnets. The endpoint network interfaces receive addresses from the consumer VPC, so consumer applications connect to local, unambiguous IPs and DNS names rather than routing to the provider's overlapping CIDR.

AWS Prescriptive Guidance explicitly identifies overlapping CIDRs as a supported PrivateLink integration case. The important constraint is architectural: PrivateLink publishes a service, not the provider's entire network. A consumer initiates connections to the endpoint service; the provider cannot use that endpoint as a general return path to arbitrary consumer hosts.

Design the boundary deliberately:

- expose only required listeners and target groups;
- grant endpoint-service permissions to named AWS principals;
- decide whether connection requests require manual acceptance;
- do not treat endpoint policies as an authorization layer for a customer-owned endpoint service; for services other than AWS services, AWS applies full-access endpoint policy behavior;
- create endpoints in enough Availability Zones for the required availability;
- configure private DNS only after proving domain ownership and resolution behavior;
- account for the source-address behavior at the Network Load Balancer.

AWS documents that the provider application normally sees the private addresses of the load-balancer nodes rather than the consumer's source address. Proxy protocol version 2 can carry consumer address and endpoint identity when the application and load balancer configuration support it. Do not promise source-IP-based authorization until that path has been tested.

PrivateLink is a strong fit for APIs, ingestion endpoints, database front ends, and other explicit services. It is a poor fit when the requirement is arbitrary host-to-host access, consumer callbacks, broad protocol discovery, or transparent use of many changing ports.

## Use Private NAT for Controlled Address Translation

AWS publishes a private NAT gateway scenario for overlapping networks. The design does not send the overlapping ranges through Transit Gateway. Instead, each side receives a secondary, non-overlapping, routable CIDR. Transit Gateway routes only those transit ranges.

A representative design looks like this:

```text
VPC A original range:    10.0.0.0/16
VPC A transit range:     100.64.1.0/24
VPC A private NAT:       source translation to its private IP in 100.64.1.0/24

VPC B original range:    10.0.0.0/16
VPC B transit range:     100.64.2.0/24
VPC B service front end: address in 100.64.2.0/24

Transit Gateway routes:  100.64.1.0/24 and 100.64.2.0/24 only
```

In the AWS example, the initiating VPC sends traffic through a private NAT gateway in its routable subnet. The NAT gateway translates the source. The destination VPC uses an Application Load Balancer in its routable subnet to reach targets in the overlapping range. Transit Gateway propagation is disabled and static routes are created for the non-overlapping ranges.

That documented architecture is an asymmetric service-access pattern, not transparent any-to-any connectivity. This conclusion follows from its components: private NAT performs source NAT, while the load balancer provides a reachable destination and selects back-end targets. If both sides must initiate arbitrary sessions, the design needs additional translation domains and stateful return paths, which increases complexity quickly.

For every translated flow, write a packet walk in both directions:

| Hop | Forward-path question | Return-path question |
| --- | --- | --- |
| Workload subnet | Does the route select private NAT? | Does the translated reply return to NAT? |
| NAT subnet | Is the non-overlapping destination sent to Transit Gateway? | Can NAT restore the original source tuple? |
| Transit Gateway | Is only the transit prefix installed? | Is the translated source prefix routed back to VPC A? |
| Destination front end | Is its address in a routable range? | Does its route table target Transit Gateway for VPC A's transit range? |
| Back-end target | Does health checking and security policy allow the front end? | Does the response return through the same stateful path? |

Do not advertise the original overlapping CIDRs to Transit Gateway. Also avoid reusing translated ranges elsewhere. Translation merely moves the uniqueness requirement to a range you control.

## Treat DNS and Security as Part of the Migration

Applications should resolve a service identity to the correct endpoint for their network context. PrivateLink can provide endpoint-specific DNS names and an optional verified private DNS name. A NAT design often needs split-horizon DNS so callers receive the translated front-end address rather than an unreachable original address.

Avoid publishing overlapping literal IP addresses in configuration. Use names with clear ownership and a tested resolver path. During migration, record which networks resolve each name, the expected address family, the DNS time to live, and the rollback record.

Security controls must follow the translated identity:

- security groups and network ACLs may see a NAT or load-balancer address rather than the original client;
- flow logs should be collected on the workload, endpoint, NAT, load-balancer, and attachment subnets needed for the packet walk;
- source-IP allowlists may need replacement with application authentication or proxy-protocol metadata;
- endpoint permissions control who may create PrivateLink connections, not who is authorized inside the application;
- a broad Transit Gateway route to a translated supernet should not silently expand trust.

Test both successful and denied flows. A design that connects but bypasses tenant, environment, or data-boundary controls is not complete.

## Model Cost Before Standardizing the Pattern

PrivateLink interface endpoints are billed for each provisioned endpoint-hour in each Availability Zone, including partial hours, plus data processing. On the current AWS pricing page, regional interface-endpoint data processing is tiered across the total monthly bytes in a Region: the first 1 PB is listed at `$0.01/GB`, the next 4 PB at `$0.006/GB`, and amounts above 5 PB at `$0.004/GB`. Endpoint hourly rates and cross-Region charges depend on the endpoint type, Region, and service arrangement, so retrieve the applicable current table rather than copying one Region's rate into a global estimate.

NAT gateways incur hourly and per-GB processing charges, plus applicable data transfer. The Amazon VPC pricing page uses US East (Ohio) examples of `$0.045` per NAT gateway-hour and `$0.045` per GB processed; those are example inputs, not universal prices. A highly available design commonly provisions a NAT gateway per required zone, which multiplies the fixed component.

Transit Gateway attachment-hours, Transit Gateway data processing, load-balancer charges, cross-AZ transfer, and logging can also apply. Model each directional GB by the component it enters. Do not compare only PrivateLink's endpoint line item with only NAT's hourly line item.

## Migrate Without Hiding the Overlap

A controlled implementation sequence is:

1. Inventory and classify every overlap.
2. Select renumbering, service publication, or translation per flow.
3. Allocate non-overlapping transit ranges from a governed IP address plan.
4. Build the new path with explicit route tables and least-privilege controls.
5. Add packet-path telemetry and synthetic probes before moving production traffic.
6. Test forward routing, return routing, DNS, authorization, failover, and rollback.
7. Move one consumer or service at a time.
8. Remove obsolete routes and endpoints after the rollback window.
9. Keep a dated plan to eliminate temporary translation where renumbering remains the goal.

The acceptance test should name concrete endpoints and expected observations. "Ping works" is insufficient because load balancers and endpoint services may not support the test protocol, and it does not prove the production listener, DNS path, or authorization policy.

## Official Documentation

- [AWS Transit Gateway VPC Attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [NAT Gateway Scenarios: Communication Between Overlapping Networks](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html)
- [Private NAT Gateway for Overlapping Networks](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/private-nat-gateway.html)
- [Create a Service Powered by AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html)
- [AWS Prescriptive Guidance: AWS PrivateLink Architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/integrate-third-party-services/architecture-1.html)
- [AWS PrivateLink Pricing](https://aws.amazon.com/privatelink/pricing/)
- [Amazon VPC Pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS Transit Gateway Pricing](https://aws.amazon.com/transit-gateway/pricing/)

## Conclusion

Transit Gateway cannot route away address ambiguity. Separate route tables can enforce reachability policy, but overlapping destinations still lack a unique next hop. Renumber when broad network connectivity is required, use PrivateLink when consumers need a bounded service, and use private NAT only with unique transit ranges and an explicitly proven return path. The right solution makes both address identity and operational ownership visible.
