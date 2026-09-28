# EFS Is Mounted but Writes Return “Permission Denied”: Separating IAM Authorization from POSIX UID/GID Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Linux

Description: Separate EFS client write authorization from numeric POSIX identities, directory modes, access-point enforcement, and root squashing.

A successful EFS mount proves that a client established access to the filesystem. It does not prove that a particular application can create, replace, or delete a file. Diagnose a write failure in layers: the mount's read-only state, EFS client authorization, the server-side numeric identity, and the permissions on the exact path.

Use a nonproduction scratch directory or an approved application test location for write probes. The commands below assume GNU/Linux and a mount at `/mnt/efs`.

## Confirm the application reaches the expected mount

```bash
findmnt -T /mnt/efs -o TARGET,SOURCE,FSTYPE,OPTIONS
id
stat -c '%n uid=%u gid=%g mode=%a' /mnt/efs /mnt/efs/uploads
namei -l /mnt/efs/uploads
```

Look for `ro` in the mount options and check container volume configuration for a read-only flag. Check the application path itself; a typo can lead to a local directory with entirely different ownership. An error such as `Read-only file system` deserves a different first response from `Permission denied`.

Run `id` in the application process's environment, not only in an administrator shell. Container users, supplementary groups, and service-manager settings can differ from interactive sessions.

## Check EFS client actions independently

With IAM authorization, `ClientMount` allows mounting/read access, `ClientWrite` permits writes, and `ClientRootAccess` controls root access. A read-only IAM grant can therefore allow the mount but reject modification. Review both the effective identity permissions and the filesystem policy, including explicit denies. [EFS client actions](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

Do not replace a narrowly scoped policy with `elasticfilesystem:*` to investigate a missing write action. Identify the filesystem ARN, authenticated role, and access-point condition first. If this client was mounted without `iam`, adding an IAM allow to its role does not authenticate the existing anonymous connection. Correct the mount configuration and test a fresh connection.

## Compare numeric ownership, not usernames

EFS applies POSIX permissions using numeric user and group IDs. Two hosts can both have a user named `app` while assigning it different UIDs. Conversely, different usernames can refer to the same numeric identity. Use numeric output when comparing machines:

```bash
ls -ldn /mnt/efs/uploads
ls -ln /mnt/efs/uploads/example.txt
```

For example, a directory owned by UID 1001 with mode `0755` permits its owner to create entries; UID 2001 generally cannot create entries through the other permission bits. A directory intended for a shared application group might use a carefully assigned group and `2770`, but the correct mode depends on the application's collaboration model. [EFS NFS permissions](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html)

File writes and directory changes are distinct. Replacing a file atomically usually creates a temporary file and renames it, which needs write and execute permissions on the parent directory. A process may be able to modify an existing file in place yet fail to save through its editor's rename workflow. Check every directory component for traversal permission.

## Account for access-point identity enforcement

```bash
aws efs describe-access-points \
  --access-point-id fsap-0123456789abcdef0 \
  --query 'AccessPoints[0].{User:PosixUser,Root:RootDirectory}'
```

An access point with a configured POSIX user replaces the NFS client's UID/GID with its configured identity. In that case, changing the container's `runAsUser` alone will not change the identity EFS checks. Inspect the access-point UID, primary group, secondary groups, and directory ownership together. [Enforced access-point identities](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)

Also distinguish the enforced user from `RootDirectory.CreationInfo`. Creation information initializes a missing root directory; it does not continually reconcile an existing directory's mode. A directory copied from another system may retain ownership inconsistent with the new access point. [Access-point directory creation](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

## Avoid using root as the only test

A shell running as root can be mapped to an unprivileged identity when root access is not authorized. This can make `sudo touch` fail even when the intended nonroot application user is correctly configured. Conversely, an administrator with root access can pass a test that the application fails. Test with the production identity and use an authorized maintenance mount for any ownership repairs.

Repair only the intended directories. A recursive `chmod 777` destroys useful access boundaries and can hide the real mismatch. Likewise, recursive ownership changes across a shared filesystem can break other tenants.

## Test the application's actual operation

Create a uniquely named file, write content, close it, reopen it, rename it, and remove it in the target directory. For a read-only application, test only the intended reads. Run the probe through the same container, access point, and role as production.

If simple writes pass but an application still fails, capture the exact failing system call and path. Temporary-file placement, group inheritance, restrictive umasks, or a second mount can explain the difference. The repair is complete when the real file workflow succeeds under the intended identity.
