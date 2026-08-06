# Fix a Pending Cross-Account Transit Gateway Attachment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Transit Gateway, AWS Resource Access Manager, Amazon VPC, Cross-Account Networking, Cloud Operations, Network Troubleshooting

Description: Diagnose pending cross-account Transit Gateway VPC attachments and assign acceptance, routing, subnet, security, and billing ownership.

---

A cross-account AWS Transit Gateway VPC attachment is a two-owner workflow. The Transit Gateway owner shares and governs the hub. The VPC owner creates the spoke attachment and controls the VPC side. If automatic acceptance is disabled, the attachment stops at `pendingAcceptance` until the Transit Gateway owner accepts it.

That state is different from `pending`. AWS defines `pending` as provisioning after a request is initiated or accepted. Waiting for the VPC owner to "finish the route" will not resolve `pendingAcceptance`, and repeatedly accepting an attachment already in `pending` will not accelerate AWS provisioning.

The fastest diagnosis is to identify the exact state, account, Region, and resource owner before changing anything.

## Understand the Two Approval Layers

A shared Transit Gateway normally begins with AWS Resource Access Manager:

1. The Transit Gateway owner creates an AWS RAM resource share containing the Transit Gateway.
2. The owner shares it with an account, organizational unit, or organization.
3. The participant gains access to the shared resource.
4. The VPC owner creates a VPC attachment using subnets from its VPC.
5. If `AutoAcceptSharedAttachments` is disabled, the Transit Gateway owner accepts the attachment.
6. AWS provisions it and the state becomes `available`.

The RAM share and the Transit Gateway attachment are separate control-plane objects. Accepting an external RAM invitation makes the shared gateway visible; it does not accept a later attachment request. Conversely, accepting an attachment cannot fix a missing or inaccessible resource share.

For sharing inside AWS Organizations, AWS RAM sends no invitation when organization sharing is enabled. Principals gain access through the share. For external principals, an invitation and its acceptance can be part of the process. AWS RAM is Regional, so inspect the Region that contains the Transit Gateway.

## Read the Lifecycle Literally

AWS documents these relevant cross-account states when automatic acceptance is off:

| State | Meaning | Primary next actor |
| --- | --- | --- |
| `pendingAcceptance` | Request exists and awaits acceptance | Transit Gateway owner |
| `pending` | Request was initiated or accepted and is provisioning | AWS control plane, then both owners if it fails |
| `available` | Attachment provisioning completed | Both owners configure and verify routing |
| `rejecting` / `rejected` | Owner rejected the request | Owners decide whether to create a corrected request |
| `failing` / `failed` | Provisioning failed | Both owners inspect configuration and events |
| `modifying` | An attachment property change is running | Wait and observe |
| `rollingBack` | AWS is undoing an unsuccessful modification | Wait, then inspect the result |
| `deleting` / `deleted` | Removal is in progress or complete | Owners clean dependent routes and records |

The documentation renders some state names with hyphens in prose, while the EC2 API and CLI response use values such as `pendingAcceptance` and `rollingBack`. Capture the API value in incident notes so teams do not treat `pendingAcceptance` and `pending` as synonyms.

Failed, rejected, and deleted attachments remain visible for a limited period, generally two hours according to the lifecycle documentation. Preserve relevant CloudTrail events and command output before the record disappears.

## Establish Ground Truth with Read-Only Checks

Run the first query in the VPC account and then, where authorized, in the Transit Gateway account. Always set the Region and credential profile explicitly:

```bash
aws ec2 describe-transit-gateway-vpc-attachments \
  --region us-east-1 \
  --profile workload-owner \
  --transit-gateway-attachment-ids tgw-attach-0123456789abcdef0 \
  --query 'TransitGatewayVpcAttachments[0].{State:State,TGW:TransitGatewayId,VPC:VpcId,VpcOwner:VpcOwnerId,Subnets:SubnetIds,Options:Options}'
```

Record:

- attachment ID and state;
- Transit Gateway ID and owner account;
- VPC ID and owner account;
- Region;
- selected subnet IDs and their Availability Zone IDs;
- `AutoAcceptSharedAttachments` setting on the Transit Gateway;
- RAM share and principal status;
- creation and acceptance events in CloudTrail.

