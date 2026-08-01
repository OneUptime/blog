# How to Design and Secure a Shared S3 State Store for Multiple kOps Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, Amazon S3, IAM, State Store, Security

Description: Design a shared kOps S3 state store with explicit ownership, least-privilege access, encryption, versioning, and failure-domain controls.

---

kOps can store several cluster definitions in one S3 bucket. That is operationally convenient, especially for centralized inventory or cross-account administration, but the bucket is not ordinary application storage. It is a source of truth that contains cluster configuration and security-sensitive material such as secrets and certificate keys.

Anyone who can rewrite another cluster’s prefix may be able to change the desired infrastructure. Anyone who can permanently delete versions can damage every cluster sharing the bucket. Design the bucket as privileged control-plane infrastructure.

## Decide Whether Sharing Is the Right Boundary

A shared bucket works best when the clusters have the same:

- platform owner and incident-response team;
- access and retention policy;
- compliance boundary;
- AWS partition and compatible encryption design;
- tolerance for a shared S3 or KMS policy mistake.

Use separate buckets when production and non-production administrators differ, when tenants must not enumerate one another’s cluster names, or when a single KMS or bucket-policy error would create too large a blast radius.

kOps places each cluster under its cluster-name path. Use globally unique, stable cluster names such as `prod.eu.example.com` and `staging.eu.example.com`. Do not use the S3 prefix alone as the security boundary: enforce it in IAM and bucket policies.

## Establish Ownership First

Choose one AWS account to own the bucket. Record:

- the bucket name and Region;
- the platform roles allowed to administer it;
- the cluster accounts allowed to access it;
- the encryption key owner, if using SSE-KMS;
- retention and recovery responsibility;
- a break-glass process that is logged and regularly tested.

For a cross-account bucket, prefer S3 Object Ownership with **Bucket owner enforced** and policy-based access. ACLs are disabled in that mode and the bucket owner owns every object. The kOps documentation also describes `KOPS_STATE_S3_ACL=bucket-owner-full-control` for cross-account designs that keep ACLs enabled. With **Bucket owner enforced**, S3 still accepts uploads that specify this canned ACL, but the ACL has no effect on permissions, so the setting is unnecessary.

## Create the Bucket with Recovery Controls

The following example uses a non-`us-east-1` Region. Replace the values before running it:

```bash
STATE_BUCKET=company-kops-state-eu-west-1
STATE_REGION=eu-west-1

aws s3api create-bucket \
  --bucket "${STATE_BUCKET}" \
  --region "${STATE_REGION}" \
  --create-bucket-configuration "LocationConstraint=${STATE_REGION}"

aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

aws s3api put-bucket-ownership-controls \
  --bucket "${STATE_BUCKET}" \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

For `us-east-1`, omit `--create-bucket-configuration`. kOps strongly recommends S3 Versioning so previous state can be recovered. S3 also encrypts new uploads with SSE-S3 by default, but declaring default encryption makes the control visible and auditable.

Use SSE-KMS when key-policy control or compliance requires it. Cross-account SSE-KMS needs a customer-managed key and permissions on both the S3 bucket and KMS key. Writers need `kms:GenerateDataKey`; multipart uploads also require `kms:Decrypt`, as do readers. Test node bootstrap as well as administrator access before making the KMS policy mandatory.

## Separate Human, Automation, and Node Access

Do not give every principal `AmazonS3FullAccess` simply because the introductory kOps setup uses it. Define roles by workflow:

| Principal | Typical need |
| --- | --- |
| Read-only inventory | List authorized prefixes and read their objects |
| Cluster operator | Read and update only assigned cluster prefixes |
| Lifecycle administrator | Create/delete clusters and recover object versions |
| kOps-managed nodes | Bootstrap access generated for that cluster |
| Break glass | Time-limited broader access with strong audit controls |

The following identity-policy skeleton illustrates prefix isolation for one cluster. Treat it as a starting point: exact calls can vary by kOps release, cloud target, and operation, so verify denied calls in CloudTrail before production use.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadBucketMetadata",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:GetEncryptionConfiguration"
      ],
      "Resource": "arn:aws:s3:::company-kops-state-eu-west-1"
    },
    {
      "Sid": "ListOnlyOneClusterPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::company-kops-state-eu-west-1",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "prod.eu.example.com",
            "prod.eu.example.com/*"
          ]
        }
      }
    },
    {
      "Sid": "ManageOneClusterPrefix",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::company-kops-state-eu-west-1/prod.eu.example.com/*"
    }
  ]
}
```

