# Validation Summary: Lambda EFS Mount Failures: VPC Subnets, Mount Targets, and Access Points

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI diagnostic commands.

## Technologies Covered
- AWS Lambda initialization, function versions, VPC configuration, and asynchronous failure destinations
- Amazon EFS mount targets, access points, and file system policies
- AWS IAM execution roles and EFS client permissions
- Amazon VPC subnets, Availability Zones, security groups, routes, and network ACLs
- NFS over TCP 2049 and POSIX directory permissions
- AWS CLI and JMESPath response queries

## Sources Consulted
- [Lambda invocation troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html)
- [Configuring Amazon EFS file system access for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html)
- [EFS VPC security groups and network access](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)
- [EFS IAM access control and default file system policy](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [Enforcing an access-point root directory](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [AWS CLI get-function-configuration](https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html)
- [AWS CLI describe-file-system-policy](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-system-policy.html)
- [AWS CLI describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)
- [Lambda function versions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
- [Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Capturing asynchronous invocation records](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html)
- [EFS mounting with DNS names](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)

## Issues Found
- **Availability Zone coverage understated:** The post described a mount target in every function Availability Zone as an AWS recommendation. Changed this to a Lambda requirement. AWS's Lambda EFS configuration instructions require targets in every connected zone and allow a different subnet only with same-zone NFS reachability. The recommendation to use at least two zones is separate from this coverage requirement.

## Review Notes
- Verified all three CLI operations, option names, response fields, placeholder ID formats, and JMESPath expressions against the AWS CLI reference. The Bash command blocks passed shell syntax checks. No deprecated operation or option was identified.
- Confirmed the distinctions among mount rejection, NFS connectivity failure, and mount timeout, including retry and concurrency guidance.
- Confirmed outbound client and inbound mount-target TCP 2049 rules and the need for return traffic through network ACLs. A diagnostic EC2 instance can test network reachability but cannot establish Lambda execution-role authorization.
- Confirmed that published function configuration is immutable and that a version or alias qualifier can be supplied when retrieving configuration.
- Confirmed ClientMount and ClientWrite permissions, the separate deployment-principal DescribeMountTargets permission, and PolicyNotFound behavior under the default EFS policy. Effective access can be granted through identity or file system policies; the post does not require duplicate grants in both.
- Confirmed access-point directory creation requirements, preservation of existing directory permissions, execute permission for traversal, and the distinction between the server-side root and the Lambda /mnt/ path. CreationInfo describes creation settings rather than current on-disk ownership and permissions; actual existing-directory metadata must be checked through a mounted client when needed.
- Confirmed that environment reuse can conceal fresh-mount problems. Increasing function timeout can help initialization work in applicable lifecycle phases, but does not repair network rules or mount authorization.
- All five AWS documentation links embedded in the post resolved to the intended resources. The author profile link is attribution rather than a technical source.
- Validation was based on official documentation and local syntax checks. No live Lambda invocation, EFS mount, IAM authorization test, or concurrency test was performed; the post uses placeholder resources.
