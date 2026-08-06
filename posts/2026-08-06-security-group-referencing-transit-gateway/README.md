# Security Group Referencing Across Transit Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Security Groups, VPC, Network Security, Terraform

Description: Use security group references across Transit Gateway with the supported topology, required settings, and current inspection and endpoint limitations.

---

Security group referencing across AWS Transit Gateway lets a destination security group allow traffic from workloads that belong to a source security group in another VPC. It replaces broad source CIDRs with workload identity for supported VPC-to-VPC paths.

The feature is narrower than its name suggests. It supports inbound references across VPC attachments on the same Transit Gateway. It does not make every Transit Gateway attachment type security-group-aware, and it does not work when a supported path is redirected through certain inspection services.

## What a Reference Actually Grants

Suppose instances in an application VPC use `sg-client`, and a service in another VPC uses `sg-api`. An inbound rule on `sg-api` can reference `sg-client` and allow TCP 443.

The rule means that private IP traffic from network interfaces associated with `sg-client` can reach resources associated with `sg-api` on that protocol and port. It does not copy any rules from `sg-client`. It does not mean that every address in the client VPC is trusted. Membership of the referenced group is the source identity.

The network still routes by IP address. Transit Gateway and VPC route tables must provide a valid forward and return path, and network ACLs must permit the packets. A security group reference is authorization, not routing.

## Current Support Matrix

The most important boundary is the connection type between the two VPCs.

| Topology | Inbound security group reference | Outbound security group reference |
| --- | --- | --- |
| Same VPC | Supported | Supported |
| VPC peering | Supported | Supported |
| VPC attachments on the same Transit Gateway | Supported when enabled | Not supported across Transit Gateway |
| Transit Gateway peering | Not supported | Not supported |
| VPN, Direct Connect, Connect, or other non-VPC attachment | Not supported as a source-group identity | Not supported |

For Transit Gateway, both endpoints must be resources in VPCs attached to the same Transit Gateway. A peering connection between two Transit Gateways does not extend the identity relationship.

AWS documents additional limitations for Transit Gateway VPC attachments:

- PrivateLink endpoints are not supported; use CIDR-based rules for those endpoint paths.
- Referencing through an inspection VPC does not work across Gateway Load Balancer or AWS Network Firewall.
- VPC attachments in Availability Zone ID `use1-az3` are not supported.
- The Local Zones listed in the current Transit Gateway documentation are unsupported.
- AWS recommends disabling the feature on attachments with subnets in unsupported Local Zones, AWS Outposts, or AWS Wavelength Zones because leaving it enabled can cause service disruption.
- Amazon EFS can use the feature only with the documented allow-all egress rule on the EFS interface security group.

Transit Gateway Encryption Support is also incompatible with security group references. If encryption support for VPC Encryption Control is part of the design, treat that as an architecture decision, not a setting that can be combined casually with this feature.

Check the current AWS limitations page before a rollout because zone and service support can expand independently of your infrastructure code.

## Enable It at Both Layers

Security group referencing must be enabled on:

1. The Transit Gateway.
2. Every VPC attachment that participates in a referenced flow.

The defaults are easy to misread. Transit Gateway security group referencing is disabled by default. The EC2 API documents the VPC attachment option as enabled by default, but explicitly setting both layers in infrastructure as code avoids depending on creation path, provider version, or inherited state.

For example, with the HashiCorp AWS provider:

```hcl
resource "aws_ec2_transit_gateway" "core" {
  description = "regional network core"

  security_group_referencing_support = "enable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "client" {
  subnet_ids         = var.client_attachment_subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.core.id
  vpc_id             = var.client_vpc_id

  security_group_referencing_support = "enable"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "service" {
  subnet_ids         = var.service_attachment_subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.core.id
  vpc_id             = var.service_vpc_id

  security_group_referencing_support = "enable"
}
```

Then put the reference on the destination's inbound rule:

```hcl
resource "aws_vpc_security_group_ingress_rule" "api_from_clients" {
  security_group_id            = aws_security_group.api.id
  referenced_security_group_id = var.client_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 443
  to_port                      = 443
  description                  = "HTTPS from approved client workloads"
}
```

If the Transit Gateway-level option is disabled later, AWS disables the capability on its VPC attachments too. Manage the setting centrally and prevent an attachment module from silently disagreeing with the gateway owner.

## Inbound Only Changes the Egress Design

Across Transit Gateway, a destination inbound rule can name the source security group. A source outbound rule cannot name the destination security group through Transit Gateway.

The source resource therefore still needs an egress rule that permits the initial connection. Common choices are:

- A destination VPC or subnet CIDR narrowed to the required port.
- An approved managed prefix list where its contents and rule weight fit the design.
- A broader egress rule combined with the destination's identity-based inbound rule and other controls.

