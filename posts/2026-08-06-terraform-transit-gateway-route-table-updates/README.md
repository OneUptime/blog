# Update Transit Gateway Route Tables with Terraform Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Transit Gateway, Terraform, Route Tables, Infrastructure as Code, Network Operations

Description: Stage Transit Gateway route-table changes with Terraform while avoiding empty tables, unsafe replacements, and unsupported zero-downtime assumptions.

---

A Terraform apply is not a network transaction. AWS Transit Gateway route tables, static routes, propagations, and associations are separate resources with separate control-plane transitions. Terraform can order their API operations, but it cannot promise that a packet never arrives between those transitions.

The safest pattern is to build a complete parallel route table, verify it, switch one attachment at a time, and retain the previous table for rollback. That removes avoidable gaps such as associating an attachment with an empty table. It does not turn the association switch into a documented atomic, lossless operation.

If a service truly requires no observable interruption, provide a redundant traffic path above or beside the attachment being changed. A lifecycle flag alone is not redundancy.

## Know Which Object Is Changing

The HashiCorp AWS provider models the Transit Gateway control plane with separate resources:

| Terraform resource | AWS object | Important constraint |
| --- | --- | --- |
| `aws_ec2_transit_gateway_route_table` | Route table | Multiple tables can coexist |
| `aws_ec2_transit_gateway_route` | One static route | Destination is unique within a table |
| `aws_ec2_transit_gateway_route_table_propagation` | Attachment propagation into one table | One attachment can propagate into multiple tables |
| `aws_ec2_transit_gateway_route_table_association` | Attachment association with one table | An attachment can be associated with only one table |

Association determines which route table is consulted for packets entering through an attachment. Propagation installs an attachment's routes into selected tables. Creating a propagation in a new table does not move the attachment's association, which is exactly why a parallel table can be prepared without changing live ingress forwarding.

Review the execution plan for the pinned provider version. A table ID, attachment ID, destination, or static-route next-hop change can appear as a replacement rather than an in-place update. Do not infer behavior from the HCL looking like a small edit.

## Why `create_before_destroy` Is Not a Zero-Gap Switch

Terraform's `create_before_destroy` lifecycle rule changes graph order when two remote objects are allowed to coexist. It cannot override AWS uniqueness constraints.

Two examples matter here:

- AWS permits only one route-table association per Transit Gateway attachment. A second association cannot simply be created alongside the first.
- A Transit Gateway route table cannot contain two static routes with the same destination. A replacement next hop for the same destination cannot coexist in that table.

As a result, applying `create_before_destroy` mechanically can fail with a conflict or still require removal of the active object. It is useful for the new route table and its distinct routes because those have different route-table IDs. It is not proof that the final association or same-destination route transition is lossless.

The association resource has a `replace_existing_association` argument. Its provider documentation is explicit: it removes a current association before associating the requested table. The word `replace` does not imply an atomic swap.

Similarly, the EC2 API exposes `ReplaceTransitGatewayRoute` for changing a static route, but the API documentation does not promise packet-level atomicity. A Terraform provider version may model a route change as replacement instead. Trust the saved plan for the pinned version, and do not assume that the existence of an AWS replace API determines the provider's lifecycle.

## `depends_on` Orders Operations, Not Data-Plane Readiness

An explicit dependency is useful when the association expression does not already reference every route and propagation in the new table. It tells Terraform to finish actions on those dependencies before changing the association.

It does not prove that:

- BGP has converged end to end.
- Every propagated prefix has appeared.
- A stateful firewall has a symmetric return route.
- Remote routers have accepted the new advertisements.
- Application traffic succeeds through the new path.

Terraform waits for the provider's resource operation and read logic. Data-plane validation remains a deployment gate outside the Terraform dependency graph.

## Use a Two-Phase Blue-Green Table

Keep the current route table in place and create a complete next table. The new table can contain the same destinations because its route-table ID is different.

This simplified configuration illustrates the shape:

```hcl
variable "active_tgw_table" {
  type    = string
  default = "current"

  validation {
    condition     = contains(["current", "next"], var.active_tgw_table)
    error_message = "active_tgw_table must be current or next."
  }
}

resource "aws_ec2_transit_gateway_route_table" "current" {
  transit_gateway_id = aws_ec2_transit_gateway.core.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ec2_transit_gateway_route_table" "next" {
  transit_gateway_id = aws_ec2_transit_gateway.core.id

  tags = {
    Name = "production-next"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ec2_transit_gateway_route" "next_on_premises" {
  destination_cidr_block         = "10.40.0.0/16"
  transit_gateway_attachment_id  = aws_vpn_connection.backup.transit_gateway_attachment_id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.next.id
}

resource "aws_ec2_transit_gateway_route_table_propagation" "next_services" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.services.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.next.id
}

locals {
  active_tgw_table_id = var.active_tgw_table == "next" ? aws_ec2_transit_gateway_route_table.next.id : aws_ec2_transit_gateway_route_table.current.id
}

resource "aws_ec2_transit_gateway_route_table_association" "workload" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.workload.id
  transit_gateway_route_table_id = local.active_tgw_table_id

  depends_on = [
    aws_ec2_transit_gateway_route.next_on_premises,
    aws_ec2_transit_gateway_route_table_propagation.next_services,
  ]
}
```

