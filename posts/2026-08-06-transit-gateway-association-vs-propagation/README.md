# Transit Gateway Association vs Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Routing, Network Architecture, Troubleshooting

Description: Learn how Transit Gateway associations select an ingress route table while propagations install attachment routes into one or more tables.

---

Association and propagation solve different halves of AWS Transit Gateway routing. An association tells Transit Gateway which route table to consult when a packet arrives from an attachment. A propagation tells Transit Gateway which attachment prefixes to install in a route table.

Confusing the two creates a common failure mode: the console shows a destination VPC CIDR in a transit gateway route table, but packets from the source VPC use a different table and never select that route. The reverse is also possible: an attachment is associated with the correct table, but the destinations it needs were never propagated or added statically.

This guide builds a precise mental model, then turns it into a repeatable configuration and troubleshooting process.

## Start with the Packet, Not the Route Table

Suppose three VPCs attach to one transit gateway:

| VPC | CIDR | Attachment |
| --- | --- | --- |
| Application | `10.10.0.0/16` | `tgw-attach-app` |
| Shared services | `10.20.0.0/16` | `tgw-attach-shared` |
| Production | `10.30.0.0/16` | `tgw-attach-prod` |

An instance at `10.10.4.25` sends a packet to `10.20.8.40`. The path is:

1. The application subnet route table matches `10.20.0.0/16` with the transit gateway as its target.
2. The packet enters Transit Gateway through `tgw-attach-app`.
3. Transit Gateway looks up `10.20.8.40` in the one transit gateway route table associated with `tgw-attach-app`.
4. The matching route points to `tgw-attach-shared`.
5. The shared-services attachment delivers the packet into its VPC through an attachment subnet in an enabled Availability Zone.
6. VPC routing, security groups, network ACLs, and the destination host determine what happens next.

The source attachment chooses the lookup table. The destination route chooses the egress attachment. A route existing in some other transit gateway route table has no effect on this packet.

## Association Controls the Ingress Lookup

A transit gateway attachment can be associated with no more than one transit gateway route table at a time. Multiple attachments can share a table, but one attachment cannot select two associated tables for different packets. An attachment can temporarily have no active association, such as while it is being moved between tables, and therefore has no table to use for ingress lookup during that interval.

Think of association as this mapping:

```text
incoming attachment -> one TGW route table used for destination lookup
```

If the application attachment is associated with `rtb-spokes`, all packets that enter through that attachment use `rtb-spokes`. The route table does not change based on the source subnet, protocol, port, IAM principal, or security group.

This makes association the primary segmentation control. For example:

- production attachments can use a production route table;
- nonproduction attachments can use a nonproduction route table;
- a shared-services attachment can use a separate return table containing every authorized spoke;
- an inspection VPC can use a post-inspection table that sends traffic to final destinations.

When default route table association is enabled on the transit gateway, a new attachment is automatically associated with the default association route table. That convenience can undermine segmentation if automation does not replace the default association deliberately. In a segmented design, make association an explicit deployment step and verify the final state.

## Propagation Controls Which Prefixes Appear

Propagation is a different mapping:

```text
attachment prefixes -> zero, one, or many TGW route tables
```

An attachment can propagate to multiple transit gateway route tables. A VPC attachment normally contributes its VPC CIDR blocks. Dynamic attachments such as VPN and Direct Connect gateway attachments can contribute routes learned through their supported routing mechanisms.

Propagation does not decide which table traffic from the attachment uses. It only makes the attachment reachable from traffic whose associated table contains the propagated route.

For the earlier example, a valid asymmetric table design could be:

| Route table | Associated attachments | Propagations enabled into table |
| --- | --- | --- |
| `rtb-spokes` | Application, Production | Shared services |
| `rtb-shared` | Shared services | Application, Production |

`rtb-spokes` contains `10.20.0.0/16 -> tgw-attach-shared`. It intentionally lacks routes between the application and production VPCs. `rtb-shared` contains routes back to both spoke CIDRs, so shared services can reply.

The same attachment can therefore be reachable from several routing domains without those domains being able to reach one another.

## Defaults Can Hide the Difference

A new transit gateway commonly has one default table that serves as both the default association table and the default propagation table. If the corresponding defaults are enabled, new attachments associate with and propagate into that same table. In a simple full-mesh topology, the result works without an operator touching either setting.

That is why the distinction often becomes visible only during segmentation. Moving an attachment's association does not move its propagation settings. Disabling a propagation does not disassociate the attachment. Treat both relationships as independent resources in infrastructure as code.

Before changing a default, inventory:

- which table is the default association route table;
- which table is the default propagation route table;
- every attachment's current association;
- every table into which each attachment propagates;
- all static and blackhole routes that overlap propagated prefixes.

Do not infer any of these relationships from a table name.

## Build the Smallest Required Route Matrix

Write the intended communication policy before creating routes:

