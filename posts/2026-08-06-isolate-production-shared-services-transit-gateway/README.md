# Isolate Production and Shared Services with Transit Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Network Segmentation, Shared Services, Security

Description: Build a concrete Transit Gateway route-table design that isolates production and nonproduction while preserving controlled access to shared services.

---

Production and nonproduction networks often need the same DNS, identity, package, telemetry, and deployment services without becoming mutually reachable. AWS Transit Gateway can express that policy with three route tables and selective propagation.

The central idea is asymmetric route visibility: both spoke domains learn the shared-services prefix, while neither learns the other spoke domain. The shared-services domain learns the approved return prefixes for both.

This is a routing design, not a complete security boundary. It must be paired with VPC routes, security controls, service authentication, and drift detection.

## Define the Intended Flows First

Use a simple example:

| VPC | Role | CIDR | Attachment |
| --- | --- | --- | --- |
| `prod-a` | Production application | `10.10.0.0/16` | `attach-prod-a` |
| `prod-b` | Production data | `10.11.0.0/16` | `attach-prod-b` |
| `dev-a` | Nonproduction application | `10.50.0.0/16` | `attach-dev-a` |
| `shared` | DNS and platform services | `10.100.0.0/16` | `attach-shared` |

The policy is:

- production can reach approved shared services;
- nonproduction can reach approved shared services;
- production and nonproduction cannot route to one another;
- production spokes can communicate only if the application architecture requires it;
- shared-services workloads can return traffic to both domains, but initiation is restricted separately.

Write these decisions down before adding any propagation. A route table cannot infer the environment from tags or account boundaries.

## Create Three Transit Gateway Route Tables

Create:

- `rtb-prod-ingress` for packets entering from production attachments;
- `rtb-nonprod-ingress` for packets entering from nonproduction attachments;
- `rtb-shared-ingress` for packets entering from the shared-services attachment.

Associate each attachment with the table representing its source policy:

| Attachment | Associated route table |
| --- | --- |
| `attach-prod-a` | `rtb-prod-ingress` |
| `attach-prod-b` | `rtb-prod-ingress` |
| `attach-dev-a` | `rtb-nonprod-ingress` |
| `attach-shared` | `rtb-shared-ingress` |

Every attachment has one association. The associated table is selected when traffic arrives through that attachment.

In a segmented deployment, avoid leaving attachments in a default association table. Decide whether to disable default association and propagation on the transit gateway, and make your onboarding automation verify the explicit end state.

## Propagate Only the Routes Each Domain Needs

Enable the shared-services attachment's propagation into both spoke tables:

| Table | Destination | Target | Origin |
| --- | --- | --- | --- |
| `rtb-prod-ingress` | `10.100.0.0/16` | `attach-shared` | Propagated |
| `rtb-nonprod-ingress` | `10.100.0.0/16` | `attach-shared` | Propagated |

Enable production and nonproduction attachment propagation into the shared table:

| Table | Destination | Target | Origin |
| --- | --- | --- | --- |
| `rtb-shared-ingress` | `10.10.0.0/16` | `attach-prod-a` | Propagated |
| `rtb-shared-ingress` | `10.11.0.0/16` | `attach-prod-b` | Propagated |
| `rtb-shared-ingress` | `10.50.0.0/16` | `attach-dev-a` | Propagated |

Do not propagate nonproduction attachments into `rtb-prod-ingress`. Do not propagate production attachments into `rtb-nonprod-ingress`.

If production spokes must communicate, propagate production attachments into `rtb-prod-ingress`. If they must remain isolated from one another, omit those propagations and expose shared platform services through the shared attachment instead. Make the same decision independently for nonproduction.

## Verify the Missing Routes

Isolation depends on absence, so review what the tables must not contain:

`rtb-prod-ingress` must not contain:

- `10.50.0.0/16 -> attach-dev-a`;
- a summary such as `10.0.0.0/8` whose target can forward to nonproduction;
- a default route to an appliance that can route to nonproduction without enforcing the same policy.

`rtb-nonprod-ingress` must not contain:

- `10.10.0.0/16 -> attach-prod-a`;
- `10.11.0.0/16 -> attach-prod-b`;
- an equivalent broad route through another attachment.

An explicit blackhole for the opposite domain can make intent visible and protect against a broader fallback route. Longest-prefix matching still applies, so blackhole prefixes must cover the denied address plan correctly. A more-specific allowed route can override a less-specific blackhole.

## Configure VPC Route Tables on Both Sides

Transit Gateway does not copy routes into VPC subnet route tables. Add routes in every workload subnet that needs the path.

For a production application subnet:

| Destination | Target |
| --- | --- |
| `10.10.0.0/16` | `local` |
| `10.100.0.0/16` | Transit gateway ID |

For a nonproduction application subnet:

| Destination | Target |
| --- | --- |
| `10.50.0.0/16` | `local` |
| `10.100.0.0/16` | Transit gateway ID |

