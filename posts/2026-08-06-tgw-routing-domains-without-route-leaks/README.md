# Build Transit Gateway Routing Domains Without Route Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Network Segmentation, VPC, Routing, Security

Description: Design multiple Transit Gateway routing domains with one-table associations, selective propagation, explicit return paths, and tested deny boundaries.

---

AWS Transit Gateway can behave like several logical routers even though every attachment connects to the same transit gateway. The mechanism is simple: associate each attachment with one route table based on its trust domain, then expose only the destination routes that domain is allowed to use.

The difficult part is not creating the tables. It is preventing an apparently harmless propagation, default association, summary route, or shared-services return route from joining domains that were meant to remain separate.

This guide develops a route-leak-resistant design for production, nonproduction, and shared services.

## A Routing Domain Is an Ingress Policy

Transit Gateway uses the route table associated with the attachment on which a packet arrives. An attachment can be associated with only one route table, and that associated table performs the destination lookup.

That leads to an important design rule:

```text
Place an attachment in the route table that represents what its traffic may reach.
```

Do not place it according to who should reach the attachment. Reachability to an attachment is controlled by routes in other tables, usually through propagation.

For example, use these domains:

| Domain | Example VPC CIDRs | Associated TGW table |
| --- | --- | --- |
| Production | `10.10.0.0/16`, `10.11.0.0/16` | `tgw-rtb-production` |
| Nonproduction | `10.50.0.0/16`, `10.51.0.0/16` | `tgw-rtb-nonproduction` |
| Shared services | `10.100.0.0/16` | `tgw-rtb-shared` |

A packet from `10.50.0.0/16` always uses `tgw-rtb-nonproduction` when it enters the transit gateway. If that table has no route to `10.10.0.0/16`, the transit gateway cannot deliver the packet to production, even if the production attachment propagates into some other table.

## Disable Accidental Full Mesh

A transit gateway can have a default association route table and a default propagation route table. With both defaults enabled, a new attachment can join the default association table and advertise into the default propagation table automatically. When both defaults point to the same table, that behavior is useful for a full mesh, but it creates an unsafe onboarding path for segmented networks.

For a new segmented transit gateway, decide whether to disable default association and default propagation at creation. For an existing gateway, changing defaults does not substitute for auditing every current relationship. Inventory all attachments before modifying production behavior.

An onboarding workflow should fail closed:

1. create the attachment;
2. classify its environment and owner from approved metadata;
3. associate it with the intended domain table;
4. enable only approved propagations;
5. install required VPC subnet routes;
6. verify forward and return paths;
7. mark the attachment ready for use.

Do not send application traffic before the association reaches the associated state and the intended routes are active.

## Separate Association from Advertisement

Use an explicit matrix for a production and nonproduction design:

| Attachment class | Association | Propagate to production | Propagate to nonproduction | Propagate to shared |
| --- | --- | --- | --- | --- |
| Production spoke | Production | Optional for same-domain mesh | No | Yes |
| Nonproduction spoke | Nonproduction | No | Optional for same-domain mesh | Yes |
| Shared services | Shared | Yes | Yes | Not normally needed |

The shared-services attachment propagates into both spoke-domain tables so both can reach its CIDR. Production and nonproduction spokes propagate into the shared table so shared services can reply. Neither spoke class propagates into the other class's table.

Whether spokes in the same class should reach one another is a separate decision. If they should remain isolated, do not propagate spoke routes into their own associated table. AWS's Network Orchestration for Transit Gateway solution describes the same isolated-policy principle: a table that does not receive its own class's routes prevents attachments associated with that table from reaching one another through the transit gateway.

## Understand What the Design Does Not Isolate

Transit Gateway route tables filter paths between attachments. They are not firewalls, identity-aware proxies, or subnet-level policies.

The design does not by itself prevent:

- two workloads in the same VPC from using the VPC's local route;
- two subnets behind one VPC attachment from communicating according to VPC routes;
- a shared service from proxying data between domains at the application layer;
- traffic over another path such as VPC peering, PrivateLink, VPN, or the public internet;
- an authorized operator from changing route-table relationships.

Use separate VPC attachments when traffic must be assigned to different transit gateway route tables. Because a VPC can have only one attachment to a given transit gateway, separate routing domains normally require separate VPCs or another enforcement layer.

Security groups and network ACLs still enforce their own rules. Route absence reduces reachability, while security controls constrain traffic that has a path. Use both when the boundary matters.

## Design Shared Services as an Explicit Exception

A shared-services VPC often hosts DNS resolvers, directory services, package mirrors, telemetry collectors, and deployment systems. Giving every domain a route to the entire shared VPC can expose more than intended.

Choose the narrowest practical route scope:

- use dedicated subnets or VPCs for services with different trust requirements;
- propagate the VPC CIDR only when all networks in it are appropriate destinations;
- consider managed prefix-list references or specific static routes when a smaller address set is stable and supported by the design;
- constrain service ports and sources with security groups and application authentication;
- log and review cross-domain requests.

Transit Gateway routes on destination IP prefixes. It cannot route based on DNS name or TCP port. If `10.100.0.0/16` contains both safe shared services and privileged management endpoints, advertising that whole CIDR creates a network path to both.

