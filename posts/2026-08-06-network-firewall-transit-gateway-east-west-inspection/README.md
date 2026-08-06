# Symmetric East-West Inspection with Network Firewall and Transit Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Network Firewall, Transit Gateway, East-West Traffic, Inspection, Routing

Description: Choose direct firewall attachment or an inspection VPC, then force both directions of every Transit Gateway flow through one stateful firewall path.

---

AWS Network Firewall is stateful. A request and its response must traverse the same firewall endpoint for stateful rules, protocol tracking, and application inspection to work correctly. A route that inspects only one direction is not partial protection; it is usually a broken connection or a bypass.

AWS now supports attaching Network Firewall directly to Transit Gateway as a network function attachment. That removes the VPC endpoint and inspection-subnet routing required by the older inspection VPC pattern. Both models remain relevant, but their routing responsibilities differ.

Choose one model deliberately, then prove symmetry for every allowed east-west flow.

## Start with the Current Deployment Choice

There are two ways to centralize AWS Network Firewall behind Transit Gateway.

| Model | You manage | Appliance mode | Route insertion |
| --- | --- | --- | --- |
| Transit gateway-attached firewall | Firewall policy and TGW routes | Always enabled by AWS | Transit Gateway route tables only |
| Firewall endpoints in an inspection VPC | Inspection VPC, subnets, endpoint routes, TGW routes | Enable on inspection VPC attachment | TGW and VPC route tables |

The direct network function attachment was introduced to eliminate manually managed inspection VPC infrastructure for AWS Network Firewall. Use it when its Regional availability, ownership model, routing features, and policy integration meet the requirement.

Keep or build an inspection VPC when the path also requires third-party appliances, custom VPC services, a specific NAT or endpoint chain, or another feature not supported by the direct attachment. Third-party firewalls cannot use the AWS Network Firewall network function attachment.

Do not copy an inspection VPC diagram into a direct-attachment deployment. Direct firewall traffic is routed through Transit Gateway route tables, not VPC route tables.

## Define the East-West Policy

Use two spoke VPCs:

| VPC | CIDR | Attachment |
| --- | --- | --- |
| Application | `10.10.0.0/16` | `attach-app` |
| Data | `10.20.0.0/16` | `attach-data` |

The policy requires both connection directions to be inspected:

- `10.10.0.0/16 -> 10.20.0.0/16` through Network Firewall;
- `10.20.0.0/16 -> 10.10.0.0/16` through Network Firewall;
- no more-specific direct Transit Gateway route may bypass inspection;
- the firewall policy must classify both CIDRs correctly;
- VPC route tables must send remote CIDRs to Transit Gateway.

"Both directions" means request and response, not merely allowing either VPC to initiate. Even a connection initiated only by the application VPC needs the data VPC's reply path through the same stateful firewall context.

## Option 1: Use a Direct Network Function Attachment

Create a transit gateway-attached firewall from AWS Network Firewall. AWS provisions the managed infrastructure and presents a Transit Gateway attachment whose resource type is network function.

The current documented considerations include:

- the firewall must use Availability Zones in which the shared Transit Gateway is enabled;
- appliance mode is always enabled on the firewall attachment;
- only static Transit Gateway routes can target the network function attachment;
- traffic is inserted with Transit Gateway route tables, not VPC route tables;
- cross-account deployment uses AWS Resource Access Manager and divides Transit Gateway and firewall ownership;
- the Transit Gateway owner has limited visibility into firewall details in a separate firewall-owner account.

Associate the spoke attachments with pre-inspection Transit Gateway route tables. Associate the network function attachment with a post-inspection Transit Gateway route table that contains routes to the final spoke attachments, typically propagated routes from those attachments. After the firewall passes a packet, Transit Gateway uses the route table associated with the network function attachment to reach the final destination.

Add static routes for inspected destinations in the pre-inspection tables, targeting the network function attachment. The official CLI pattern is:

```bash
aws ec2 create-transit-gateway-route \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --destination-cidr-block 10.20.0.0/16 \
  --transit-gateway-attachment-id tgw-attach-0123456789abcdef0
```

Traffic matching the route is sent to the firewall attachment for inspection before the post-inspection table forwards it to the final destination.

Install the reverse inspection route in the table used by traffic from the data attachment:

```bash
aws ec2 create-transit-gateway-route \
  --transit-gateway-route-table-id tgw-rtb-0fedcba9876543210 \
  --destination-cidr-block 10.10.0.0/16 \
  --transit-gateway-attachment-id tgw-attach-0123456789abcdef0
```

