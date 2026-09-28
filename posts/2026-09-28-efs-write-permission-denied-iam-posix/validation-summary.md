# Validation Summary: EFS Write Permission Denied: IAM Authorization vs POSIX UID/GID

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Amazon Elastic File System (EFS), NFS mounts, and access points.
- AWS IAM client authorization and AWS CLI.
- Linux POSIX ownership, directory permissions, root squashing, and umasks.
- GNU coreutils and util-linux diagnostic commands.
- Container identities and Kubernetes security contexts.

## Sources Consulted
- [AWS EFS client authorization and actions](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html).
- [AWS EFS NFS users, groups, permissions, and root squashing](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html).
- [AWS EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html).
- [AWS EFS access-point root directories and creation](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html).
- [AWS EFS mounting with IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html).
- [AWS IAM policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html).
- [AWS CLI describe-access-points reference](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html).
- [util-linux findmnt manual](https://man7.org/linux/man-pages/man8/findmnt.8.html) and [namei manual](https://man7.org/linux/man-pages/man1/namei.1.html).
- GNU coreutils manuals hosted by man7: [stat](https://man7.org/linux/man-pages/man1/stat.1.html), [id](https://man7.org/linux/man-pages/man1/id.1.html), and [ls](https://man7.org/linux/man-pages/man1/ls.1.html).
- Linux system-call and path manuals: [rename](https://man7.org/linux/man-pages/man2/rename.2.html), [path_resolution](https://man7.org/linux/man-pages/man7/path_resolution.7.html), [mkdir](https://man7.org/linux/man-pages/man2/mkdir.2.html), and [umask](https://man7.org/linux/man-pages/man2/umask.2.html).
- [Kubernetes Pod and container security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/).
- [Docker bind mounts and read-only options](https://docs.docker.com/engine/storage/bind-mounts/).
- [Author GitHub profile](https://github.com/nawazdhandala).

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its distinction between successful mounting, IAM write authorization, and POSIX path permissions is accurate.
- Confirmed the meanings of ClientMount, ClientWrite, and ClientRootAccess, the need to consider identity and filesystem policies together, and explicit-deny precedence. IAM authentication requires an appropriately configured EFS mount helper connection; a role policy alone does not authenticate an anonymous mount.
- Confirmed numeric UID/GID ownership checks, the 0755 example, the shared-group 2770 mode, path traversal requirements, and the difference between modifying file contents and renaming directory entries. A restrictive umask affects newly created objects and can explain later workflow failures.
- Confirmed access-point identity replacement, including secondary groups, and the distinction between the enforced user and root-directory CreationInfo. Existing root-directory permissions are not overwritten by creation settings.
- Confirmed root squashing can invalidate tests performed with sudo, and that broad recursive permission or ownership changes can affect other users of a shared filesystem.
- Checked findmnt -T and -o, namei -l, id, GNU stat -c with %n/%u/%g/%a, and ls -ldn/-ln against their manuals. All three Bash code blocks passed bash -n syntax checks.
- The AWS CLI operation, --access-point-id option, response fields, and JMESPath selection are valid. The example access-point ID and paths must be replaced with existing resources; the CLI requires credentials, the correct region, and elasticfilesystem:DescribeAccessPoints permission.
- All four linked AWS documentation pages resolve to the intended subjects, and the author profile resolves. No deprecated command options or version-specific inaccuracies were identified. The stated GNU/Linux assumption is appropriate, particularly for GNU stat syntax.
- Additional diagnostic caveats do not require corrections: access points enforcing UID or GID 0 need ClientRootAccess; sticky directories can impose extra rename restrictions; EFS documents a limit on group IDs carried in NFS requests.
- Validation was based on documentation and shell syntax checks. No live AWS API calls, EFS mounts, application write probes, or permission changes were performed. This review does not establish that any particular production identity or filesystem is correctly configured.