The return side also deserves scrutiny. The shared table must contain routes back to approved consumers, but that gives shared-services workloads a path toward those domains. Restrict which shared workloads can initiate connections by subnet design, security groups, host controls, and service identity.

## Avoid the Summary-Route Trap

Suppose production uses `10.0.0.0/9` address space and nonproduction uses `10.128.0.0/9`. Adding `10.0.0.0/8` toward a common attachment may silently create a path across both domains.

Longest-prefix matching can make the current state look safe while specific routes exist, but the summary becomes active for any gap or after a specific route disappears. Treat every summary as reachable policy, not merely a convenience.

For each static or prefix-list route, review:

- every address range the destination covers;
- the target attachment's ability to forward that range;
- whether a more-specific blackhole is required for a denied block;
- what happens if propagated specifics are withdrawn;
- IPv4 and IPv6 independently.

Blackhole routes are useful guardrails, but they should make an explicit deny visible rather than compensate for an unreviewed broad default route.

## Be Deliberate with Default Routes

A `0.0.0.0/0` route in a domain table directs every unmatched IPv4 destination to one attachment. It can provide centralized inspection or internet egress, but it also means that traffic to an accidentally omitted private prefix goes to that attachment.

If a firewall or egress VPC is the default next hop:

1. associate spoke attachments with a pre-inspection table containing the default route to inspection;
2. enable appliance mode on the appliance VPC attachment when the documented stateful-flow behavior requires it;
3. associate the inspection attachment with a post-inspection table containing only approved final destinations;
4. ensure return traffic traverses the same stateful appliance path;
5. add explicit blackholes for destinations that must never follow the default.

A single table cannot represent both pre-inspection and post-inspection policy for the same ingress attachment. This is another consequence of the one-association rule.

## Model Both Directions of Every Allowed Flow

Create a test matrix before deployment:

| Test | Expected forward result | Expected return result |
| --- | --- | --- |
| Nonproduction to production | No TGW route or blackhole | Not applicable |
| Production to nonproduction | No TGW route or blackhole | Not applicable |
| Production to shared DNS | Shared attachment | Production attachment |
| Nonproduction to shared DNS | Shared attachment | Nonproduction attachment |
| Production spoke A to spoke B | Policy-specific | Policy-specific |

For an allowed flow, validate four route decisions:

1. source subnet route table to Transit Gateway;
2. source attachment's associated transit gateway route table to the destination attachment;
3. destination subnet route table back to Transit Gateway;
4. destination attachment's associated transit gateway route table back to the source attachment.

Also validate security groups, network ACLs, operating-system firewalls, and application listeners. A route analyzer result alone cannot prove the entire path because AWS Network Manager Route Analyzer evaluates transit gateway route tables, not VPC route tables or security rules.

## Audit Deployed State, Not Just Infrastructure Code

The control plane can drift through console edits, automation errors, or attachments created by other accounts. Periodically collect:

```bash
aws ec2 describe-transit-gateway-attachments \
  --filters Name=transit-gateway-id,Values=tgw-0123456789abcdef0

aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0

aws ec2 get-transit-gateway-route-table-propagations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0
```

Repeat the association and propagation calls for every table. Export or search routes and compare the result with a reviewed matrix.

Useful invariants include:

- every available attachment has exactly the intended association;
- no production attachment propagates into a nonproduction table;
- no nonproduction attachment propagates into a production table;
- shared-services propagations are limited to approved tables;
- no unapproved `0.0.0.0/0`, `::/0`, or broad summary exists;
- expected blackhole routes are present with state `blackhole`;
- all permitted routes are `active`, all intended propagations are `enabled`, and attachments are `available` rather than in transitional or deleting states.

Alert on changes to route-table associations, propagations, static routes, and transit gateway options. Tag-based intent is useful, but evaluate the actual relationships.

## Roll Out a Domain Change Safely

Changing an attachment's domain alters every flow entering through it. Use a controlled sequence:

1. record the current association, propagations, and routes;
2. prepare the destination table and all return-path propagations;
3. validate an equivalent test attachment if possible;
4. in a maintenance window, remove any old propagation that would violate the new boundary and confirm that the forbidden route is withdrawn;
5. move the association;
6. run positive tests for allowed flows and negative tests for forbidden flows;
7. observe VPC Flow Logs, Transit Gateway Flow Logs, application metrics, and route state;
8. remove any remaining obsolete propagations only after the intended state is proven;
9. retain a reviewed rollback sequence.

Negative tests are essential. A successful connection to shared services does not prove that production and nonproduction remain isolated.

## Official Documentation

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Network Orchestration for AWS Transit Gateway route-table policies](https://docs.aws.amazon.com/solutions/latest/network-orchestration-aws-transit-gateway/using-and-customizing-route-tables.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Amazon VPC route tables](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)

## Conclusion

Build a Transit Gateway routing domain around the permissions of incoming attachments: one associated table per domain, selective destination propagation, and explicit return paths. Disable or tightly control defaults, distrust broad summaries, test denied paths as well as allowed ones, and audit the deployed associations and propagations. The strongest design is the one whose forbidden routes are absent by construction.
