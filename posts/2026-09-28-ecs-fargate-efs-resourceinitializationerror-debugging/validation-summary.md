# Validation Summary: ECS Fargate Cannot Mount EFS: Debugging `ResourceInitializationError`, DNS, Task Security Groups, and IAM

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI commands and an ECS task-definition JSON fragment.

## Technologies Covered
- Amazon ECS and Linux AWS Fargate
- Amazon EFS, mount targets, access points, and NFS
- Amazon VPC, DNS, task ENIs, security groups, and network ACLs
- AWS IAM task roles, execution roles, and filesystem policies
- AWS CLI, JMESPath, JSON, and POSIX permissions

## Sources Consulted
- [ECS ResourceInitializationError troubleshooting](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/resource-initialization-error.html)
- [EFS volumes in ECS: platform support and supervisor container](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html)
- [AWS CLI: ecs describe-tasks](https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-tasks.html)
- [AWS CLI: ec2 describe-network-interfaces](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html)
- [ECS task lifecycle and ENI deprovisioning](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html)
- [Fargate task networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html)
- [EFS DNS selection and prerequisites](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)
- [EFS mount target creation and One Zone restrictions](https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-create-delete-mount-targets.html)
- [EFS security groups and network ACL requirements](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)
- [ECS EFS task-definition configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html)
- [ECS MountPoint API](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_MountPoint.html)
- [ECS task execution IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
- [EFS IAM authorization and client actions](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS access-point root directory requirements](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

## Issues Found
1. **Stopped-task ENI availability:** The instructions assumed the failed task's ENI could still be described. ECS detaches and deletes task ENIs during deprovisioning. Qualified the command and provided a fallback using the saved subnet, launch security groups, and a fresh diagnostic task.
2. **One Zone mount target limitation:** The multi-zone target advice did not distinguish Regional from One Zone filesystems. One Zone permits only one target in the filesystem's zone. Scoped the multi-zone recommendation to Regional EFS and clarified same-zone placement for the ordinary filesystem DNS approach.
3. **IAM policy evaluation:** The wording implied that both the task identity policy and the filesystem policy must grant access. Clarified that, for same-account access, either can supply the allow, subject to applicable explicit denies and policy conditions. Added the official EFS authorization reference.
4. **Write failures after initialization:** The original sentence treated these as necessarily client-write or POSIX authorization problems. Qualified the diagnosis and included the container mount point's read-only setting as another cause.

## Review Notes
- Confirmed EFS support on Linux Fargate platform version 1.4.0 and later, the managed supervisor, and use of the task IAM role for EFS IAM authorization. Installing mount utilities in the application image does not change the supervisor-managed startup mount.
- Checked both CLI operations, arguments, and selected response fields against official AWS CLI documentation. Both shell blocks passed `bash -n`; both JMESPath expressions compiled successfully with JMESPath 1.0.1.
- Parsed the JSON example successfully. Its EFS field names and values are current; access points require omitted or `/` rootDirectory and enabled transit encryption. The post correctly identifies the example as a fragment requiring a container mountPoints entry.
- Confirmed TCP 2049 direction, task ENI networking, return-traffic ACL requirements, same-zone DNS target selection, and access-point directory creation behavior. Same-VPC private EFS traffic does not inherently require NAT.
- Confirmed that existing access-point root directory permissions are not overwritten by creation defaults. IAM ClientMount and ClientWrite permissions serve different purposes, and POSIX permissions still apply.
- The five original AWS documentation links resolved to the intended resources. The author profile link is attribution, not a technical source.
- Examples contain placeholder resource IDs and require the appropriate AWS account, credentials, and Region. No live AWS tasks or EFS mounts were created; validation consisted of official-documentation review and local syntax checks.
- DNS troubleshooting could additionally name the VPC DNS support/hostname settings and Amazon-provided DNS prerequisite in a future expansion. This is an optional detail, not a reason to restructure this post.
