# EFS Says “Access Denied by Server While Mounting 127.0.0.1:/”: A TLS, IAM, and Access-Point Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, IAM

Description: Diagnose EFS localhost mount rejection by checking helper TLS, the actual IAM credentials, file-system policy conditions, and access-point root readiness.

An EFS mount can fail with an error referring to `127.0.0.1:/` even though the storage lives in AWS. With encryption in transit, the EFS helper places a local proxy between the kernel NFS client and the remote mount target. The loopback address identifies that local hop; it is not evidence that you accidentally selected a local file server. [EFS helper architecture](https://github.com/aws/efs-utils#mount-an-efs-and-s3-file-system)

Treat the message as an authorization investigation after confirming the destination and transport. The following procedure assumes Linux with a supported `amazon-efs-utils` installation and a mount that is intended to use IAM and an access point.

## Preserve the failing command and helper log

```bash
sudo tail -n 100 /var/log/amazon/efs/mount.log
findmnt -T /mnt/efs
```

The second command helps establish whether a previous mount is still present. Do not mount a new filesystem over a busy application directory while troubleshooting. Choose an empty diagnostic mount point if needed.

Read the entire error chain. A preceding DNS error, missing helper dependency, or failed TCP connection needs to be resolved before a policy change will help. AWS lists server rejection separately from mount timeout and access-point directory failures. [EFS mount error categories](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)

## Make the three mount options explicit

```bash
sudo mkdir -p /mnt/efs-check
sudo mount -t efs \
  -o tls,iam,accesspoint=fsap-0123456789abcdef0 \
  fs-0123456789abcdef0:/ /mnt/efs-check
```

Each option has a job: `tls` protects the connection, `iam` authenticates an AWS identity, and `accesspoint` selects the application-specific entry point. TLS alone does not supply IAM authorization. An instance role existing on the machine also does not make a plain NFS mount IAM-authenticated. [Mounting using IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html)

Make sure the access point belongs to the filesystem named in the command. Avoid carrying IDs from a previous region, environment, or recreated filesystem into a new deployment.

## Identify the credentials used by the mount helper

Run `aws sts get-caller-identity` in the intended credential context as a diagnostic, but remember that the interactive AWS CLI and a root-invoked mount helper can use different credential sources. For example, a personal CLI profile does not automatically become the EC2 instance profile used by the helper.

Check the helper's documented credential chain and any explicit profile option. On managed container platforms, identify the role supplied by that platform to the mount operation. Do not paste temporary credentials into `/etc/fstab` or logs. [EFS helper credential configuration](https://github.com/aws/efs-utils#assumed-profile-credentials-for-iam)

## Review grants and explicit denies together

```bash
aws efs describe-file-system-policy \
  --file-system-id fs-0123456789abcdef0 \
  --query Policy --output text
```

Check the file-system ARN, principal, and any access-point or transport condition. A matching explicit deny overrides an allow. Also inspect the client's identity permissions and applicable account controls. In the same account, an allow can come from an identity policy or the filesystem policy; cross-account access needs the corresponding trust and identity permissions. [EFS policy evaluation](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

`PolicyNotFound` has a specific meaning: no custom file-system policy is installed, so the EFS default policy applies. It does not mean that a policy document is damaged. Keep that distinction in incident notes.

## Inspect the access-point directory and identity

```bash
aws efs describe-access-points \
  --access-point-id fsap-0123456789abcdef0 \
  --query 'AccessPoints[0].{State:LifeCycleState,FS:FileSystemId,Identity:PosixUser,Root:RootDirectory}'
```

Verify that the access point is ready and that its enforced UID/GID can traverse its root directory. If the root path does not exist, EFS needs `CreationInfo` with owner UID, owner GID, and permissions to create it. If the path already exists, those creation settings do not overwrite its current ownership or mode. [Access-point root behavior](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

A root identity configured on the access point also interacts with `ClientRootAccess`. Prefer an application-specific nonzero UID/GID unless root is a deliberate requirement. [Access-point user enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)

## Verify both mounting and application access

After a successful mount, read a known file and test an approved write location as the application. A mount can succeed while later writes fail because client write authorization or POSIX permissions are missing. Record the successful principal, access point, mount options, and directory mode. That evidence is more useful than the disappearing localhost error alone.
