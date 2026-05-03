# Validation Summary: How to Deploy Databricks Workspaces with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Databricks (multi-workspace E2 architecture on AWS)
- Databricks Terraform provider (`databricks/databricks`)
- AWS provider (`hashicorp/aws`)
- AWS IAM (cross-account roles)
- AWS S3 (workspace root storage)
- AWS VPC, subnets, security groups (customer-managed VPC injection)
- Databricks cluster policies and clusters
- Apache Spark (Databricks Runtime)

## Sources Consulted
- Databricks Terraform provider registry: https://registry.terraform.io/providers/databricks/databricks/latest/docs
- `databricks_mws_networks` resource docs
- `databricks_mws_credentials` resource docs
- `databricks_mws_storage_configurations` resource docs
- `databricks_mws_workspaces` resource docs
- `databricks_cluster_policy` and `databricks_cluster` resource docs
- Databricks cluster policy definition reference: https://docs.databricks.com/aws/en/admin/clusters/policy-definition
- Databricks AWS cross-account IAM setup guide (Databricks AWS account ID `414351767826`)
- Databricks Runtime release notes / supported version matrix
- Terraform pessimistic version constraint operator (`~>`) semantics

## Issues Found

1. **Outdated Databricks Runtime version (`13.3.x-scala2.12`)** — Databricks Runtime 13.3 LTS reaches end-of-support in August 2026, making it a poor choice for a March 2026 tutorial. Updated both occurrences (the `spark_version` in the cluster policy `definition` and the `spark_version` on the `databricks_cluster` resource) to `15.4.x-scala2.12`, which is a current LTS release supported through August 2027.

2. **Severely outdated Databricks provider version constraint (`~> 1.36`)** — The Databricks Terraform provider has had many minor releases since 1.36 (current is 1.114.x as of April 2026). The `~> 1.36` constraint in Terraform pins the provider to the 1.x series but pessimistically allows newer 1.y releases; however, pinning to `1.36` as the floor signals stale guidance to readers. Updated the constraint to `~> 1.50`, which is a more modern floor while still permitting forward-compatible 1.x upgrades.

## Review Notes
- The Databricks AWS commercial control-plane account ID `arn:aws:iam::414351767826:root` used in the cross-account trust policy is correct. (GovCloud uses different account IDs: `044793339203` for GovCloud, `170661010020` for GovCloud DoD — out of scope for this post.)
- The cluster policy schema correctly uses modern terminology (`allowlist`, `range`, `fixed`) rather than the deprecated `whitelist`/`blacklist`. Path-style attribute keys like `autoscale.min_workers` are valid.
- The `account_id` argument on `databricks_mws_credentials` is technically marked deprecated in favor of setting it on the provider block, but it is still functional and widely used in examples. Not a correctness issue.
- The `i3.xlarge` instance type is older-generation (launched 2017) but still supported by Databricks. For new deployments, newer families like `i4i`, `m6i`, `m7g`, or `r6i` generally offer better price/performance — worth a future revision but not technically incorrect.
- For serverless Databricks workspaces (`compute_mode = "SERVERLESS"`), `credentials_id` and `storage_configuration_id` must be omitted from `databricks_mws_workspaces`. The post implicitly covers the classic (customer-managed VPC) case, which is fine, but a future revision could add a serverless note.
- The `databricks_cluster_policy` definition uses a `range` constraint on `autoscale.min_workers` with `maxValue = 2`, which limits min_workers to ≤ 2 — this is intentional in the post (cost control) but means the `databricks_cluster.shared` resource (`min_workers = 1`) complies, while any consumer trying `min_workers = 3` would be rejected. This is correct behavior but worth being explicit about in narrative if revised.