If both spokes share one associated pre-inspection Transit Gateway table, that table needs static firewall routes for both destination CIDRs. In segmented designs, install the relevant route in every source-domain table that must inspect traffic. In both cases, the post-inspection table associated with the firewall attachment needs routes to both spoke attachments.

Review longest-prefix behavior. A direct propagated or static route more specific than the firewall route can bypass inspection. A broader firewall default does not override a specific spoke route.

## Configure Network Firewall Address Variables

Centralized inspection sees addresses outside a firewall deployment VPC. Stateful domain list and Suricata-compatible rules can use `HOME_NET` and `EXTERNAL_NET`. AWS warns that transit gateway-attached firewalls using stateful rule groups that reference these variables must set values appropriate to the connected networks rather than relying on firewall-policy defaults. If a rule group overrides the policy variables, explicitly set both variables; otherwise, its `EXTERNAL_NET` inherits the policy value even when the rule group's `HOME_NET` is different.

Define the variables from the protected internal CIDRs, for example:

```text
HOME_NET = [10.10.0.0/16, 10.20.0.0/16]
EXTERNAL_NET = the negation of HOME_NET
```

This is conceptual notation; configure the variables through the supported Network Firewall rule-group schema. Include every intended protected network and maintain the list as address plans change. An omitted CIDR can make a valid rule fail to match without any routing error. Because both spoke CIDRs are in `HOME_NET`, a rule from `$HOME_NET` to `$EXTERNAL_NET` does not match traffic between these spokes; use explicit internal source and destination variables or CIDRs for east-west rules.

Choose the firewall policy's stateless default actions carefully. For stateful inspection, AWS guidance commonly forwards full and fragmented packets to the stateful engine. A unidirectional stateless `pass` can create asymmetric policy behavior when the reverse direction is forwarded to stateful inspection. Review paired directions.

## Option 2: Use an Inspection VPC

The inspection VPC model has more routing layers but supports custom service chains. In each enabled zone, use:

- one Transit Gateway attachment subnet;
- one Network Firewall endpoint subnet;
- dedicated route tables for the zonal path.

Enable appliance mode on the inspection VPC's Transit Gateway attachment. Current Transit Gateway documentation also requires propagation into the route table associated with the appliance-mode attachment for Availability Zone-aware routing.

Use two Transit Gateway tables.

The pre-inspection table is associated with spoke attachments:

| Destination | Target | Type |
| --- | --- | --- |
| `0.0.0.0/0` or approved CIDRs | Inspection VPC attachment | Static |

The post-inspection table is associated with the inspection VPC attachment:

| Destination | Target | Type |
| --- | --- | --- |
| `10.10.0.0/16` | Application attachment | Propagated |
| `10.20.0.0/16` | Data attachment | Propagated |

The default route is convenient, but it sends every unmatched destination to inspection. Specific routes make scope clearer. In either case, remove direct spoke routes from the pre-inspection table when all east-west traffic must be inspected.

## Route Through the Same-Zone Firewall Endpoint

In the inspection VPC, each Transit Gateway attachment subnet needs a route to the Network Firewall endpoint in the same Availability Zone:

| Attachment subnet table | Destination | Target |
| --- | --- | --- |
| Zone A | Inspected CIDRs or `0.0.0.0/0` | Firewall endpoint A |
| Zone B | Inspected CIDRs or `0.0.0.0/0` | Firewall endpoint B |

Each firewall endpoint subnet needs a route back to Transit Gateway for the connected spoke CIDRs:

| Firewall subnet table | Destination | Target |
| --- | --- | --- |
| Zone A | `10.10.0.0/16` | Transit Gateway ID |
| Zone A | `10.20.0.0/16` | Transit Gateway ID |
| Zone B | `10.10.0.0/16` | Transit Gateway ID |
| Zone B | `10.20.0.0/16` | Transit Gateway ID |

These CIDRs are not contiguous and cannot be summarized by `10.10.0.0/15`; use the two individual routes in each zonal route table.

Network Firewall requires the request and response through the same endpoint. Appliance mode preserves the inspection attachment's zone for the flow; same-zone VPC route tables keep both directions on the corresponding endpoint.

Do not point a zone A attachment subnet at the zone B endpoint. Do not share a route table containing one zonal endpoint target across all attachment subnets.

## Complete the Spoke VPC Routes