The example route is illustrative, not a recommendation to send primary on-premises traffic to a backup VPN. Populate the table from a reviewed route specification that includes every required static route, blackhole, IPv4 and IPv6 prefix, and propagation.

Apply the configuration in two distinct phases:

1. Leave `active_tgw_table = "current"`. Apply the creation of the next table, routes, and propagations. The live association remains unchanged.
2. After external verification, change `active_tgw_table` to `"next"`. Save and review a new plan for the association replacement, then perform the cutover.

Do not collapse the phases into one apply. Although the graph can create dependencies, a separate verification gate is what catches missing propagated routes, incorrect blackholes, and data-plane defects before live ingress uses the table.

## Make One Terraform Resource Own Each Association

Default association and propagation settings are a frequent source of churn. Transit Gateway can automatically associate or propagate new attachments into its default table. The VPC attachment resource also has `transit_gateway_default_route_table_association` and `transit_gateway_default_route_table_propagation` arguments that actively add or remove those relationships.

The provider documentation warns not to manage the same relationship with both the VPC attachment resource and the dedicated association or propagation resource. Doing so can create perpetual diffs and repeated control-plane changes.

For a new explicitly segmented design:

- Disable automatic default association and propagation on the Transit Gateway.
- Set the corresponding VPC attachment arguments deliberately where the provider supports them.
- Manage custom associations and propagations with one dedicated resource each.

For an existing deployment, first reconcile remote objects, Terraform configuration, and state until a refresh-only or normal plan is a no-op. Import unmanaged associations and propagations where appropriate. Terraform expects each remote object to be bound to one resource address. Do not begin a route-table migration while two modules believe they own the same association.

## Separate Refactoring from Network Changes

Renaming a Terraform resource or moving it into a module is not a network change, but without refactoring metadata Terraform can interpret it as destroy and create.

Use a `moved` block when only the Terraform address changes:

```hcl
moved {
  from = aws_ec2_transit_gateway_route_table_association.application
  to   = module.transit_gateway.aws_ec2_transit_gateway_route_table_association.application
}
```

Apply and confirm a no-op infrastructure plan before changing any table ID, attachment ID, route, or propagation. This keeps state refactoring from hiding a real network replacement in a large plan.

Use import blocks for existing remote objects that Terraform does not yet manage. Do not import the same association into multiple addresses, and do not use `ignore_changes` to conceal unexplained route drift. Hidden drift is especially dangerous during a cutover because the old table may not contain the rollback routes you expect.

## Verify the Next Table Before Cutover

Terraform state is one view. Query the AWS control plane directly as a deployment gate.

```bash
aws ec2 search-transit-gateway-routes \
  --transit-gateway-route-table-id "$NEXT_TGW_ROUTE_TABLE_ID" \
  --filters Name=state,Values=active,blackhole

aws ec2 get-transit-gateway-route-table-propagations \
  --transit-gateway-route-table-id "$NEXT_TGW_ROUTE_TABLE_ID"

aws ec2 get-transit-gateway-route-table-associations \
  --transit-gateway-route-table-id "$CURRENT_TGW_ROUTE_TABLE_ID"
```

Compare the observed table with a machine-readable manifest or reviewed inventory. Check at least:

- Required IPv4 and IPv6 destinations.
- Intended attachment for each static route.
- Expected propagated attachment for each dynamic route.
- Blackhole guardrails and more-specific exceptions.
- Absence of routes that would leak between routing domains.
- Return routes from inspection, VPN, and Direct Connect ingress tables.

Propagation being `enabled` is necessary but not sufficient. Search for representative propagated prefixes and verify their state before the switch.

Then run data-plane probes through an attachment already associated with an equivalent canary table, if the topology permits. At minimum, validate routes from a test VPC or test attachment that uses the same next hops and security controls.

## Review and Apply the Exact Saved Plan

Create a non-speculative saved plan immediately before the change:

```bash
terraform plan -out=tgw-cutover.tfplan
terraform show tgw-cutover.tfplan
terraform apply tgw-cutover.tfplan
```

