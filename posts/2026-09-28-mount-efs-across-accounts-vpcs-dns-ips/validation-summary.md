# Validation Summary: How to Mount EFS Across AWS Accounts or VPCs with Peering, Resolver Rules, and Mount-Target IPs

## Status
validated

## Post Type
Technical guide with AWS CLI commands and an EFS mount example.

## Technologies Covered
- Amazon Elastic File System (EFS), mount targets, and access points
- AWS CLI and JMESPath queries
- Amazon VPC peering, AWS Transit Gateway, routing, security groups, and network ACLs
- Availability Zone names and IDs
- Route 53 Resolver endpoints, forwarding rules, and private hosted zones
- amazon-efs-utils, TLS, NFS, and botocore discovery
- AWS IAM identity policies and EFS file-system policies

## Sources Consulted
- [EFS cross-account and cross-VPC access](https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-vpc-peering.html)
- [Cross-account access within a shared VPC](https://docs.aws.amazon.com/efs/latest/ug/mount-fs-diff-account-same-vpc.html)
- [Cross-VPC mounting tutorial](https://docs.aws.amazon.com/efs/latest/ug/efs-different-vpc.html)
- [Cross-VPC mount prerequisites and discovery permissions](https://docs.aws.amazon.com/efs/latest/ug/mount-fs-different-vpc.html)
- [AWS CLI: describe-subnets](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html)
- [AWS CLI: describe-mount-targets](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-mount-targets.html)
- [AWS-maintained efs-utils README: mount options, crossaccount prerequisites, and botocore fallback](https://github.com/aws/efs-utils#mount-an-efs-and-s3-file-system)
- [VPC peering route tables](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)
- [VPC peering limitations](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html)
- [EFS security groups and network ACL considerations](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)
- [Resolver outbound forwarding](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html)
- [Resolver inbound endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html)
- [AWS re:Post: EFS mounting and cross-VPC Resolver configuration](https://repost.aws/knowledge-center/fargate-unable-to-mount-efs) — relevant AWS search excerpts checked; full-page retrieval returned HTTP 403.
- [EFS DNS behavior and prerequisites](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)
- [IAM authorization and EFS client actions](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS resource policy examples, including access-point conditions](https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html)
- [EFS access points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html)

## Issues Found
- **Access-point permission scoping was ambiguous.** The instruction to scope permissions to both the filesystem ARN and the access-point ARN could be interpreted as putting an access-point ARN in the client-action policy's Resource field. Updated the sentence to keep the destination filesystem ARN as the resource and explicitly use the `elasticfilesystem:AccessPointArn` condition key to restrict access to an access point. AWS's policy examples use this structure. No commands or sections needed changing.

## Review Notes
- Both AWS CLI operations, their flags, and the queried response fields match the current command references. The JMESPath expressions select the intended subnet zone information and mount-target zone ID, IPv4 address, and lifecycle state.
- The mount example combines supported `tls`, `iam`, `accesspoint`, `mounttargetip`, and `region` options. IAM authorization and access-point mounts require TLS. The example values must be replaced with real resources, including an available access point belonging to the destination file system and credentials accessible to the mount helper.
- Confirmed routing in both directions, nontransitive VPC peering, TCP 2049 security-group requirements, and the need to consider stateless network ACL return traffic. Availability Zone IDs are the appropriate cross-account comparison.
- Shared-VPC DNS access is supported. Across separate VPCs, hosts entries, private DNS records, Resolver forwarding, and API-based discovery have different operational prerequisites. Forwarding does not preserve the original client's zone selection; the post correctly calls for testing returned addresses in each client zone.
- The helper's `crossaccount` workflow requires its documented zone-ID-based DNS setup. Botocore discovery requires API credentials and discovery permissions, distinct from client data-access authorization.
- IAM client permissions do not replace POSIX file and directory permissions or the access point's configured identity and root-directory behavior. The application-level read/write probe remains necessary.
- All documentation links embedded in the post resolved to relevant resources; the efs-utils section anchor matches the current README heading. No obsolete command options or explicit version claims required correction.
- All three Bash code blocks passed `bash -n`. This was a documentation and syntax review, not a live deployment: no AWS resources were created, no mount was executed, and reboot, routing, DNS, and application read/write behavior were not integration-tested.
