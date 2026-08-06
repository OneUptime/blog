# Why VPC Route Tables Do Not Learn Transit Gateway Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Route Tables, CloudFormation, Infrastructure as Code

Description: Understand the boundary between VPC and Transit Gateway route tables, then automate the explicit VPC routes every connected subnet requires.

---

Enabling route propagation in an AWS Transit Gateway route table does not add routes to any VPC route table. The propagation is local to the Transit Gateway control plane: it installs an attachment's reachable prefixes into selected Transit Gateway route tables.

VPC subnet route tables are a separate routing layer. To send traffic from a subnet to Transit Gateway, you must create a VPC route whose target is the transit gateway. You must do the same for return traffic in the destination VPC.

This separation is intentional and useful, but it creates a recurring operational gap when teams automate attachments and forget the VPC routes.

## Follow the Two Independent Lookups

Consider an application VPC at `10.10.0.0/16` and a services VPC at `10.20.0.0/16`.

A packet from `10.10.4.10` to `10.20.8.20` needs all of these decisions:

1. The application subnet's VPC route table needs `10.20.0.0/16 -> tgw-id`.
2. The application's Transit Gateway attachment must include an attachment subnet in the source Availability Zone.
3. The transit gateway route table associated with the application attachment needs `10.20.0.0/16 -> services attachment`.
4. The services attachment subnet route table must route within its VPC to the destination subnet.
5. The services subnet's VPC route table needs `10.10.0.0/16 -> tgw-id` for replies.
6. The transit gateway route table associated with the services attachment needs `10.10.0.0/16 -> application attachment`.

Transit Gateway propagation can populate steps 3 and 6. It does not populate steps 1 or 5.

## Know Which Route Table You Are Editing

AWS exposes both objects through networking consoles and EC2 APIs, but they have different identifiers and targets:

| Property | VPC subnet route table | Transit Gateway route table |
| --- | --- | --- |
| Typical ID | `rtb-...` | `tgw-rtb-...` |
| Selected by | Subnet association | Incoming TGW attachment association |
| Route target | TGW ID, NAT gateway, ENI, IGW, and others | TGW attachment |
| TGW propagation effect | None | Installs eligible attachment prefixes |
| Scope | One VPC | One transit gateway |

In a VPC route, the target is the transit gateway ID, not the Transit Gateway VPC attachment ID. In a Transit Gateway route, the target is an attachment.

That distinction catches many infrastructure-as-code bugs. A variable named `tgw_route_table_id` should never be passed where an `rtb-...` VPC route table ID is required.

## Add Routes to Every Traffic-Source Subnet

Each VPC subnet uses one associated route table, either explicitly or through the VPC's main route table. Adding a Transit Gateway route to one route table affects only the subnets using that table.

Inventory routes by subnet role:

| Subnet role | Remote destinations | Expected target |
| --- | --- | --- |
| Application private | Shared services, approved peers | Transit gateway |
| Database private | Only approved service networks | Transit gateway or none |
| Public web | Policy-specific private networks | Transit gateway |
| TGW attachment | Destination subnets or appliances inside VPC | VPC-local next hop |

Do not edit only the main route table unless all relevant subnets actually use it. Explicit subnet associations are common in production VPCs.

AWS documents an additional Availability Zone condition: a subnet can forward to Transit Gateway only when its VPC attachment has an attachment subnet in the same Availability Zone. Selecting an attachment subnet in one zone does not enable sources in every other zone.

## Choose Specific Routes or a Summary Deliberately

The VPC route can be specific:

| Destination | Target |
| --- | --- |
| `10.20.0.0/16` | `tgw-0123456789abcdef0` |

Or summarized:

| Destination | Target |
| --- | --- |
| `10.0.0.0/8` | `tgw-0123456789abcdef0` |

A summary reduces configuration count but sends every unmatched address inside the summary to Transit Gateway. It can create unintended reachability or blackholed traffic when the address plan changes.

Prefer specific routes when domains have different trust or ownership. Use summaries when an IP address management policy reserves the entire aggregate for the same routing and security behavior. Review IPv4 and IPv6 independently; an IPv4 route does nothing for an IPv6 destination.

VPC routing uses the most specific matching route. The default local route for the VPC CIDR normally keeps intra-VPC traffic local, although AWS supports specific middlebox-routing patterns that can add more-specific routes or replace the local route's target. Do not assume a broad Transit Gateway route intercepts ordinary local traffic.

## Create the Route with the AWS CLI

The EC2 `create-route` operation accepts exactly one destination type and one target type. For an IPv4 destination:

```bash
aws ec2 create-route \
  --route-table-id rtb-0123456789abcdef0 \
  --destination-cidr-block 10.20.0.0/16 \
  --transit-gateway-id tgw-0123456789abcdef0
```

For IPv6, first enable IPv6 support on the VPC attachment, which is disabled by default, then use `--destination-ipv6-cidr-block`:

```bash
aws ec2 create-route \
  --route-table-id rtb-0123456789abcdef0 \
  --destination-ipv6-cidr-block 2001:db8:20::/56 \
  --transit-gateway-id tgw-0123456789abcdef0
```

If the destination already exists, `create-route` does not act like an unconditional update. Inspect the current target and use the documented replace operation only when changing an existing route is intended.

Verify the deployed VPC routes directly:

```bash
aws ec2 describe-route-tables \
  --route-table-ids rtb-0123456789abcdef0 \
  --query 'RouteTables[0].Routes'
```

Check the route state and `TransitGatewayId`, not just the destination. A route can remain visible with a blackhole state when its target is unavailable.

## Manage Routes with CloudFormation

Represent each VPC route as its own `AWS::EC2::Route` resource:

```yaml
Resources:
  AppToSharedServicesRoute:
    Type: AWS::EC2::Route
    DependsOn:
      - AppTransitGatewayAttachment
    Properties:
      RouteTableId: !Ref AppPrivateRouteTable
      DestinationCidrBlock: 10.20.0.0/16
      TransitGatewayId: !Ref TransitGateway
```

AWS CloudFormation documents that a route to a transit gateway declared in the same template should depend on the Transit Gateway attachment. The dependency prevents CloudFormation from trying to create the route before the VPC is attached.

This resource belongs in the stack that owns the VPC route table or in a dedicated networking stack with an explicit interface contract. Avoid having two stacks manage the same destination in one route table.

For several private route tables, instantiate one route per table. CloudFormation has no single `AWS::EC2::Route` that attaches a destination to an arbitrary list of route tables.

## Generate Routes from an Approved Intent Map

Do not discover every Transit Gateway prefix and inject it into every VPC. That would reproduce a full mesh and bypass the selective visibility you designed in Transit Gateway.

Use an approved mapping instead:

```yaml
vpcs:
  application:
    route_tables:
      - rtb-app-private-a
      - rtb-app-private-b
    transit_gateway_destinations:
      - 10.20.0.0/16
      - 10.30.0.0/16
  services:
    route_tables:
      - rtb-services-a
      - rtb-services-b
    transit_gateway_destinations:
      - 10.10.0.0/16
```

This is an example input format, not an AWS API schema. Validate it before deployment:

- every route table belongs to the expected VPC;
- every subnet requiring connectivity is associated with a listed table;
- no destination overlaps the local VPC CIDR unexpectedly;
- summaries stay inside an approved IPAM allocation;
- the matching Transit Gateway route exists in the source attachment's associated table;
- the reverse intent exists when return traffic is required.

Generate deterministic infrastructure resources from this map and require review when the reachability matrix expands.

## Reconcile Existing Environments Safely

For an existing fleet, compare desired and actual VPC routes without immediately changing them:

1. enumerate VPC route tables and their subnet associations;
2. identify workload and Transit Gateway attachment subnets;
3. read the current routes and states;
4. calculate missing, unexpected, and wrong-target routes;
5. verify the matching Transit Gateway paths and return routes;
6. review the change per environment;
7. apply additions before removals where policy permits;
8. test and monitor each batch.

Never treat all unexpected routes as safe to delete automatically. They may carry production traffic through VPN, peering, endpoints, NAT, or appliances. Reconciliation should report ownership conflicts before enforcing state.

If replacing a route target, understand that the control-plane update and distributed data-plane convergence can produce a brief interruption. Use a maintenance strategy appropriate to the workload rather than promising atomic route changes.

## Validate the Complete Path

After deployment, verify:

- the source subnet is associated with the intended VPC route table;
- that table has an active route to the Transit Gateway ID;
- the VPC attachment includes an attachment subnet in the source Availability Zone;
- the source attachment is associated with the intended Transit Gateway table;
- the Transit Gateway table has an active route to the destination attachment;
- the destination and attachment-subnet route tables can deliver the packet;
- the reverse path is complete;
- security groups, network ACLs, host firewalls, and the service permit the flow.

AWS Network Manager Route Analyzer covers Transit Gateway route tables, not VPC route tables or security rules. VPC Reachability Analyzer supports many VPC path types, but always confirm that the exact source, destination, and intervening resource types in your design are supported.

## Official Documentation

- [Amazon VPC routing for a transit gateway](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-tgw)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS CLI `create-route`](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html)
- [AWS CLI `replace-route`](https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-route.html)
- [CloudFormation `AWS::EC2::Route`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html)

## Conclusion

Transit Gateway route propagation populates Transit Gateway route tables only. Every participating VPC subnet still needs an explicit route to the Transit Gateway ID, and every return subnet needs the reverse route. Automate those routes from an approved reachability map, bind them to the actual subnet route tables, enforce attachment dependencies, and validate both routing layers after every change.
