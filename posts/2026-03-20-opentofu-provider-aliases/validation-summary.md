# Validation Summary: Using Provider Aliases in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform (HCL configuration language)
- AWS provider (`hashicorp/aws`)
- AWS S3 cross-region replication (`aws_s3_bucket_replication_configuration`)
- AWS RDS cross-region read replicas (`aws_db_instance` with `replicate_source_db`)
- AWS IAM `assume_role` for cross-account deployments
- Kubernetes provider with EKS data sources (`aws_eks_cluster`, `aws_eks_cluster_auth`)
- Module `configuration_aliases` mechanism

## Sources Consulted
- OpenTofu provider configuration docs — alias / multiple provider configurations: https://opentofu.org/docs/language/providers/configuration/#alias-multiple-provider-configurations
- OpenTofu module providers documentation (passing providers into modules, `configuration_aliases`)
- AWS provider docs for `aws_s3_bucket_replication_configuration` (post-v4.0 split-out resource)
- AWS provider docs for `aws_db_instance.replicate_source_db` (cross-region vs same-region behavior)
- AWS provider docs for `assume_role` block fields
- Kubernetes provider docs for `host`, `cluster_ca_certificate`, `token`, `alias`
- Canonical EKS-with-Kubernetes-provider wiring pattern using `aws_eks_cluster` / `aws_eks_cluster_auth`

## Issues Found
No technical issues found. Every code snippet was verified:

- Provider alias declaration (`alias = "..."`) and reference (`provider = aws.<name>`) — correct.
- `configuration_aliases = [aws.replica]` inside `required_providers` — correct syntax for declaring expected aliased providers in a module.
- The `providers = { aws = aws, aws.replica = aws.replica }` map in the calling module is correctly comprehensive: when an explicit `providers` block is used, it overrides default inheritance, so listing both the default and aliased providers is required (not optional).
- `aws_s3_bucket_replication_configuration` resource structure (`bucket`, `role`, `rule { id, status, destination { bucket, storage_class } }`) — correct for AWS provider v4.0+.
- `replicate_source_db = aws_db_instance.primary.arn` — correct for cross-region replicas (eu-central-1 → us-east-1 in the example), where ARN is required (identifier is only valid same-region).
- `assume_role` block fields `role_arn` and `session_name` — correct.
- Kubernetes provider configuration with `host`, `cluster_ca_certificate = base64decode(...)`, and `token` from EKS data sources — canonical and correct.

## Review Notes
- The S3 replication snippet is illustrative and (correctly) focuses on the provider-alias mechanics; in a real deployment, source and destination buckets must have versioning enabled (`aws_s3_bucket_versioning`) for the replication configuration to be valid. This omission is reasonable given the post's scope.
- For encrypted cross-region RDS read replicas, a `kms_key_id` is also required in the destination region — out of scope here, but worth noting if readers extend the example.
- Kubernetes provider: when using `token`, do not also configure an `exec` block on the same provider (they are mutually exclusive auth methods). The post does not mix them, so this is fine.
- The `arn:aws:iam::PROD_ACCOUNT_ID:role/TerraformDeployRole` placeholder is clearly marked and acceptable for tutorial purposes; readers should substitute a real 12-digit AWS account ID.
- Version constraint `>= 4.0` for the AWS provider is consistent with usage of the split-out `aws_s3_bucket_replication_configuration` resource (introduced in v4.0).
