# Validation Summary: How to Design and Secure a Shared S3 State Store for Multiple kOps Clusters

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- kOps
- Kubernetes
- Amazon S3
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (AWS KMS)
- AWS CloudTrail
- AWS Command Line Interface (AWS CLI)

## Sources Consulted

- [kOps: The State Store](https://kops.sigs.k8s.io/state/)
- [kOps: Getting Started with kOps on AWS](https://kops.sigs.k8s.io/getting_started/aws/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps: Instance IAM Roles](https://kops.sigs.k8s.io/iam_roles/)
- [kOps source: VFS cluster listing](https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/pkg/client/simple/vfsclientset/cluster.go)
- [kOps source: S3 VFS encryption and listing behavior](https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/util/pkg/vfs/s3fs.go)
- [AWS CLI: `s3api create-bucket`](https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html)
- [AWS CLI: `s3api put-public-access-block`](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html)
- [AWS CLI: `s3api put-bucket-ownership-controls`](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-ownership-controls.html)
- [AWS CLI: `s3api put-bucket-versioning`](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html)
- [AWS CLI: `s3api put-bucket-encryption`](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html)
- [Amazon S3: Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [Amazon S3: Controlling Object Ownership and Disabling ACLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html)
- [Amazon S3: Bucket Policy Examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [Amazon S3: Bucket Policy Condition Keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html)
- [Amazon S3: Required Permissions for S3 API Operations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html)
- [Amazon S3: Using SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [Amazon S3: Deleting Object Versions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html)
- [Amazon S3: Managing Object Lifecycles](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [AWS CloudTrail: Understanding CloudTrail Events](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-events.html)
- [AWS IAM: Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

## Issues Found

- The cross-account ACL explanation implied that `KOPS_STATE_S3_ACL=bucket-owner-full-control` should not be combined with an ACL-disabled bucket. S3 accepts uploads with that canned ACL under **Bucket owner enforced**, but ignores the ACL for authorization. The post now states that the setting is accepted but unnecessary in that mode.
- The SSE-KMS permission explanation omitted the additional `kms:Decrypt` permission required for multipart uploads. The post now distinguishes ordinary writes from multipart uploads and reads.
- The IAM policy omitted `s3:GetEncryptionConfiguration`. Current kOps checks the bucket's default encryption configuration before writes and otherwise falls back to requesting SSE-S3. The permission and a short explanation were added so the policy works with the post's default-encryption design, especially when SSE-KMS is enforced.
- The operator example ran `kops get clusters` after presenting a single-prefix `s3:ListBucket` policy. That command recursively lists the state-store root and is denied by the shown prefix condition. The example now uses only direct, named-cluster commands and explains that state-store-wide listing requires a broader inventory role.

## Review Notes

- All five AWS CLI command shapes were validated locally with AWS CLI 2.27.31 using `--generate-cli-skeleton output` and checked against the current AWS CLI reference.
- The post does not pin a kOps version. The review used the current kOps documentation and official source at commit `9ff72bcc87f03d53dec213cd3f6617f9998a8214` dated 2026-08-01.
- The IAM policy remains intentionally labeled as a starting point. Effective cross-account access still requires a matching bucket policy, and SSE-KMS access requires a compatible KMS key policy and principal permissions.
- No deprecated commands or broken documentation links were found.
