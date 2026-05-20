# Validation Summary: How to Handle State Management Between Terraform and ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform Kubernetes provider
- Terraform S3 backend and state
- Argo CD
- Kubernetes Secrets and ConfigMaps
- External Secrets Operator
- AWS Secrets Manager

## Sources Consulted
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource exclusions documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator secret ownership documentation: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- Terraform Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider `aws_elasticache_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `state rm` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Kubernetes ConfigMap update documentation: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post described Argo CD `ignoreDifferences` as a way to prevent Argo CD from managing a Secret. Updated the text to explain that the Secret should not be included in the Application manifests, and that `ignoreDifferences` needs `RespectIgnoreDifferences=true` when field-level differences should be respected during sync.
- The resource exclusion example attempted to exclude resources by label. Argo CD resource exclusions match API groups, kinds, and clusters, not individual object labels. Removed the unsupported label selector and clarified that exclusions are global by kind/cluster.
- The Terraform-created Secret example included `argocd.argoproj.io/managed-by`, which is not a general-purpose label for making Argo CD ignore a resource. Removed it.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API shown in current ESO documentation.
- The post said Argo CD reads secrets from the external store. Clarified that Argo CD manages the `ExternalSecret` manifest, while External Secrets Operator reads the external store and writes the Kubernetes Secret.
- The ConfigMap bridge example used `aws_s3_bucket.app_assets.region`. In current AWS provider docs the exported bucket location attribute is `bucket_region`. Updated the example.
- The Terraform S3 backend example used deprecated DynamoDB locking. Updated it to S3 native locking with `use_lockfile = true`.
- The upgrade flow implied Argo CD automatically detects Secret/ConfigMap data changes and syncs applications. Updated the flow and text to explain that ESO refreshes the Secret, file mounts can update eventually, and environment-variable consumers need a Pod restart or rollout.
- The best-practices section recommended preferring Argo CD exclusions over ignore rules. Updated it to warn that exclusions are broad and to use `ignoreDifferences` with `RespectIgnoreDifferences` for field-level separation.

## Review Notes
The overall ownership-boundary guidance is technically sound. The Terraform RDS and ElastiCache examples are illustrative and omit required surrounding infrastructure arguments, which is acceptable because the snippets explicitly use placeholder comments for other configuration.