kOps checks the bucket's default encryption configuration before writing state. The `s3:GetEncryptionConfiguration` permission lets it detect and honor that configuration.

With versioning enabled, `DeleteObject` normally adds a delete marker; principals with `s3:DeleteObjectVersion` can permanently remove a specific version. Reserve that latter permission for recovery or retention administrators rather than normal cluster automation.

For a platform role that manages several clusters, enumerate the allowed prefixes. Avoid a bucket-wide object wildcard unless the role genuinely owns every cluster in the bucket.

## Add Bucket-Level Denials Carefully

A state bucket should reject public access and plaintext transport. A common bucket-policy control denies requests where `aws:SecureTransport` is `false`. If SSE-KMS is mandatory, the bucket policy can also deny uploads that do not use the approved key.

Test explicit denies in a staging bucket first. A malformed resource ARN or KMS condition can prevent nodes from bootstrapping, and an explicit deny overrides an allow from another policy.

When granting another account access, grant a specific role ARN rather than the whole account where possible. The kOps cross-account example explains the required bucket relationship, but its broad `s3:*` example is not a least-privilege production policy.

## Keep State and Public OIDC Documents Separate

The kOps AWS guide recommends a separate bucket for the OIDC discovery documents used by IAM Roles for Service Accounts. Those documents may need public readability for AWS STS in the documented design. The kOps state store must remain private.

Reusing the state bucket and weakening public-access controls to publish OIDC documents creates an unnecessary coupling. Separate buckets let the state store keep all four S3 Block Public Access settings enabled.

## Design Recovery, Not Just Prevention

Versioning makes an ordinary delete recoverable because S3 creates a delete marker rather than erasing the prior version. It does not help if a principal can permanently delete versions, a lifecycle rule expires them too quickly, or the owning account is compromised.

Operational controls should include:

- alerts on bucket-policy, versioning, encryption, and public-access changes;
- CloudTrail management events and, where justified, S3 data events;
- a documented process for inspecting and restoring prior versions;
- retention for noncurrent versions that matches recovery objectives;
- periodic access reviews for every cross-account principal;
- recovery exercises using a non-production cluster prefix.

Remember that S3 lifecycle processing is not blocked by an ordinary bucket-policy deny. Review lifecycle rules separately before attaching them to a shared state bucket.

## Make Cluster Selection Explicit

Operators should set the shared bucket once and always name the target cluster. A role with bucket-wide inventory permission can run `kops get clusters`, but that command will not work with the single-prefix listing policy shown above because it lists the state-store root.

```bash
export KOPS_STATE_STORE=s3://company-kops-state-eu-west-1

kops get cluster prod.eu.example.com -o yaml
kops update cluster prod.eu.example.com
```

The final command is intentionally a preview. Require review before adding `--yes`, especially when one role can reach several prefixes.

A secure shared state store is therefore more than one encrypted bucket. It is an ownership boundary, a prefix authorization model, a recovery system, and an operator workflow that makes the selected cluster unmistakable.

## Official Documentation

- [kOps: The State Store](https://kops.sigs.k8s.io/state/)
- [kOps: Getting Started on AWS-State and OIDC Stores](https://kops.sigs.k8s.io/getting_started/aws/#cluster-state-store)
- [Amazon S3: Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [Amazon S3: Blocking Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [Amazon S3: Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [Amazon S3: Using SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [Amazon S3: Deleting Objects and Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjects.html)
