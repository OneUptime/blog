# AWS Systems Manager in Private Subnets: VPC Endpoints, DNS, and Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, VPC Endpoints, Networking, Security

Description: Configure private Systems Manager access with feature-specific endpoints, private DNS, security groups, S3 routes, and verification of the actual node path.

Systems Manager can manage EC2 instances without NAT or public IP addresses. The agent initiates connections to AWS; a session does not require an inbound connection to the instance. The design still needs working DNS, permissions, and connectivity to every service used by your enabled features. [AWS endpoint guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

This example uses Linux EC2, IPv4, one VPC, standard commercial AWS endpoints, and direct connections without a proxy. Start with private subnets that have no public egress path. Preinstall a current SSM Agent in the AMI and attach an instance profile with `AmazonSSMManagedInstanceCore` or equivalent permissions. Prepare extra logging and encryption permissions separately. [Core policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html)

## Choose endpoints from the features you enable

For SSM Agent 3.3.40.0 and later with working `ssmmessages` permissions and connectivity, use `ssm` and `ssmmessages` as the core interface endpoints. Older agents or legacy message delivery can require `ec2messages` in Regions launched before 2024. Regions launched in 2024 and later support only `ssmmessages` for message delivery. Upgrade incompatible agents rather than assuming every Region has three messaging endpoints. [Message endpoint behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

Add dependencies deliberately:

| Feature | Additional private connectivity |
| --- | --- |
| Agent updates, S3 scripts, S3 output, patching artifacts | Regional S3 gateway endpoint for this same-VPC design |
| Session or command output in CloudWatch Logs | `logs` interface endpoint |
| KMS encryption of Session Manager data | `kms` interface endpoint |
| VSS-enabled snapshots | `ec2` interface endpoint |

These service names use the prefix `com.amazonaws.REGION.`. AWS documents the [Systems Manager dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html) and [optional session endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html).

SSM connectivity does not make package repositories reachable. Patch Manager still needs its source repositories; provide private mirrors or another approved private path when public egress is prohibited. [Patching prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-prerequisites.html)

## Set the security groups and subnet rules

Create an endpoint security group in the VPC. For direct connections within this VPC, configure:

- **Node security group:** outbound TCP 443 to the endpoint security group.
- **Endpoint security group:** inbound TCP 443 from the node security group.
- **Node security group for S3:** outbound TCP 443 to the regional S3 managed prefix list when using the gateway endpoint.

New security groups start with an allow-all outbound rule. Adding narrower rules does not restrict that rule: replace it when enforcing restricted node egress, and check every group attached to the node because their permissions combine. Include any other required destinations, such as a custom DNS resolver. [Security group rule defaults](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)

Security groups are stateful, so established response traffic needs no separate return rule. SSM requires no inbound rule on the node. The endpoint's security group applies to its network interfaces, not to the S3 gateway endpoint. [Security group behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html), [S3 network requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)

If node and endpoint traffic crosses subnet boundaries with restrictive network ACLs, allow node-subnet outbound and endpoint-subnet inbound TCP 443. Allow the reverse direction to the node's client ephemeral ports: endpoint-subnet outbound and node-subnet inbound. Scope addresses to the communicating subnets and use the client's actual ephemeral range. ACLs are stateless and evaluated at subnet boundaries. [Network ACL behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html) For S3, allow the corresponding HTTPS and return traffic using regional S3 address ranges; ACLs cannot reference prefix lists. [S3 ACL requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)

## Create the interface endpoints and S3 route

Enable both VPC DNS resolution (`enableDnsSupport`) and DNS hostnames (`enableDnsHostnames`). Choose one endpoint subnet per Availability Zone; two AZs provide redundancy in this example. Endpoint ENIs can serve other reachable subnets in the VPC. Interface endpoints use those private addresses through VPC routing; they do not add gateway-style service routes. [Interface endpoint configuration](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)

From an authorized administrator workstation, replace every example ID. The security group must already have the rules above. Inspect existing endpoints before creating duplicates. This creates billable interface endpoints:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_vpc='vpc-0123456789abcdef0'
ssm_subnet_a='subnet-0123456789abcdef0'
ssm_subnet_b='subnet-0fedcba9876543210'
ssm_endpoint_sg='sg-0123456789abcdef0'

(
  for ssm_service in ssm ssmmessages; do
    aws --profile "$ssm_profile" --region "$ssm_region" ec2 create-vpc-endpoint \
      --vpc-id "$ssm_vpc" --vpc-endpoint-type Interface \
      --service-name "com.amazonaws.${ssm_region}.${ssm_service}" \
      --subnet-ids "$ssm_subnet_a" "$ssm_subnet_b" \
      --security-group-ids "$ssm_endpoint_sg" \
      --ip-address-type ipv4 --private-dns-enabled || exit "$?"
  done
)
```

The subshell stops and returns a failure status if either request fails; it does not roll back an endpoint already created. Resolve errors and inspect existing endpoints before retrying or continuing. Add `logs`, `kms`, or the applicable legacy endpoint to the service list only when needed. For S3, supply the route tables actually associated with the managed-node subnets, including the main route table if a subnet uses it implicitly:

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ec2 create-vpc-endpoint \
  --vpc-id "$ssm_vpc" --vpc-endpoint-type Gateway \
  --service-name "com.amazonaws.${ssm_region}.s3" \
  --route-table-ids rtb-0123456789abcdef0 rtb-0fedcba9876543210
```

The gateway endpoint installs regional S3 prefix-list routes in those tables. Use same-Region buckets; this gateway cannot serve nodes across a VPN, transit gateway, or peered VPC. [Creation flags](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html), [S3 gateway scope](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)

## Keep DNS on the private resolution path

Private DNS makes normal names such as `ssm.us-east-1.amazonaws.com` resolve to interface endpoint addresses. Enabling the endpoint setting is insufficient if the node uses a resolver that never queries the VPC resolver. [Private DNS requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)

For a custom resolver inside the VPC, allow node-to-resolver TCP/UDP 53 and configure conditional forwarding for `amazonaws.com` to the VPC's Amazon DNS server. Avoid forwarding loops. [Systems Manager DNS configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

If the resolver is on premises, forward the applicable domains through a Route 53 Resolver inbound endpoint in the VPC over your private connection. Allow TCP and UDP 53 from the forwarding resolver to that endpoint. An outbound Resolver endpoint handles the opposite direction. [Inbound forwarding](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-overview-forward-network-to-vpc.html)

## Apply endpoint policies alongside IAM

The creation examples leave endpoint access at its full-access default. Where supported, a custom endpoint policy can restrict permitted principals, actions, and resources, but it never replaces node IAM permissions or destination resource policies. Review all applicable policies before restricting production endpoints. [Endpoint policy semantics](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)

Do not assume every service supports custom endpoint policies. Query `describe-vpc-endpoint-services` in your Region and check `VpcEndpointPolicySupported` separately for `ssm`, `ssmmessages`, and each optional service you select. A service without policy support permits full access at the endpoint layer; IAM and resource policies still apply. [Checking endpoint policy support](https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html)

For S3, allow the AWS-managed buckets used by your selected SSM operations as well as your own script and output buckets. Restricting access to only your log bucket can break agent updates or patching. Grant the instance role explicit `s3:GetObject` permissions for the required AWS-managed bucket objects; `AmazonSSMManagedInstanceCore` does not include S3 permissions. Add the permissions needed for your own script and output buckets separately. [Agent S3 dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)

Add node permissions for log delivery and session-data KMS decryption when enabled; the caller needs its own session and KMS permissions. A working network cannot resolve an authorization denial. [Node permission examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

## Verify the node path and enabled features

On the administrator workstation, inspect endpoint state, ENIs, and route associations:

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$ssm_vpc" \
  --query 'VpcEndpoints[].{Service:ServiceName,State:State,PrivateDNS:PrivateDnsEnabled,ENIs:NetworkInterfaceIds,Routes:RouteTableIds}'
```

Require `available` for each selected endpoint. From the node through an existing recovery path or provisioning check, run:

```bash
getent ahostsv4 ssm.us-east-1.amazonaws.com
getent ahostsv4 ssmmessages.us-east-1.amazonaws.com
sudo ssm-cli get-diagnostics --output table
```

Use your actual Region. Compare DNS answers with the interface ENIs' private addresses, and inspect each relevant diagnostic result. `ssm-cli` is included from agent 3.1.501.0; locate its binary if absent from `PATH`. Public S3 DNS answers are normal for a gateway endpoint: its route-table entry determines the path. [Endpoint inspection](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html), [agent diagnostics](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html), [S3 routing](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)

Finally, start a session from an authorized workstation with the Session Manager plugin installed:

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ssm start-session \
  --target i-0123456789abcdef0
```

Verify a usable shell and the configured logging destination after the session. Exercise S3 downloads, agent updates, or patch-repository access separately when those features are required. A shell alone does not prove them. [StartSession requirements](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)

If registration fails, use the [layered SSM investigation](https://oneuptime.com/blog/post/2026-11-19-aws-ssm-targetnotconnected-layered-troubleshooting/view). For an online node whose shell fails, inspect [session channels and preferences](https://oneuptime.com/blog/post/2026-11-19-fleet-manager-online-session-manager-fails/view).
