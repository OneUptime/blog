# Choose Transit Gateway Attachment Subnets by Availability Zone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, VPC, Subnets, Availability Zone, Routing

Description: Select dedicated Transit Gateway attachment subnets in every required Availability Zone and configure their route tables as real data-path components.

---

When you attach a VPC to AWS Transit Gateway, the selected subnets are not a generic list of private networks. You select at most one subnet in each Availability Zone, and Transit Gateway places a network interface in each selected subnet. Those subnets become entry and exit points for Transit Gateway traffic in the VPC.

The selection controls Availability Zone coverage and routing behavior. A workload subnet with a route to Transit Gateway cannot use that route unless the VPC attachment includes a subnet in the same Availability Zone.

Treat attachment subnets as dedicated network infrastructure, not arbitrary existing application subnets.

## Understand What the Selected Subnet Does

For every enabled Availability Zone, Transit Gateway uses one IP address from the selected subnet for its network interface. After the zone is enabled, Transit Gateway can route to resources in other subnets in that Availability Zone. Workloads do not need to live in the attachment subnet.

The selected subnet has three important effects:

1. it enables that Availability Zone for the attachment;
2. its route table controls where traffic delivered from Transit Gateway goes inside the VPC;
3. its network ACL participates in traffic entering and leaving through the attachment interface.

The workload subnet's route table remains separate. It controls whether workload-originated traffic is sent to Transit Gateway.

For a simple VPC with no appliance, the local VPC route usually carries traffic between the attachment subnet and workload subnets. For an inspection or egress VPC, the attachment-subnet table often sends traffic to a firewall endpoint, appliance ENI, NAT path, or other next hop.

## Select Every Availability Zone That Needs Transit

Suppose a VPC has application subnets in three zones:

| Availability Zone | Workload subnet | Attachment subnet selected? | Workload can originate to TGW? |
| --- | --- | --- | --- |
| `eu-west-1a` | `subnet-app-a` | Yes | Yes, with a VPC route |
| `eu-west-1b` | `subnet-app-b` | Yes | Yes, with a VPC route |
| `eu-west-1c` | `subnet-app-c` | No | No |

Adding `tgw-id` as a target in `subnet-app-c` does not compensate for the missing attachment subnet in `eu-west-1c`. AWS explicitly requires a Transit Gateway attachment subnet in the same Availability Zone as the traffic source.

For production VPCs, enable every zone that contains workloads requiring Transit Gateway connectivity. Multiple zones also prevent one Availability Zone failure from removing the VPC's only attachment path.

Do not enable zones merely because they exist in the Region. Each selected subnet becomes managed configuration and consumes an IP address. Base the set on current resilience and routing requirements, with a process to add zones before workloads launch there.

## Use Dedicated Attachment Subnets

AWS recommends a separate subnet for each Transit Gateway VPC attachment. Dedicated subnets provide several practical advantages:

- their route tables describe only ingress and egress from Transit Gateway;
- their network ACLs can be reviewed independently;
- application route changes do not silently change the attachment path;
- middlebox and centralized egress patterns are easier to express;
- IP consumption and ownership are clear.

Size the subnets according to your address plan and operational headroom. Transit Gateway uses one IP address from each selected subnet, but AWS normally reserves the first four and last IPv4 addresses in a VPC subnet; subnets that use BYOIP address space are an exception. Future network designs may also require additional infrastructure. Do not rely on a subnet with no spare usable address.

The subnet must support IPv4. AWS does not allow an IPv6-only subnet as a Transit Gateway attachment subnet. A dual-stack subnet can be selected, and IPv6 support can be enabled on the attachment when the topology is dual stack.

## Do Not Equate Public with Reachable

A subnet is commonly called public when its route table sends `0.0.0.0/0` to an internet gateway and resources have suitable public addressing. Selecting a public subnet does not make Transit Gateway internet-facing. It does, however, apply that subnet's route-table behavior to traffic arriving from Transit Gateway.

That can break centralized internet egress. In AWS's documented NAT gateway example, the egress VPC's Transit Gateway attachment uses a private subnet whose default route points to the NAT gateway. If the attachment used the public NAT subnet instead, traffic arriving from spokes would follow the internet gateway route and be dropped because the original private source has no public address.

Choose the attachment subnet based on the next hop required for traffic entering the VPC:

- ordinary spoke VPC: local route toward workload subnets;
- centralized NAT egress VPC: private attachment subnet toward the NAT gateway;
- inspection VPC: per-zone attachment subnet toward the same-zone firewall endpoint;
- service VPC: local or appliance route toward service subnets.

Subnet labels alone do not prove any of these behaviors. Inspect the associated route table.

## Design the Attachment-Subnet Route Table

For a basic spoke VPC, an attachment-subnet table may contain only local VPC routes and any explicitly required appliance route. Return traffic from Transit Gateway to `10.10.8.0/24` matches the local route and reaches the application subnet.

For an egress VPC, the table might be:

| Destination | Target |
| --- | --- |
| Egress VPC CIDR | `local` |
| `0.0.0.0/0` | NAT gateway in the designed path |

