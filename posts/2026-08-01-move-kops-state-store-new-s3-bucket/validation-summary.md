# Validation Summary: Moving a kOps State Store to a New S3 Bucket Without Stranding Existing Nodes

## Status
validated

## Post Type
Operational migration guide

## Technologies Covered

- kOps state stores, cluster specifications, instance groups, updates, rolling updates, and validation
- Kubernetes node bootstrapping and controlled node replacement
- Amazon S3 bucket-to-bucket synchronization, versioning, encryption, object integrity, and object ownership
- AWS IAM, cross-account access, and AWS KMS permissions
- AWS CloudTrail S3 data events
- Terraform-managed kOps infrastructure

## Sources Consulted

- [kOps: State Store and Moving State Between S3 Buckets](https://kops.sigs.k8s.io/state/#moving-state-between-s3-buckets)
- [kOps: Cluster Resource](https://kops.sigs.k8s.io/cluster_spec/)
- [kOps: Getting Started on AWS—Cluster State Store](https://kops.sigs.k8s.io/getting_started/aws/#cluster-state-store)
- [kOps: Terraform](https://kops.sigs.k8s.io/terraform/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops get instancegroups`](https://kops.sigs.k8s.io/cli/kops_get_instancegroups/)
- [kOps CLI: `kops edit cluster`](https://kops.sigs.k8s.io/cli/kops_edit_cluster/)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [AWS CLI: `s3 sync`](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [AWS CLI: `get-bucket-versioning`](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-versioning.html)
- [AWS CLI: `get-bucket-encryption`](https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-encryption.html)
- [Amazon S3: Retaining Multiple Versions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [Amazon S3: Checking Object Integrity](https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html)
- [Amazon S3: Using SSE-KMS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [AWS KMS: Allowing Users in Other Accounts to Use a KMS Key](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html)
- [Amazon S3: Enabling CloudTrail Event Logging for S3 Buckets and Objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-cloudtrail-logging-for-s3.html)

## Issues Found

- The cross-account SSE-KMS guidance mentioned only a customer-managed key that trusts external principals. Cross-account KMS access requires authorization in both the KMS key policy and the external principals’ IAM policies, so the text now states both requirements.
- The S3-to-S3 sync examples did not account for source and destination buckets in different AWS Regions. The AWS CLI treats the configured `--region` as the destination Region and otherwise assumes the source is in the same Region, so the post now tells cross-Region users to pass both `--source-region` and `--region` to the copy and verification syncs.
- The update and rollback commands implicitly selected kOps's default direct target. Running those commands for Terraform-managed infrastructure would bypass the normal generated-Terraform workflow, so the post now directs Terraform users to regenerate output with `--target=terraform --out=.`, review it with `terraform plan`, and apply it with `terraform apply`.
- The cutover checklist implied that CloudTrail records S3 object reads automatically. S3 object-level reads are CloudTrail data events and are not logged by default, so the checklist now conditions this check on S3 read data-event logging being enabled.

## Review Notes

- The documented migration order—copy the complete cluster prefix, select the destination state store, update `spec.configBase`, and apply the cloud-resource changes—matches the current kOps state-store documentation.
- The `kops get cluster`, `kops get instancegroups`, `kops edit cluster`, `kops update cluster`, `kops rolling-update cluster`, and `kops validate cluster --wait 10m` command forms and flags are current.
- The Bash parameter guards and S3 URI construction are syntactically valid for the bucket-root values shown. The bucket-inspection commands also use current AWS CLI operations.
- The warnings that `aws s3 sync` does not preserve historical object versions, a second dry run is only a first verification check, and multipart ETags are not necessarily plain MD5 checksums are technically correct.
- The rollback guidance correctly depends on keeping the source copy unchanged and reconciling any legitimate destination-side changes before reverting.
