# Transit Gateway Appliance Mode for Stateful Inspection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Appliance Mode, Network Firewall, Availability Zones, Routing

Description: Use Transit Gateway appliance mode to preserve an inspection flow's Availability Zone, while avoiding missing propagation and cross-zone path surprises.

---

Stateful firewalls need both directions of a connection to traverse the same stateful inspection context. In a multi-Availability-Zone VPC behind AWS Transit Gateway, ordinary zone affinity can send the request through one appliance and the reply through another.

Transit Gateway appliance mode changes zone selection for the appliance VPC attachment. It keeps the same Availability Zone for that attachment for the lifetime of a flow between a source and destination. It does not create routes, synchronize firewall state, or make every inspection topology symmetric automatically.

Enable it on the VPC attachment that contains the stateful appliance or AWS Network Firewall endpoints, then validate every surrounding route table.

## See Why Default Zone Affinity Can Be Asymmetric

Consider this path:

- application VPC A sends from Availability Zone A;
- application VPC B receives in Availability Zone B;
- an inspection VPC has a firewall endpoint in both zones;
- Transit Gateway routes both directions through the inspection attachment.

Without appliance mode, Transit Gateway attempts to maintain the originating Availability Zone as traffic moves between VPC attachments. The request from VPC A can traverse the inspection endpoint in zone A. The reply originating in VPC B can traverse the endpoint in zone B.

If the firewall state is local to each zonal endpoint, zone B has no state for the request processed in zone A. It may drop the reply. Both route directions appear present, yet the stateful connection fails.

This is not fixed by adding a second firewall or by using identical policies. The two directions still need the same stateful flow context.

## Know Exactly What Appliance Mode Changes

When appliance mode is enabled on a VPC attachment, Transit Gateway:

- selects an Availability Zone for that appliance attachment for a flow;
- continues using that zone for the attachment for the lifetime of the flow;
- can send the flow to any enabled Availability Zone on the appliance VPC attachment, rather than requiring ordinary source-zone alignment.

The behavior belongs to one VPC attachment. It does not turn the whole transit gateway into appliance mode, and it is not supported as an option on every attachment type.

The flow can originate from other VPC, VPN, Connect, Direct Connect gateway, or peering paths supported by the surrounding Transit Gateway design. The appliance attachment is where zone consistency is enforced.

Appliance mode is therefore appropriate when:

- a centralized VPC contains stateful firewall appliances;
- AWS Network Firewall endpoints inspect Transit Gateway traffic across zones;
- Gateway Load Balancer endpoints lead to stateful third-party appliances;
- forward and return traffic enter the inspection VPC through the same Transit Gateway attachment.

It is not needed merely because a VPC hosts a stateless router, DNS server, proxy that terminates both connections, or ordinary application workloads.

## Meet the Route Propagation Prerequisite

Current AWS Transit Gateway VPC attachment documentation specifies that route propagation must be enabled for the Transit Gateway route table associated with the appliance-mode VPC attachment for Availability Zone-aware routing.

Transit Gateway uses propagated attachment information to determine source and destination Availability Zones. Without that propagation, it falls back to flow-hash-based zone selection for the appliance VPC. Even a same-zone flow can then be sent to a different zone, defeating expected zone isolation.

This prerequisite is easy to miss in a design that otherwise uses only static routes. Verify both facts:

1. appliance mode is enabled on the inspection VPC attachment;
2. propagation is enabled into the Transit Gateway route table associated with that attachment.

Do not confuse propagation into a spoke ingress table with propagation into the table associated with the appliance attachment.

## Use Pre-Inspection and Post-Inspection Tables

A typical east-west design uses two Transit Gateway route tables.

The spoke table is associated with every workload VPC attachment:

| Destination | Target | Type |
| --- | --- | --- |
| `0.0.0.0/0` | Inspection VPC attachment | Static |

The inspection table is associated with the inspection VPC attachment:

| Destination | Target | Type |
| --- | --- | --- |
| `10.10.0.0/16` | Spoke A attachment | Propagated |
| `10.20.0.0/16` | Spoke B attachment | Propagated |

For a request from spoke A to spoke B:

1. spoke A's VPC route sends the destination to Transit Gateway;
2. the spoke table sends it to the inspection attachment;
3. the inspection attachment-subnet route sends it through the same-zone firewall endpoint;
4. the firewall endpoint-subnet route sends inspected traffic back to Transit Gateway;
5. the inspection table sends it to spoke B;
6. the reply follows the reverse logical path and appliance mode preserves the inspection attachment's zone.

If the spoke table also contains a more-specific direct route to spoke B, traffic bypasses inspection. If the inspection table has only a default route back to the inspection attachment, it can loop. Validate the winning route at each ingress.

## Align Inspection VPC Subnets by Zone

Use dedicated subnets in each enabled zone:

- one Transit Gateway attachment subnet;
- one AWS Network Firewall or Gateway Load Balancer endpoint subnet;
- additional appliance, NAT, or service subnets required by the architecture.

Associate the Transit Gateway attachment subnet in each zone with a route table whose inspected destinations point to the firewall endpoint in that same zone. Associate the firewall endpoint subnet with a table that returns approved destinations to Transit Gateway.

