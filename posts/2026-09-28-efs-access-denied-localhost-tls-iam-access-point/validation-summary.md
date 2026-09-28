# Validation Summary: EFS Access Denied at 127.0.0.1: TLS, IAM, and Access Points

## Status

validated

## Post Type

Technical troubleshooting guide with Linux shell commands and AWS CLI diagnostics.

## Technologies Covered

- Amazon Elastic File System (EFS), mount targets, and access points
- amazon-efs-utils, NFS, and TLS encryption in transit
- AWS IAM identity policies, file-system policies, and cross-account authorization
- AWS CLI, AWS STS, and EC2 instance profiles
- Linux mount inspection and POSIX ownership and permissions

## Sources Consulted

- [AWS efs-utils README: proxy architecture, mount options, logging, and credential profiles](https://github.com/aws/efs-utils)
- [AWS mount.efs manual: mount helper options and credential sources](https://github.com/aws/efs-utils/blob/master/man/mount.efs.8)
- [AWS EFS: Troubleshooting mount issues](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)
- [AWS EFS: Mounting with IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html)
- [AWS EFS: Using IAM to control access to file systems](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [AWS IAM: Cross-account policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html)
- [AWS EFS: Enforcing a root directory with an access point](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [AWS EFS: Enforcing a user identity using an access point](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [AWS CLI: describe-file-system-policy](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-system-policy.html)
- [AWS CLI: describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)
- [AWS CLI: get-caller-identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [util-linux findmnt manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all four shell examples and the inline STS command. The fenced examples pass Bash syntax checking; AWS CLI flags and response field names match the command references. The resource IDs are illustrative and require replacement with actual resources.
- Confirmed the TLS proxy explanation, helper log location, and combined `tls,iam,accesspoint` options. The linked GitHub section anchors match the current README. TLS alone does not select IAM authentication.
- The distinction between interactive CLI credentials and credentials available to a root-invoked helper is correct. Credential selection depends on the installed helper and execution context; an STS call alone does not prove which identity performed a mount.
- Same-account policy grants, explicit-deny precedence, the default-policy meaning of `PolicyNotFound`, and the distinction between mounting and write authorization are supported by AWS documentation. For direct cross-account access, trust is supplied by the resource policy alongside the caller's identity permissions; role assumption is another supported arrangement.
- Confirmed access-point readiness, directory execute permissions, required creation attributes for a missing root, preservation of existing directory permissions, and the relationship between a root POSIX identity and `ClientRootAccess`.
- `findmnt -T` reports the filesystem containing a path, so its output should be inspected for the expected EFS source and mount target; a successful exit alone does not establish that EFS is mounted there.
- Access-point metadata describes configuration, not the live ownership and mode of an already-existing directory. Those permissions must be checked through authorized filesystem access when investigating an existing root.
- No explicit software version is pinned, and no deprecated command or option was identified. Technical reference links point to the intended official resources.
- Validation was documentation-based with local shell syntax checks. No live AWS mount, IAM evaluation, or application read/write operation was performed. README.md was left unchanged.
