# Validation Summary: How to Handle Resource Timeouts in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider resources
- Kubernetes Provider resources
- Google Cloud Provider resources
- Infrastructure as Code resource lifecycle timeouts

## Sources Consulted
- OpenTofu resource block operation timeouts: https://opentofu.org/docs/language/resources/syntax/#operation-timeouts
- OpenTofu `apply` command and `-refresh-only` planning mode: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `state show` command: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `state rm` command: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu `import` command: https://opentofu.org/docs/cli/commands/import/
- AWS provider `aws_db_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_eks_cluster` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- AWS provider `aws_rds_cluster` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown
- AWS provider `aws_elasticache_replication_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_replication_group.html.markdown
- AWS provider `aws_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_ami` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ami.html.markdown
- AWS provider `aws_db_snapshot` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_snapshot.html.markdown
- AWS Aurora PostgreSQL 15.17 release announcement: https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-aurora-postgresql-17-9-16-13-15-17-14-22/
- Kubernetes provider `kubernetes_deployment` source schema: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/resource_kubernetes_deployment_v1.go
- Kubernetes provider `kubernetes_persistent_volume_claim` source schema: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/resource_kubernetes_persistent_volume_claim_v1.go
- Google provider `google_container_cluster` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown
- Google provider `google_sql_database_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/sql_database_instance.html.markdown

## Issues Found
- The `aws_db_instance` examples omitted required database credentials. Added `username` and `password` arguments to the basic and environment-specific examples.
- The `aws_db_instance` examples configured delete timeouts but did not configure deletion behavior for final snapshots. Added `skip_final_snapshot = true` so the delete examples can complete as written.
- The RDS example used `aws_rds_cluster` while the comment described an RDS instance. Updated the comment to say RDS cluster.
- The Aurora PostgreSQL example pinned `engine_version = "15.3"`, an old minor version. Updated it to `15.17`, which AWS announced as supported on April 7, 2026.
- The `aws_rds_cluster` example configured a delete timeout but did not configure final snapshot behavior. Added `skip_final_snapshot = true`.
- The GKE and Cloud SQL examples configured delete timeouts without accounting for current Google provider deletion protection behavior. Added `deletion_protection = false` to both examples.
- The timeout recovery section said OpenTofu marks the resource as tainted whenever a timeout is exceeded. Updated this to say OpenTofu returns an operation error and clarified that users should check state, refresh tracked resources, import existing untracked objects, or remove state only when OpenTofu is tracking an object that should be forgotten.
- The provider-specific example claimed `aws_ami` only supports `create` timeouts and that `delete` is unsupported. Current AWS provider docs show `aws_ami` supports `create`, `update`, and `delete`, so the example was replaced with `aws_db_snapshot`, which documents only a `create` timeout.

## Review Notes
The examples remain illustrative and omit surrounding provider configuration, credentials, IAM roles, networking, and variable declarations. The Kubernetes deployment and PVC timeout examples match the provider schema; PVC creation waits for `Bound` by default through `wait_until_bound = true`.