Each workload subnet needs a route for remote spoke CIDRs to Transit Gateway:

| Destination | Target |
| --- | --- |
| Local VPC CIDR | `local` |
| Remote VPC CIDR | Transit Gateway ID |

Transit Gateway propagation does not add this route to VPC tables. Configure both VPCs.

Check that each source Availability Zone is enabled on its VPC attachment. A workload subnet cannot use a Transit Gateway route if the attachment has no subnet in the same Availability Zone.

Security groups, network ACLs, and host firewalls still apply. Firewall approval does not override a destination security group, and a stateful security group cannot repair a missing route.

## Prevent the Classic Asymmetry Failures

### One direction bypasses the firewall

A more-specific direct Transit Gateway route can win over a broader route to the firewall. Search the exact destination in the table associated with each source attachment.

### Reply uses a different endpoint

In an inspection VPC, confirm appliance mode, the documented propagation prerequisite, and same-zone endpoint routes. Correlate firewall endpoint IDs for both directions.

### Traffic loops through inspection

The table associated with the inspection VPC attachment must send passed traffic to final spoke attachments, not back to the inspection attachment. Separate pre-inspection and post-inspection tables.

### Policy sees the wrong internal network

Update `HOME_NET`, rule source and destination CIDRs, and domain-list scope for all attached networks.

### Stateless rules create unequal paths

Review both directions of stateless `pass`, `drop`, and forward-to-stateful rules. Fragment handling must follow the intended engine as well.

### A new VPC silently bypasses inspection

Attachment onboarding must set its route-table association and install firewall routes before application routes are enabled. Defaults should fail closed.

## Validate with Logs and Route Evidence

For one tuple, collect:

- source and destination addresses and ports;
- VPC and Transit Gateway attachment IDs;
- route table associated with each ingress attachment;
- winning route in both directions;
- Network Firewall flow and alert logs;
- Transit Gateway and VPC Flow Logs;
- Availability Zone and firewall endpoint for both directions when using an inspection VPC.

Test every zone pair and both initiation directions allowed by policy. Include UDP, fragments or large packets where relevant, and long-lived TCP connections.

AWS Network Manager Route Analyzer can validate Transit Gateway route-table paths and declared middleboxes. It does not inspect VPC route tables, security groups, network ACLs, or the firewall's rule outcome. Network Firewall logs prove that traffic reached the engine; application tests prove the full data path.

Monitor:

- firewall dropped and passed flows;
- rule-group capacity and policy update failures;
- Transit Gateway no-route and blackhole counters;
- bytes per attachment and zone;
- unexpected direct spoke routes;
- endpoint health and zone coverage;
- cross-account attachment deletion or ownership changes.

## Migrate Between the Models Carefully

Moving from an inspection VPC to a direct firewall attachment changes the route insertion point. Do not run both paths accidentally for different directions.

1. reproduce the policy and address variables on the direct firewall;
2. configure the transit gateway-attached firewall for every required zone, producing one multi-zone network function attachment;
3. verify ownership and acceptance state;
4. stage static Transit Gateway firewall routes without making them win prematurely;
5. switch a nonproduction routing domain first;
6. test forward, return, negative, and failure paths;
7. move production domains in controlled batches;
8. remove VPC endpoint routes only after no traffic depends on them;
9. retain logs and rollback routes through the observation period.

Route-table changes are not one atomic transaction. Plan for session interruption and control-plane convergence.

## Official Documentation

- [Transit gateway-attached firewalls in AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall.html)
- [Considerations for transit gateway-attached firewalls](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall-considerations.html)
- [Route traffic through a network function attachment](https://docs.aws.amazon.com/vpc/latest/tgw/route-traffic-nf-attachment.html)
- [AWS Transit Gateway network function attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-nf-fw.html)
- [Avoid asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [Network Firewall Transit Gateway multi-zone configuration](https://docs.aws.amazon.com/network-firewall/latest/developerguide/vpc-config-tgw-multi-az.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)

## Conclusion

For new AWS Network Firewall deployments, evaluate the direct Transit Gateway network function attachment first: appliance mode and infrastructure are managed, static routes in pre-inspection tables insert inspection, and the route table associated with the firewall attachment provides the post-inspection path. Use an inspection VPC when the service chain requires it, with separate pre- and post-inspection tables plus same-zone endpoint routes. In either model, force both directions through the firewall, configure internal address variables, and prove symmetry from route and firewall logs.