Cross-account Availability Zone names are not reliable physical identifiers. `us-east-1a` can map to different locations in different accounts. AWS tells cross-account operators to use Availability Zone IDs such as `use1-az1`, which are consistent across accounts.

## Accept from the Correct Account

When the attachment is `pendingAcceptance` and auto-accept is off, a principal in the Transit Gateway owner account with permission can accept it:

```bash
aws ec2 accept-transit-gateway-vpc-attachment \
  --region us-east-1 \
  --profile network-owner \
  --transit-gateway-attachment-id tgw-attach-0123456789abcdef0
```

The accept API requires the attachment to be in `pendingAcceptance`. If the command says the attachment is not found, first check account and Region. If it returns `UnauthorizedOperation`, inspect IAM permissions, permission boundaries, session policies, service control policies, and any organization policy. Do not recreate the attachment until you know which control denied the action.

If the state is already `pending`, acceptance has occurred or was automatic. Observe provisioning and investigate only if it moves to `failed` or remains outside the normal operational window. If the state is `available`, stop troubleshooting acceptance and move to route and security verification.

## Assign Ownership by Control Plane

Cross-account incidents linger when each team assumes the other owns both halves. Use an explicit responsibility table:

| Control | Transit Gateway owner | VPC owner |
| --- | --- | --- |
| Create and manage RAM share | Responsible | Accept external invitation or verify organization access |
| Configure auto-accept | Responsible | Informed |
| Create VPC attachment | Enables shared gateway | Responsible for its VPC and selected subnets |
| Accept or reject attachment | Responsible when auto-accept is off | Supplies request and intended policy |
| Transit Gateway route tables | Responsible | Cannot create or modify shared TGW route tables |
| TGW association and propagation | Responsible | Provides required prefixes and trust domain |
| Static TGW routes and blackholes | Responsible | Requests and validates intent |
| VPC subnet route tables | Consulted | Responsible |
| Security groups and network ACLs | Defines central requirements | Responsible for workload and subnet controls |
| Application listener and host firewall | Informed | Responsible |
| End-to-end test and return path | Joint | Joint |
| VPC attachment hourly and source data processing bill | Informed | VPC owner is billed under current TGW pricing |

AWS states that a participant in a shared Transit Gateway can create and describe VPC attachments for its VPC but cannot create, modify, or delete Transit Gateway route tables, associations, or propagations. AWS also states that a user from either account can delete the attachment. Restrict deletion with IAM and change controls even though the service workflow permits it.

If the Transit Gateway is unshared later, AWS documents that the existing attachment remains functional, the participant can no longer describe the Transit Gateway, and the owner can delete the attachment. Unsharing is therefore not an emergency traffic cutoff. Use explicit route or attachment controls for that purpose.

## An Available Attachment Is Not a Complete Route

`available` proves that AWS provisioned the attachment. It does not prove the application has a forward route, a return route, or authorization.

Trace a packet through four route decisions:

```text
Source workload subnet route table       - VPC owner
Transit Gateway ingress route table      - TGW owner
Destination attachment and VPC routing   - TGW owner plus destination VPC owner
Return path through the same control set  - all relevant owners
```

On the Transit Gateway side, the attachment must be associated with the route table that should evaluate traffic entering from that VPC. The destination attachment must propagate its prefix into that table, or the owner must install an intentional static route. Propagation and association solve different problems: association selects the lookup table for ingress traffic; propagation inserts an attachment's routes into a table.

On the VPC side, target workload subnets need routes for external destinations that point to the Transit Gateway. AWS's current VPC attachment documentation also requires the selected attachment subnet route table to contain routes for destinations inside the VPC that must be reachable from the Transit Gateway. Select exactly one attachment subnet per enabled Availability Zone, and remember that resources can reach Transit Gateway only from zones enabled on the attachment.

For a shared VPC subnet, AWS distinguishes the VPC owner from subnet participants: the VPC owner can attach the Transit Gateway, while a participant cannot. Routes configured by the VPC owner determine whether participant resources can use the attachment.