For an inspection VPC with AWS Network Firewall, each Availability Zone commonly has its own Transit Gateway attachment-subnet route table:

| Destination | Target |
| --- | --- |
| Inspection VPC CIDR | `local` |
| `0.0.0.0/0` | Network Firewall endpoint in the same zone |

The firewall endpoint subnet then needs a route back toward Transit Gateway for inspected destinations. Network Firewall requires symmetric routing through the same firewall endpoint, so per-zone tables are not optional decoration.

AWS's Transit Gateway best practices recommend associating the same VPC route table with all attachment subnets unless the design specifically requires different tables, such as a middlebox VPC with multiple NAT gateways. Consistency reduces accidental zone-specific behavior; deliberate per-zone next hops are the exception.

## Keep Workload and Attachment Routes Separate

The workload subnet needs a route to remote networks:

| Destination | Target |
| --- | --- |
| Workload VPC CIDR | `local` |
| `10.20.0.0/16` | Transit gateway ID |

The attachment subnet needs a route toward the final destination inside this VPC. These are opposite directions and often different tables.

When a connection fails only on traffic entering the VPC, inspect the attachment-subnet table. When a workload cannot send traffic to Transit Gateway, inspect the workload-subnet table and same-zone attachment coverage.

Do not add a route to the Transit Gateway ID in the attachment subnet merely because application subnets have one. A route that sends traffic arriving from Transit Gateway back to Transit Gateway can create invalid or looping behavior. Model the intended next hop for each direction.

## Coordinate Availability Zones Across Accounts

Availability Zone names such as `us-east-1a` are account-specific mappings. The same name can refer to different physical zones in two accounts. AWS recommends using Availability Zone IDs, such as `use1-az1`, when coordinating attachment and resource placement across accounts.

Record both values in network inventory:

```text
account:              111122223333
availability-zone:    us-east-1a
availability-zone-id: use1-az1
attachment-subnet:    subnet-0123456789abcdef0
route-table:          rtb-0123456789abcdef0
```

This prevents a central networking team from assuming that participant-account `us-east-1a` aligns with its own `us-east-1a`.

## Know the Location Restrictions

AWS documents these VPC attachment constraints:

- select at least one subnet;
- select no more than one subnet per Availability Zone;
- do not select an IPv6-only subnet;
- Local Zone subnets cannot be selected directly;
- Local Zone workloads can reach Transit Gateway through the parent Availability Zone when routing is configured;
- overlapping attached VPC CIDRs are not routable through Transit Gateway as a normal VPC-to-VPC path.

Recheck current Region and zone support before standardizing a design across a fleet.

## Create and Inspect the Attachment

Create an attachment with an explicit subnet list:

```bash
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-0123456789abcdef0 \
  --vpc-id vpc-0123456789abcdef0 \
  --subnet-ids subnet-0123456789abcdef0 subnet-0123456789abcdef1
```

Then inspect the accepted state:

```bash
aws ec2 describe-transit-gateway-vpc-attachments \
  --transit-gateway-attachment-ids tgw-attach-0123456789abcdef0

aws ec2 describe-route-tables \
  --filters Name=association.subnet-id,Values=subnet-0123456789abcdef0,subnet-0123456789abcdef1
```

The route-table filter returns explicit subnet associations only. If an attachment subnet is implicitly associated with the VPC's main route table, inspect that table as well:

```bash
aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=vpc-0123456789abcdef0 \
            Name=association.main,Values=true
```

Wait until the attachment is available before depending on its data path. Verify the options for DNS, IPv6, security-group referencing, and appliance mode against the intended topology instead of copying defaults from another VPC.

When modifying subnet membership, treat removal as a connectivity change. Workloads in that Availability Zone lose their ability to originate traffic through the attachment. Test the remaining zones and observe flows during the transition.

## Validate Before Launching Workloads

For every zone:

1. confirm the intended attachment subnet is selected;
2. confirm enough usable IPv4 addresses remain;
3. map the attachment subnet to its actual VPC route table and network ACL;
4. map each workload subnet to its route table;
5. verify remote destinations point to Transit Gateway from workloads;
6. verify Transit Gateway-delivered traffic has the correct next hop inside the VPC;
7. confirm forward and return Transit Gateway route-table associations;
8. test from a workload in that exact zone;
9. repeat for IPv6 when enabled;
10. alert when new workload subnets appear in an uncovered zone.

Per-Availability-Zone Transit Gateway CloudWatch metrics can help identify a silent zone, but successful aggregate traffic in another zone is not proof that all zones work.

## Official Documentation

- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Create a Transit Gateway VPC attachment](https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway design best practices](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html)
- [Amazon VPC subnet route tables](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html)
- [Transit Gateway CloudWatch metrics](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html)

## Conclusion

Select one dedicated attachment subnet in every Availability Zone that requires Transit Gateway access. The selection enables the zone, consumes an IPv4 address, and makes the attachment subnet's route table and network ACL part of the data path. Keep workload egress routes separate from attachment ingress routes, use Availability Zone IDs across accounts, and test each zone independently before workloads depend on it.