Treat the saved plan as sensitive because it can contain cleartext values. Do not commit it.

Reject the cutover plan if it includes an unexpected action on:

- The Transit Gateway itself.
- A VPC, VPN, Direct Connect gateway, or appliance attachment.
- The current route table or its routes.
- More than the intended set of associations.
- An unrelated propagation or default-table setting.

The expected association change may still appear as destroy and create. That is a reason to schedule and observe the switch, not a reason to hide the replacement with a lifecycle rule.

## Cut Over in Small Failure Domains

Move one low-risk attachment first. During and immediately after the apply:

1. Poll the association until AWS reports the expected table and associated state.
2. Search the active table for representative routes.
3. Run new TCP and application-level probes in both directions.
4. Check Transit Gateway Flow Logs for no-route and blackhole losses, and VPC Flow Logs for rejects on the selected path.
5. Verify stateful inspection symmetry.
6. Observe for an agreed period before moving the next attachment.

Existing sessions can reset when their path changes even if the route-table transition is fast. Test both new connections and long-lived sessions.

If multiple application VPCs or service instances provide the same service, remove one failure domain from traffic, switch its attachment, validate it, and return it to service before continuing. Load balancer or application traffic shifting is what can make the service-level change continuous while a network attachment changes.

For hybrid routes, dynamic BGP with redundant Direct Connect or VPN paths can provide a safer availability mechanism than replacing a critical static route through Terraform. Use routing protocols for path failure and Terraform for the intended topology.

## Handle Static Next-Hop Changes Carefully

Changing the target attachment of a static route in the active table is the highest-risk small-looking edit. If the provider plan deletes the old route before creating the new one, the destination has no route during that interval. `create_before_destroy` cannot create a duplicate destination in the same table.

Prefer one of these approaches:

- Clone the complete route table, change the next hop in the clone, verify it, and switch associations in controlled waves.
- Replace the static dependency with a deliberately designed propagated route and redundant BGP paths.
- Provide service-level redundancy and drain the affected failure domain before the route operation.

Do not call `ReplaceTransitGatewayRoute` manually in the middle of an ordinary Terraform apply. That introduces drift and creates two controllers. If an organization adopts an explicit out-of-band emergency operation, define ownership, audit, rollback, and immediate Terraform reconciliation in the runbook.

## Keep the Old Table as the Rollback Artifact

Do not destroy the current table in the cutover change. Keep its routes and propagations intact until:

- Every migrated attachment has passed forward and return-path tests.
- Metrics and flow logs show no regression through the observation period.
- Failover and inspection behavior have been exercised.
- The rollback decision window has expired.

Rollback is a second association transition back to the old table, so it has the same control-plane risk as the forward switch. It is fast to initiate because the old table is already complete, but it is not guaranteed to preserve every packet or session.

After the migration, remove `prevent_destroy` only in a separate reviewed cleanup change. Recheck that no association or required propagation still references the old table before deleting it.

## What Zero Downtime Really Requires

For a single attachment with one allowed association, neither AWS nor Terraform documents a packet-level atomic table swap. A careful blue-green process minimizes exposure and avoids self-inflicted empty-table windows, but the final association still transitions through the control plane.

No observable service interruption requires at least one of these:

- Redundant application instances in another VPC or attachment that remains in service.
- Traffic draining and load-balancer shifting around each network failure domain.
- Redundant dynamically learned hybrid paths.
- Application retries and connection recovery that fit the measured transition.
- A maintenance window when none of those controls is available.

State the guarantee accurately. "The next table is complete before cutover" is testable. "Terraform makes the switch atomically" is not supported by the documented behavior.

## Official Documentation

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AssociateTransitGatewayRouteTable API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_AssociateTransitGatewayRouteTable.html)
- [DisassociateTransitGatewayRouteTable API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DisassociateTransitGatewayRouteTable.html)
- [ReplaceTransitGatewayRoute API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ReplaceTransitGatewayRoute.html)
- [Terraform Transit Gateway route table association](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association)
- [Terraform Transit Gateway route](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route)
- [Terraform Transit Gateway route table propagation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation)
- [Terraform Transit Gateway VPC attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment)
- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform resource dependencies](https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on)
- [Terraform module refactoring with moved blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform import workflow](https://developer.hashicorp.com/terraform/language/import)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)

## Conclusion

The safe Terraform strategy is prepare, verify, switch, observe, and retain. Build a parallel Transit Gateway route table with every route, propagation, and guardrail before touching the live association. Review the exact replacement plan and move attachments in small waves. Most importantly, do not turn graph ordering into a zero-downtime claim: use redundant paths or service-level traffic shifting when the business requirement is no observable connectivity gap.
