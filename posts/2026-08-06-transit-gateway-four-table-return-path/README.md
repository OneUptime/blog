# Transit Gateway Return Path: A Four-Table Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Routing, Troubleshooting, Network Operations

Description: Trace a Transit Gateway connection through the source VPC, forward TGW, destination VPC, and return TGW route tables without missing a hop.

---

When traffic reaches AWS Transit Gateway but the connection still times out, the missing route is often on the return path. A successful forward lookup proves only half of a bidirectional session.

For a direct VPC-to-VPC path through one transit gateway, start with four route tables that normally need explicit routes for remote CIDRs:

1. source workload subnet VPC route table;
2. source attachment's associated Transit Gateway route table;
3. destination workload subnet VPC route table for the reply;
4. destination attachment's associated Transit Gateway route table for the reply.

Every VPC attachment also uses an attachment subnet as an entry or exit point. On delivery from Transit Gateway into a VPC, that subnet's route table must route traffic toward the workload. This lookup may reuse a workload table or add a distinct table. Appliance, endpoint, and on-premises paths can add still more route tables. Start with these four checks, then expand every intermediate hop explicitly.

## Use One Concrete Flow

Avoid statements such as "VPC A cannot reach VPC B." Record one five-tuple and its expected response:

```text
source IP:       10.10.4.25
source port:     49152
destination IP:  10.20.8.40
destination port:443
protocol:        TCP
expected reply:  10.20.8.40:443 -> 10.10.4.25:49152
```

Also record:

- source and destination VPC IDs;
- each subnet ID, route table ID, and Availability Zone;
- Transit Gateway ID and both attachment IDs;
- route table associated with each attachment;
- whether a firewall, NAT, load balancer, VPN, or peering attachment changes an address or adds a hop.

Route lookup uses destination addresses. For the reply, the original source address becomes the destination. If NAT changes either address, trace the translated tuple at the correct boundary.

## Table 1: Source Workload Subnet Route Table

The source subnet's associated VPC route table must send the destination to the transit gateway:

| Destination | Target |
| --- | --- |
| `10.10.0.0/16` | `local` |
| `10.20.0.0/16` | `tgw-0123456789abcdef0` |

Check the exact subnet association:

```bash
aws ec2 describe-route-tables \
  --filters Name=association.subnet-id,Values=subnet-0123456789abcdef0
```

If no explicit association is returned, the subnet uses the VPC's main route table. Retrieve the main table rather than assuming a similarly named custom table applies.

Then verify:

- the matching destination is present;
- longest-prefix matching selects the intended route;
- the target is the Transit Gateway ID;
- the route state is active, not blackhole;
- the source Availability Zone is enabled on the VPC attachment.

AWS documents that a subnet route to Transit Gateway forwards traffic only when the VPC attachment has an attachment subnet in the same Availability Zone. Free IP addresses or a healthy attachment in another zone do not satisfy this condition.

## Table 2: Forward Transit Gateway Route Table

The packet enters through the source VPC attachment. That attachment's one associated Transit Gateway route table performs the forward lookup.

Confirm the association rather than opening the default table by habit:

```bash
aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=resource-id,Values=vpc-0123456789abcdef0
```

Search the associated table for the destination:

```bash
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0123456789abcdef0 \
  --filters Name=route-search.longest-prefix-match,Values=10.20.8.40/32
```

The winning route should be active and target the destination VPC attachment. Check for:

- an explicit blackhole route;
- a more-specific route to a different attachment;
- a static route that wins over an equal propagated route;
- propagation enabled into another table instead of this table;
- an unavailable or deleting destination attachment;
- an overlapping VPC CIDR that Transit Gateway cannot route as intended.

Do not stop when you find a route with a matching broad prefix. Confirm it is the longest and active match for the actual destination IP.

## Deliver the Packet Inside the Destination VPC

Transit Gateway sends the packet through an attachment subnet in an enabled Availability Zone. AWS treats the selected attachment subnets as entry and exit points. Their route tables need appropriate routes to the packet's destination inside the VPC.

In a simple VPC, the VPC-local route delivers traffic to the destination subnet. In an inspection VPC, the attachment-subnet table may instead send traffic to a firewall ENI or Gateway Load Balancer endpoint. This is an extra route decision beyond the basic four-table model.

Verify:

- the destination Availability Zone is enabled on the attachment where required;
- attachment subnet route tables do not send the packet to the wrong appliance or gateway;
- network ACLs permit both directions, including ephemeral response ports;
- the destination security group permits the source identity or CIDR supported by the topology;
- the service is listening on the expected address and port;
- host firewalls and application authorization permit the request.

A SYN arriving at the destination host proves the forward routing half. Capture or log whether the host generates a SYN-ACK before blaming the return network.

## Table 3: Destination Workload Subnet Return Route

For the reply, the destination workload becomes the source. Its subnet VPC route table must send `10.10.4.25` toward Transit Gateway:

| Destination | Target |
| --- | --- |
| `10.20.0.0/16` | `local` |
| `10.10.0.0/16` | `tgw-0123456789abcdef0` |

Inspect the exact route table associated with the destination subnet. A frequent mistake is adding the forward route in VPC A but omitting the source CIDR from VPC B.

Check the same properties as Table 1:

- most-specific route;
- active state;
- correct Transit Gateway target;
- attachment present in the source Availability Zone for this return packet.

Stateful security groups remember allowed flows, but they do not create routes. A security group allowing the connection cannot compensate for a missing return route.

## Table 4: Return Transit Gateway Route Table

The reply enters Transit Gateway through the destination VPC attachment. Transit Gateway now uses that attachment's associated table, which can differ from the forward table.

Search it for the original source IP:

```bash
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id tgw-rtb-0fedcba9876543210 \
  --filters Name=route-search.longest-prefix-match,Values=10.10.4.25/32
```

The winning route must be active and target the original source VPC attachment.

This is where segmented designs often fail. A spoke table may have a route to shared services, while the shared-services attachment is associated with a different table that never received the spoke propagation. The forward route is correct and intentional; the return table is incomplete.

Check whether:

- the source attachment propagates into the return table;
- a correct static route exists if propagation is intentionally disabled;
- a broad default or summary points to an unexpected attachment;
- the route is blackhole;
- the source attachment is available.

Finally, delivery into the source VPC uses its attachment subnet route table before reaching the original workload. Inspect that table explicitly when it differs from the workload table or when custom middlebox routing replaces the ordinary VPC-local path.

## Distinguish Routing from Filtering

The symptom helps narrow the layer:

| Observation | Likely next check |
| --- | --- |
| No packet leaves source ENI | Source host, security policy, Table 1 |
| Source VPC Flow Log accepts packet, no TGW delivery | Table 1, source AZ attachment, Table 2 |
| Request reaches destination, no reply generated | Service, host firewall, destination security group |
| Reply leaves destination, never reaches source | Table 3, Table 4, source attachment-subnet route |
| VPC Flow Logs show `REJECT` | Security group, network ACL, or packets arriving after a connection closed |
| TGW Flow Logs show nonzero `packets-lost-no-route` or `packets-lost-blackhole` | Associated TGW table and winning route |

Flow Logs report observed traffic and selected metadata; they do not replace configuration inspection. Collect logs at enough points to bracket where the tuple disappears.

## Use Route Analyzer Within Its Boundary

AWS Network Manager Route Analyzer can analyze forward and return paths across Transit Gateway route tables. Specify source and destination attachments and addresses, and include the return path.

Its documented boundary matters:

- it analyzes Transit Gateway route tables;
- it does not analyze VPC route tables;
- it does not analyze security groups or network ACLs;
- it does not analyze customer gateway device routes;
- intra-Region peering is not supported by Route Analyzer.

Use it to validate Tables 2 and 4, then inspect Tables 1 and 3 separately. A successful Route Analyzer result does not prove that either subnet sends traffic to Transit Gateway.

VPC Reachability Analyzer can evaluate supported paths through VPC resources, including many Transit Gateway scenarios. Confirm current supported resource types and model the actual source and destination. For TCP paths that traverse a Transit Gateway route table, Reachability Analyzer analyzes only forward traffic. Neither tool sends test packets.

## Expand the Checklist for Middleboxes

A stateful inspection path adds route decisions:

```text
source subnet
  -> source TGW table
  -> inspection attachment subnet
  -> firewall endpoint or appliance subnet
  -> post-inspection TGW table
  -> destination attachment subnet
  -> destination subnet
```

The return path must traverse the same stateful inspection context. For an appliance VPC attachment, AWS Transit Gateway appliance mode maintains the same Availability Zone for a flow for that attachment and supports the documented stateful-appliance pattern. It does not repair missing route-table entries or an asymmetric topology outside that behavior.

Write every hop as a destination lookup with a specific table, matching route, target, and expected address at that point. The phrase "the firewall route looks correct" is not enough when four or more firewall-VPC tables participate.

## Run a Reproducible Incident Checklist

For each failing flow:

1. freeze one source IP, destination IP, protocol, and port;
2. resolve each workload subnet to its actual VPC route table;
3. confirm active VPC routes to Transit Gateway in both directions;
4. confirm each workload's Availability Zone is enabled on its VPC attachment;
5. resolve each attachment to its associated Transit Gateway table;
6. find the longest active Transit Gateway route in both directions;
7. expand attachment-subnet and appliance routes where present;
8. inspect security groups, network ACLs, and listeners;
9. correlate VPC and Transit Gateway Flow Logs with packet captures where permitted;
10. run positive and negative tests after one controlled change.

Record route-table IDs, destination prefixes, targets, and API output with timestamps. Routing and attachments may change while an incident is in progress.

## Official Documentation

- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Amazon VPC routing for Transit Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-tgw)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Example return-path analysis for peered transit gateways](https://docs.aws.amazon.com/network-manager/latest/tgwnm/example-route-analyzer.html)
- [Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [VPC Reachability Analyzer](https://docs.aws.amazon.com/vpc/latest/reachability/what-is-reachability-analyzer.html)

## Conclusion

A direct Transit Gateway flow has four essential remote-routing checks: source VPC, forward Transit Gateway, destination VPC return, and return Transit Gateway. Trace the exact tuple through all four, verify the associated table on each ingress attachment, and include the attachment-subnet lookup for delivery into each VPC. Expand appliance hops when the topology requires them. Forward success is never evidence that the return route exists.