| Source domain | Destination domain | Required? | Source attachment table | Destination prefix source |
| --- | --- | --- | --- | --- |
| Application | Shared services | Yes | `rtb-spokes` | Shared propagation |
| Production | Shared services | Yes | `rtb-spokes` | Shared propagation |
| Application | Production | No | `rtb-spokes` | No production route |
| Shared services | Application | Yes | `rtb-shared` | Application propagation |
| Shared services | Production | Yes | `rtb-shared` | Production propagation |

Then implement the forward and return paths for each allowed request/reply flow. A stateful connection still needs a return route. Security groups can allow a session, but they cannot create the missing network path.

For broad groups of non-overlapping spoke CIDRs, a summarized static route can reduce table size. It also expands the destinations sent to an attachment, so use it only when the next hop can route every address in the summary and the wider reachability is intended. Propagated specific routes are usually easier to audit.

## Inspect Associations, Propagations, and Routes Separately

Use separate API calls because each answers a different question:

```bash
aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0

aws ec2 get-transit-gateway-route-table-propagations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0

aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=route-search.exact-match,Values=10.20.0.0/16
```

Run the first two commands for every relevant table. A single-table view cannot prove that an attachment has no association or propagation elsewhere.

When reading a route result, record:

- destination CIDR or prefix-list reference;
- route state, such as active or blackhole;
- static or propagated origin;
- target attachment ID and resource type;
- whether a more-specific route wins for the tested destination.

Transit Gateway uses the most specific destination route first. For equal CIDRs, AWS documents an attachment-type priority order, with static routes ahead of propagated routes. Do not assume that a newly propagated route will replace an equal or more-specific static route.

## Make Changes Without Creating a Blind Window

Moving an attachment between route tables requires disassociation and association operations. Design the target table before moving production traffic:

1. Create or identify the target route table.
2. Enable only the required destination propagations and add necessary static routes.
3. Verify active routes and expected blackholes in the target table.
4. Confirm return tables already contain the source attachment's route.
5. Change the attachment association during a controlled window.
6. Test forward and return paths from each routing domain.
7. Remove obsolete propagation and routes after the new association is stable.

An association state transition is not an atomic policy transaction with all the other route changes. Monitor attachment and route-table states and plan for transient interruption.

For a high-risk change, test an equivalent nonproduction attachment first. AWS Network Manager Route Analyzer can validate transit gateway route-table paths, but it does not inspect VPC route tables, security groups, network ACLs, or customer-gateway routes. Its success is evidence for the transit gateway segment, not the entire connection.

## Diagnose the Common Failure Patterns

### The route exists, but the wrong table is consulted

Start with the source attachment. Find its association, then search that exact table for the destination. Engineers often start from the destination attachment and inspect the table into which it propagates, which can be a different table.

### The forward path works, but replies fail

Repeat the analysis with source and destination reversed. The destination attachment's associated table must contain a route back to the original source CIDR. The destination VPC subnet route table must also send that source CIDR to the transit gateway.

### A propagated route never appears

Confirm that propagation is enabled into the intended table, the attachment is available, and the prefix is eligible. Identical or overlapping prefixes require special care. AWS notes that if a newly attached VPC's CIDR is identical to or overlaps the CIDR of another VPC already attached to the transit gateway, routes for the newly attached VPC are not propagated.

### A route is present but blackholed

An explicit blackhole route drops matching traffic. A static route can also become blackhole when its target attachment is unavailable or removed. Check the route state and target instead of relying on the destination column alone.

### Segmentation works in one direction only

That can be intentional for one-way, stateless traffic. For request/reply traffic, both associated tables need the corresponding destination routes. Once those routes exist, Transit Gateway routing does not distinguish a reply from a new connection, so use security groups or a stateful firewall if only spokes should initiate connections to shared services. Separate route tables can still keep the spokes isolated from one another.

## Treat the Route Table as Policy

A useful review record for every attachment includes:

```yaml
attachment: tgw-attach-app
resource: vpc-application
associated_route_table: rtb-spokes
propagates_to:
  - rtb-shared
allowed_destinations:
  - 10.20.0.0/16
expected_no_routes:
  - 10.30.0.0/16
owner: application-platform
```

This is not an AWS resource schema; it is an example policy inventory. Generate it from deployed state and compare it with the intended matrix. Alert on unexpected association changes, new broad static routes, and propagations into sensitive tables.

## Official Documentation

- [AWS Transit Gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS Transit Gateway console tutorial](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-getting-started-console.html)
- [AWS CLI `get-transit-gateway-route-table-associations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI `get-transit-gateway-route-table-propagations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-propagations.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)

## Conclusion

Association answers which route table a packet uses when it enters Transit Gateway. Propagation answers which tables learn how to reach an attachment. Model both directions of every allowed flow, configure the target table before moving an association, and inspect source association, destination route, return association, and return route independently. That separation turns Transit Gateway routing from console guesswork into a deterministic policy.