AWS Network Firewall does not support asymmetric routing. Its official guidance requires forward and response traffic through the same firewall endpoint. Appliance mode selects a consistent Transit Gateway attachment zone; per-zone VPC route tables keep the packet on the matching endpoint path inside the inspection VPC.

Appliance mode cannot correct a zone A attachment-subnet route that points to a zone B firewall endpoint.

## Expect Cross-Zone Paths When Zones Do Not Align

Appliance mode prioritizes flow symmetry for the appliance attachment, not same-zone proximity for every resource. A flow from a workload in one zone can be pinned to an appliance attachment zone chosen for the flow. A destination attachment that lacks that zone can also require Transit Gateway to route internally to one of its enabled zones.

This can create surprises:

- the inspection zone can differ from the source or destination workload zone;
- per-zone dashboards may show traffic in a zone with no originating workload;
- latency differs from a strictly same-zone path;
- downstream subnet and endpoint routes must work for every zone Transit Gateway can select;
- removing one attachment subnet can move new flows to other zones;
- existing long-lived flows and new flows can behave differently during a change.

AWS states there is no additional Transit Gateway charge for its internal cross-Availability-Zone routing when a destination attachment is not present in the source zone. That statement does not make the entire multi-service path free. NAT Gateway, Network Firewall, Transit Gateway data processing, and other data transfer pricing are separate. Calculate cost from the actual sequence of services and current Regional pricing.

Do not force all traffic into one inspection zone merely to make symmetry obvious. That creates a zonal dependency. Deploy and test all required inspection zones.

## Enable Appliance Mode Deliberately

You can enable it while creating the VPC attachment or modify an existing attachment. For an existing attachment:

```bash
aws ec2 modify-transit-gateway-vpc-attachment \
  --transit-gateway-attachment-id tgw-attach-0123456789abcdef0 \
  --options ApplianceModeSupport=enable
```

Then wait for the attachment to return to the available state and inspect the accepted option:

```bash
aws ec2 describe-transit-gateway-vpc-attachments \
  --transit-gateway-attachment-ids tgw-attach-0123456789abcdef0 \
  --query 'TransitGatewayVpcAttachments[0].Options.ApplianceModeSupport'
```

AWS warns that flows can be rebalanced across Availability Zones when appliance mode is enabled on an existing attachment. Treat the change as data-plane risk:

1. verify multi-zone appliances and endpoint health;
2. prepare all route tables and propagation first;
3. drain or tolerate long-lived sessions when possible;
4. enable the option in a controlled window;
5. run new forward and return tests from every zone;
6. watch existing sessions for resets or drops;
7. keep a reviewed rollback plan.

Disabling appliance mode is also a routing behavior change, not cleanup.

## Validate Symmetry with Evidence

For one test flow, capture:

- source and destination IP and port;
- source and destination attachment IDs;
- Transit Gateway source and destination Availability Zone IDs;
- paired attachment ID and flow direction;
- firewall endpoint or appliance instance that processed each direction;
- firewall session identifier where available.

Transit Gateway Flow Logs can include `tgw-src-az-id`, `tgw-dst-az-id`, attachment fields, and the packet tuple. AWS Network Firewall flow and alert logs provide firewall-side evidence. VPC Flow Logs help bracket the attachment and endpoint subnets.

Test:

- each source and destination zone pair;
- both connection directions when policy permits initiation from both sides;
- long-lived TCP and representative UDP behavior;
- an endpoint or zone impairment;
- attachment subnet addition or removal;
- IPv6 separately in a dual-stack design.

AWS Network Manager Route Analyzer can model a middlebox in Transit Gateway route tables, but it does not analyze the inspection VPC route tables or security controls. It cannot prove that both directions hit the same firewall endpoint.

## Recognize Problems Appliance Mode Cannot Fix

Appliance mode does not repair:

- a missing source or return route;
- a direct spoke route that bypasses inspection;
- a firewall endpoint route pointing across zones;
- missing route propagation required for zone awareness;
- security group or network ACL rejection;
- overlapping VPC CIDRs;
- a firewall policy that drops the traffic;
- an unhealthy appliance fleet;
- paths that enter and leave through different inspection attachments.

If symmetry still fails, write the full forward and return path as route-table lookups. Mark the Availability Zone and address tuple after every hop.

## Official Documentation

- [AWS Transit Gateway VPC attachments and appliance mode](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Network Firewall Transit Gateway multi-zone configuration](https://docs.aws.amazon.com/network-firewall/latest/developerguide/vpc-config-tgw-multi-az.html)
- [Avoid asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [Transit Gateway traffic flow and asymmetric routing](https://docs.aws.amazon.com/prescriptive-guidance/latest/inline-traffic-inspection-third-party-appliances/transit-gateway-asymmetric-routing.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)

## Conclusion

Enable appliance mode on the inspection VPC attachment when a stateful appliance must see both directions of a Transit Gateway flow in one Availability Zone. Also enable the documented propagation into the table associated with that attachment, build same-zone endpoint routes, and test every zone pair. Appliance mode preserves attachment-zone symmetry; it does not replace a complete symmetric routing design.