Security groups are stateful, so response traffic for an allowed connection is permitted by connection tracking. That statefulness does not make an unsupported outbound reference valid, and it does not help a new flow whose source egress is denied.

Network ACLs are stateless and do not understand security group IDs. Configure their forward and ephemeral return ranges with CIDRs.

## Keep the Path Direct

Security group identity is not preserved through an arbitrary middlebox. The general VPC security group documentation warns that, when traffic between instances is forwarded through a middlebox, referencing the other instance's security group does not allow the flow. Use the peer private IP address or subnet CIDR instead.

Transit Gateway has an explicit version of the same limitation: cross-VPC references do not work when the path crosses Gateway Load Balancer or AWS Network Firewall in an inspection VPC.

This creates a design choice:

- Use a direct same-Transit-Gateway path and identity-based inbound rules.
- Use centralized inline inspection and CIDR-based rules at the protected resources.
- Use an application-level or service-networking control that carries authenticated identity independently of the IP path.

Do not route a subset of traffic through inspection while assuming the existing security group reference remains effective. A route-table change can turn an allowed direct path into a denied inspected path without changing either security group.

## Cross-Account Ownership Needs Coordination

Shared Transit Gateways commonly connect VPCs owned by different AWS accounts. In that model, separate owners control:

- The Transit Gateway-level feature setting.
- Each VPC attachment's setting.
- The source security group membership.
- The destination inbound rule.
- The route tables and network ACLs in each account.

The VPC documentation accounts for a referenced security group being owned by another account, but rule operations do not authorize against the referenced group's policy. AWS checks that the group exists; it does not import its rules. The referenced-group owner also does not receive CloudTrail events merely because another account adds or removes a rule that references it.

That makes inventory and change notification important. Record both group IDs and owning account IDs, and alert on deletion or replacement of source groups. Transit-Gateway-connected security groups are not automatically offered as a complete list in the rule editor, so use an authoritative catalog rather than console discovery.

Only the Transit Gateway owner can change shared gateway route tables and gateway-wide options. Establish a contract between the network account and workload accounts before using the feature as a security boundary.

## Preserve Least Privilege During Deployment

A safe migration from CIDRs to references is additive first:

1. Verify the same-Transit-Gateway topology and all feature settings.
2. Add the source security group reference to the destination inbound rules.
3. Test from an ENI that belongs to the source group.
4. Test from an ENI in the same subnet that does not belong to the source group.
5. Confirm the positive and negative cases in VPC Flow Logs.
6. Remove the old CIDR rule only after the reference path is proven.

The negative test matters. A successful request proves that something allows the flow; it does not prove that the security group reference, rather than the old CIDR rule, allowed it.

For a cross-account rollout, use a canary source group and destination rule first. Avoid replacing security groups merely to rename Terraform resources; a `moved` block can preserve the resource identity when only its Terraform address changes.

## Troubleshooting Checklist

When a referenced flow times out, check in this order:

1. Both resources use the private addresses expected by the routes.
2. Both VPCs attach to the same Transit Gateway, without a peering hop.
3. Gateway-level security group referencing is enabled.
4. Referencing is enabled on both VPC attachments.
5. The destination has an inbound rule referencing the actual source security group ID.
6. The source ENI is currently associated with that security group.
7. The source egress rule permits the destination and port without relying on an unsupported outbound reference.
8. VPC and Transit Gateway route tables contain the forward and return routes.
9. Network ACLs permit both directions.
10. The selected path does not cross Gateway Load Balancer, Network Firewall, PrivateLink, or another middlebox.
11. The attachments do not use an unsupported Availability Zone, Local Zone, Outposts, or Wavelength topology.

Use the EC2 `describe-security-group-references` operation to identify VPCs that contain rules referencing a specified security group across the Transit Gateway. Pair it with VPC Flow Logs on the source and destination ENIs; a Transit Gateway route can be correct while the destination security group still rejects the packet.

## Official Documentation

- [Security group referencing for Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Security group rules and references](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html#security-group-referencing)
- [Create a Transit Gateway VPC attachment](https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html)
- [Modify a Transit Gateway VPC attachment](https://docs.aws.amazon.com/vpc/latest/tgw/modify-vpc-attachment.html)
- [Update Transit Gateway security group inbound rules](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-sg-updates-update.html)
- [Identify Transit Gateway referenced security groups](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-sg-updates-identify.html)
- [Transit Gateway Encryption Support](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-encryption-support.html)
- [Terraform AWS Transit Gateway resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway)
- [Terraform AWS Transit Gateway VPC attachment resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment)

## Conclusion

Security group referencing across Transit Gateway is valuable when traffic moves directly between VPC attachments on the same gateway. Enable it explicitly at the gateway and attachment layers, place the reference on the destination inbound rule, and keep a CIDR-aware source egress and network ACL design. If the path crosses peering, inspection, PrivateLink, or an unsupported edge location, use a control that matches that topology instead of assuming the security group identity will survive it.