## Use a State-Based Troubleshooting Matrix

| Observation | Likely control point | Read-only evidence | Next owner action |
| --- | --- | --- | --- |
| Shared TGW is not visible | RAM share, Region, or principal | RAM resource shares and invitations | Share owner or participant fixes access |
| Attachment is `pendingAcceptance` | Auto-accept is off | TGW options and attachment state | TGW owner accepts or rejects |
| Attachment is `pending` | AWS is provisioning | Attachment state and CloudTrail acceptance | Observe; escalate only if abnormal |
| Attachment is `failed` | Invalid or failed provisioning | State, selected subnets, events | Both owners correct cause and recreate if required |
| Attachment is `available`, no TGW route | Association or propagation | TGW route-table inspection | TGW owner fixes route domain |
| TGW route exists, VPC has no route | VPC subnet route table | VPC route-table inspection | VPC owner adds scoped route |
| Routes exist, connection times out | Security or application | Flow logs, NACLs, SGs, listener health | VPC or application owner fixes policy |
| One direction works | Missing or asymmetric return path | Both route planes and flow logs | Joint packet walk |

Avoid the broad fix of enabling every propagation and adding `0.0.0.0/0` everywhere. That can connect the test while collapsing segmentation. The intended trust domain should determine association, propagation, and static-route changes.

## Make the Handoff an Interface Contract

An attachment request should include enough information for the network owner to approve and route it safely:

```yaml
attachment_id: tgw-attach-0123456789abcdef0
vpc_id: vpc-0123456789abcdef0
vpc_owner_account: "111122223333"
transit_gateway_id: tgw-0123456789abcdef0
transit_gateway_owner_account: "444455556666"
region: us-east-1
availability_zone_ids:
  - use1-az1
  - use1-az2
vpc_prefixes:
  - 10.42.0.0/16
requested_route_domain: production
required_destinations:
  - 10.80.0.0/16
rollback_owner: workload-network-team
```

This is an operational record, not an AWS API payload. Validate that requested prefixes do not overlap existing attachments and that selected subnets have available addresses. Include a removal date for temporary attachments.

After acceptance, both teams should sign off on evidence:

- attachment is `available` in the correct Region;
- attachment subnet AZ IDs match the intended physical zones;
- the correct Transit Gateway route table association exists;
- only intended propagations and static routes exist;
- source, destination, and attachment subnet routes are complete;
- security groups, network ACLs, and host listeners allow the test;
- application probes pass in both directions where required;
- flow logs show the expected interfaces and decisions;
- billing owner and cost allocation tags are recorded.

## Account for Billing at Acceptance

The current AWS Transit Gateway pricing page says the VPC account owner is billed hourly while its VPC is attached. Hourly billing begins when the Transit Gateway owner accepts the VPC attachment and stops when the attachment is deleted; partial hours are billed as full hours. Data processing is charged to the VPC owner for each GB the VPC sends into Transit Gateway.

This means a network team can trigger workload-account spend by accepting an attachment, while the workload team can continue incurring charges even before routes carry useful traffic. Add acceptance, validation, and cleanup to one coordinated change. An unused `available` attachment is not free.

## Official Documentation

- [Amazon VPC Attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Accept a Shared Transit Gateway Attachment](https://docs.aws.amazon.com/vpc/latest/tgw/acccept-tgw-attach.html)
- [Work with Shared Transit Gateways](https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html)
- [Transit Gateways in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html)
- [AWS RAM: Sharing Your AWS Resources](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html)
- [AWS CLI: Accept Transit Gateway VPC Attachment](https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-transit-gateway-vpc-attachment.html)
- [AWS Transit Gateway Pricing](https://aws.amazon.com/transit-gateway/pricing/)

## Conclusion

`pendingAcceptance` has one clear owner: the Transit Gateway owner must accept the cross-account request when auto-accept is disabled. `pending` means provisioning, and `available` starts a different investigation across Transit Gateway and VPC route planes. Make account, Region, state, AZ ID, route-domain ownership, and billing explicit. Cross-account networking becomes routine when the attachment is treated as a two-team interface contract rather than a single shared object.