For shared-service subnets, install return routes for both approved consumer ranges:

| Destination | Target |
| --- | --- |
| `10.100.0.0/16` | `local` |
| `10.10.0.0/15` | Transit gateway ID |
| `10.50.0.0/16` | Transit gateway ID |

The `10.10.0.0/15` summary covers the two production VPCs in this example. Use summaries only when the address plan and policy align. Otherwise, use specific VPC CIDRs.

Also check the route tables associated with the Transit Gateway attachment subnets. AWS documents that those subnets serve as entry and exit points and need routes to destinations inside the VPC, including target subnets or appliances. Using tiny dedicated attachment subnets makes their role easier to audit, but their route tables still matter.

## Account for Availability Zones

A VPC attachment accepts one subnet per enabled Availability Zone. Resources can use the transit gateway only from Availability Zones enabled on the attachment. Enable the Availability Zones in which workloads require the path, normally multiple zones for availability.

The selected attachment subnet is not the only reachable subnet in that Availability Zone. It is the Transit Gateway entry and exit point for the VPC in that zone. The relevant attachment-subnet route table must be able to forward delivered traffic to the destination subnet or middlebox.

Across accounts, use Availability Zone IDs when coordinating physical zones because names such as `us-east-1a` can map differently between accounts.

## Narrow Access Inside the Shared VPC

Advertising `10.100.0.0/16` creates a network path to the whole shared VPC CIDR. Transit Gateway cannot restrict that route to DNS port 53 or an HTTPS hostname.

Layer additional controls:

- place services with different trust levels in separate subnets or VPCs;
- allow only approved source CIDRs or referenced security groups where the topology supports them;
- enforce ports and protocols with security groups and network ACLs;
- require workload identity and authentication at the service;
- separate production and nonproduction data stores and credentials;
- log requests and administrative actions;
- expose narrowly scoped services through PrivateLink when consumers should not receive broad VPC reachability.

Be careful with stateful services that can initiate callbacks. A return route in `rtb-shared-ingress` gives the shared VPC a path to consumers. Security policy must decide which shared workloads may use it.

## Add Centralized Inspection Without Bypassing Isolation

If all spoke traffic must traverse a firewall VPC, route tables often become pre-inspection and post-inspection stages:

1. production and nonproduction ingress tables send approved destinations or a default route to the inspection attachment;
2. the inspection attachment uses a separate associated table to reach the final shared or spoke attachments;
3. return paths send traffic through the same stateful appliance;
4. appliance mode is enabled on the appliance VPC attachment when required to maintain Availability Zone affinity for the flow.

Do not give the pre-inspection table a more-specific route that bypasses the firewall. Do not let the post-inspection table reconnect production and nonproduction unless the firewall policy is deliberately responsible for that boundary.

AWS Network Firewall deployments have additional route-table and endpoint requirements. Model each hop explicitly instead of assuming a default route provides symmetric inspection.

## Test Positive and Negative Paths

For each approved service, test:

- production to shared service and its return traffic;
- nonproduction to shared service and its return traffic;
- every enabled Availability Zone;
- DNS resolution and the resulting IP destination;
- failure behavior if one attachment or service endpoint is unavailable.

Then test the isolation boundary:

- nonproduction source to production destination;
- production source to nonproduction destination;
- broad summaries and default-route fallbacks;
- IPv6 paths if dual stack is enabled;
- alternate paths such as peering, VPN, public endpoints, or proxy services.

Use VPC Reachability Analyzer for supported VPC path analysis and AWS Network Manager Route Analyzer for transit gateway route-table analysis. Route Analyzer does not inspect VPC route tables, security groups, network ACLs, or customer-gateway routes, so combine tooling with packet tests and flow logs.

## Detect Drift Continuously

Capture and compare these relationships:

```bash
aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0

aws ec2 get-transit-gateway-route-table-propagations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0

aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=route-search.subnet-of-match,Values=0.0.0.0/0
```

Run the checks for all three tables. Alert when:

- an attachment uses the wrong associated table;
- production propagates into nonproduction or the reverse;
- a new default or broad summary route appears;
- an expected route becomes blackhole;
- an attachment loses an enabled Availability Zone;
- a cross-account owner creates an attachment that remains in an unsafe default state.

Audit VPC subnet routes alongside Transit Gateway state. Either side can drift independently.

## Official Documentation

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [Connect a VPC with Transit Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/extend-tgw.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [VPC Reachability Analyzer](https://docs.aws.amazon.com/vpc/latest/reachability/what-is-reachability-analyzer.html)

## Conclusion

Associate production, nonproduction, and shared-services attachments with separate ingress tables. Advertise shared services into both spoke tables, advertise approved spoke prefixes only into the shared return table, and keep the opposite environment's routes absent. Complete both VPC and Transit Gateway routes, layer service-level controls, and continuously test both allowed and denied paths.
