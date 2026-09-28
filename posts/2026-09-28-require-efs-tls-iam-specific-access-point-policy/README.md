# How to Require `tls`, `iam`, and a Specific EFS Access Point in a File-System Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, IAM

Description: Build an EFS policy that rejects unencrypted and wrong-access-point connections while requiring authenticated access through explicit principal grants.

A mount command containing `tls,iam,accesspoint=...` expresses the client's intent. A file-system policy determines whether clients can take another route. To enforce the intended design, distinguish encryption, authentication, and directory access: these are separate controls and need separate checks.

The example below assumes one application role and one nonroot access point. Substitute the account, region, filesystem ID, role, and access-point ID consistently. Preserve existing policy requirements when adapting it to a shared filesystem.

## Understand what the policy can inspect

EFS exposes `aws:SecureTransport` and `elasticfilesystem:AccessPointArn` for NFS client policy conditions. It does not expose a condition named `iam`. Authentication is required by granting access only to authenticated principals and leaving anonymous clients without an allow. The helper supplies that identity when mounted with `iam`. [EFS client authorization and supported conditions](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

Do not rely on an allow condition alone to prohibit alternative access paths. In the same account, a separate identity-based allow can grant access. Explicit deny statements make the TLS and access-point constraints apply even when another identity policy grants client permissions.

## Define the filesystem policy

Save this as `efs-policy.json` in your configuration workspace:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedClientAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "elasticfilesystem:Client*",
      "Resource": "arn:aws:elasticfilesystem:us-east-1:111122223333:file-system/fs-0123456789abcdef0",
      "Condition": {"Bool": {"aws:SecureTransport": "false"}}
    },
    {
      "Sid": "DenyOtherOrMissingAccessPoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "elasticfilesystem:Client*",
      "Resource": "arn:aws:elasticfilesystem:us-east-1:111122223333:file-system/fs-0123456789abcdef0",
      "Condition": {
        "StringNotEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:111122223333:access-point/fsap-0123456789abcdef0"
        }
      }
    },
    {
      "Sid": "AllowApplicationReadWrite",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::111122223333:role/reporting-app"},
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:111122223333:file-system/fs-0123456789abcdef0",
      "Condition": {
        "Bool": {"aws:SecureTransport": "true"},
        "StringEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:111122223333:access-point/fsap-0123456789abcdef0"
        }
      }
    }
  ]
}
```

The two deny conditions are deliberately separate statements. Putting both into one condition block would require both to match, accidentally permitting some noncompliant connections. The negated string comparison also matches a request missing the access-point key, so a direct root mount is rejected. [IAM condition operator behavior](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html)

This policy grants the named role read/write access and grants no anonymous access. It does **not** make that role the exclusive possible authenticated role: another same-account role with its own applicable identity allow can still access through the required access point over TLS. Review identity policies if role exclusivity is also a requirement. Cross-account roles need corresponding identity-side permissions. [EFS policy examples](https://docs.aws.amazon.com/efs/latest/ug/security_iam_resource-based-policy-examples.html)

The example does not grant `ClientRootAccess`. It also does not globally deny root access that another identity policy might allow. Use a nonzero enforced access-point identity and review root grants separately if preventing root access is part of the requirement.

## Prepare the access point before applying the policy

Inspect its filesystem association, enforced UID/GID, and root path:

```bash
aws efs describe-access-points \
  --access-point-id fsap-0123456789abcdef0
```

A missing root directory needs ownership and permissions in its creation configuration. An existing root retains its existing permissions. The enforced identity must be able to traverse the directory and perform the required application operations. [Access-point root requirements](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

Export any current custom policy first, review the replacement, and apply it through the same infrastructure workflow that owns the filesystem. For a CLI-managed example:

```bash
aws efs put-file-system-policy \
  --file-system-id fs-0123456789abcdef0 \
  --policy file://efs-policy.json
```

Keep administrative EFS API permissions available for rollback. Client access restrictions and permission to change the resource policy are different concerns.

## Test fresh connections, including failures

Use the application role on a disposable Linux client:

```bash
sudo mount -t efs \
  -o tls,iam,accesspoint=fsap-0123456789abcdef0 \
  fs-0123456789abcdef0:/ /mnt/efs-check
```

Verify a read and an approved write under the application identity. Then use separate fresh mounts to test the denied cases:

| Connection attempt | Expected outcome |
| --- | --- |
| Required role, TLS, IAM, required access point | Allowed if POSIX permissions also permit |
| TLS and required access point, without IAM | Denied because anonymous access has no allow |
| TLS and IAM, without an access point | Explicitly denied |
| TLS and IAM, another access point | Explicitly denied |
| Unencrypted direct NFS mount | Explicitly denied |

Do not infer policy correctness from an already established mount. Record the actual mount options and identity for each test. Keep the negative cases in a deployment checklist so a later broad policy statement cannot quietly restore anonymous access.
