# Validation Summary: How to Handle Resources That Take a Long Time to Create in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon RDS for PostgreSQL
- Amazon EKS
- HCL
- `terraform_data`
- `local-exec` provisioners

## Sources Consulted
- OpenTofu resource syntax and operation timeouts: https://opentofu.org/docs/language/resources/syntax/#operation-timeouts
- OpenTofu `depends_on` meta-argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu resource dependencies and parallelism: https://opentofu.org/docs/language/resources/behavior/#resource-dependencies
- OpenTofu `terraform_data` managed resource: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu `apply` command parallelism: https://opentofu.org/docs/cli/commands/apply/
- AWS provider `aws_db_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_eks_cluster` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_cluster.html.markdown
- AWS provider `aws_eks_node_group` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_node_group.html.markdown
- Amazon RDS for PostgreSQL version documentation: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS node IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html

## Issues Found
- The post said most resources support `timeouts`, but OpenTofu documents that most resource types do not support the block. Changed this to "Some resource types support `timeouts` blocks."
- The RDS example pinned PostgreSQL `16.2`, which is stale. Changed it to major version `16`, which RDS supports as a way to select a current minor version for that major line when automatic minor upgrades are enabled.
- The RDS example configured a delete timeout but did not account for the AWS provider requirement to set `final_snapshot_identifier` or `skip_final_snapshot` when deleting. Added `skip_final_snapshot = true` for the example with a production caveat.
- The EKS example used Kubernetes `1.30`, which is now in EKS extended support rather than standard support. Changed the example to `1.35`, which is currently listed in standard support.
- The EKS cluster timeout example repeated default create/update values instead of extending them. Increased create, update, and delete timeout values.
- The EKS node group example set all timeouts to `30m`, which is shorter than the AWS provider's `60m` defaults. Increased them to `90m`.
- The `depends_on` explanation and comments implied waiting for functional readiness/add-ons, but the example actually modeled hidden IAM policy attachment dependencies. Updated the wording and comments to match OpenTofu and AWS provider guidance.
- The polling example used `null_resource`, which OpenTofu documents `terraform_data` as the built-in replacement for. Replaced `null_resource` with `terraform_data`.
- The polling example lacked replacement triggers, so its provisioners would not rerun if the database endpoint changed. Added `triggers_replace` values.
- The final dependency-only example used `null_resource`; updated it to `terraform_data`.

## Review Notes
Provisioners and polling loops are still a last-resort pattern in OpenTofu. For production RDS instances, prefer a deliberate final snapshot policy instead of copying `skip_final_snapshot = true` blindly, and handle database credentials with care because provider-managed secrets can be stored in state.
