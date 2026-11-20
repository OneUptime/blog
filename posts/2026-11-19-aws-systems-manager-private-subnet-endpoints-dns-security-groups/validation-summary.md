# Validation Summary: AWS Systems Manager in Private Subnets: VPC Endpoints, DNS, and Security

## Status

validated

## Post Type

Technical guide with AWS CLI commands and networking implementation details.

## Technologies Covered

- AWS Systems Manager, SSM Agent, Session Manager, Run Command, and Patch Manager
- Amazon EC2, IAM instance profiles, and endpoint policies
- Amazon VPC, AWS PrivateLink interface endpoints, and S3 gateway endpoints
- Security groups, network ACLs, IPv4 routing, and DNS
- Route 53 Resolver inbound and outbound endpoints
- Amazon S3, CloudWatch Logs, and AWS KMS
- AWS CLI, Bash, Linux getent, and ssm-cli

## Sources Consulted

- [AWS endpoint guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [Core policy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html)
- [Message endpoint behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [optional session endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
- [Patching prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-prerequisites.html)
- [Security group rule defaults](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)
- [Security group behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [S3 network requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- [Network ACL behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Interface endpoint configuration](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)
- [Creation flags](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html)
- [Inbound forwarding](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-overview-forward-network-to-vpc.html)
- [Endpoint policy semantics](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [Checking endpoint policy support](https://docs.aws.amazon.com/vpc/latest/privatelink/aws-services-privatelink-support.html)
- [Agent S3 dependencies](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)
- [Node permission examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [Endpoint inspection](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html)
- [agent diagnostics](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html)
- [StartSession requirements](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [Linux getent(1) manual](https://man7.org/linux/man-pages/man1/getent.1.html)
- [Session-data KMS encryption](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-enable-encryption.html)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the README against official AWS service and CLI documentation. No README edits were necessary.
- Confirmed SSM Agent 3.3.40.0 message-endpoint precedence and the restriction of ec2messages to Regions launched before 2024. The two core endpoints are appropriate under the post's stated agent, permission, and connectivity assumptions.
- Confirmed feature-specific S3, Logs, KMS, and EC2 endpoint dependencies. The VSS entry describes a Windows feature; the worked example itself remains Linux. Patch repositories require separate reachable sources as stated.
- Confirmed security-group references, combined permissions, default outbound access, stateful responses, and stateless subnet ACL return rules. S3 prefix lists are usable in security groups but not ACL rules.
- Confirmed private-DNS prerequisites, one endpoint subnet per AZ, interface ENI addressing, custom DNS forwarding, and inbound Resolver TCP/UDP 53 requirements. S3 gateway routing uses regional prefix-list routes and cannot be extended outside its VPC.
- Confirmed full-access endpoint defaults, per-service endpoint-policy support discovery, and the distinction between endpoint policies and IAM/resource policies. The core managed policy lacks S3 permissions; AWS documents explicit role permissions for managed S3 buckets when using VPC endpoints.
- Checked create-vpc-endpoint flags, endpoint inspection filters and output fields, and start-session target syntax and plugin requirements. All five Bash blocks passed bash -n. The subshell's failure handling is correct and does not roll back prior successful requests.
- Confirmed getent ahostsv4 performs IPv4 name resolution and ssm-cli get-diagnostics --output table is supported from agent 3.1.501.0. getent follows the host's Name Service Switch configuration, so local overrides can affect answers; comparing returned addresses with endpoint ENIs is appropriate.
- AWS documentation links resolved to the expected resources, and the author link resolved to the expected GitHub profile. The browser tool could not retrieve either related OneUptime article URL. Both corresponding README files exist locally and the URL slugs match them; live publication availability remains unverified.
- This was a documentation review and local shell-syntax check. No AWS resources were provisioned and no live sessions, DNS resolution from a managed node, IAM authorization, logging, or patching workflows were exercised. Actual deployment still requires replacing placeholders and performing the verification steps in the post.
