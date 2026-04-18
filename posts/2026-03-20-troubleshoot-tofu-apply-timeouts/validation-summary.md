# Validation Summary: How to Troubleshoot tofu apply Timeouts

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenTofu (tofu CLI)
- Terraform AWS provider (`hashicorp/aws`) — `aws_db_instance`, `aws_eks_cluster`, `aws_eks_node_group`, `aws_opensearch_domain`, `aws_db_parameter_group`, `aws_vpc_peering_connection_accepter`
- AWS CLI (`aws rds`, `aws eks`, `aws cloudtrail`)
- HCL configuration (`timeouts` block)
- `TF_LOG` environment variable

## Sources Consulted
- OpenTofu CLI documentation — `tofu apply`, `-target`, `-exclude` (https://opentofu.org/docs/cli/commands/apply/)
- OpenTofu v1.9.0 release notes (introduced `-exclude` flag, Jan 2025)
- Terraform AWS provider registry docs (https://registry.terraform.io/providers/hashicorp/aws/latest/docs):
  - `aws_db_instance` — default timeouts (create 40m, update 80m, delete 60m), `apply_immediately` argument
  - `aws_eks_cluster` — default timeouts (create 30m, update 60m, delete 15m)
  - `aws_opensearch_domain` — default timeouts (create 60m, update 180m, delete 90m)
  - `aws_vpc_peering_connection_accepter` — `auto_accept` and `timeouts { create, delete }`
  - `aws_eks_node_group` — `instance_types` list schema
- AWS CLI v2 reference (`rds describe-events`, `rds describe-db-instances`, `cloudtrail lookup-events`, `eks describe-cluster`)
- HashiCorp Terraform `TF_LOG` documentation (valid levels: TRACE, DEBUG, INFO, WARN, ERROR)

## Issues Found
No technical issues found. All code examples, CLI commands, default timeout values, argument names, and JMESPath queries verified correct against official documentation.

## Review Notes
- `-exclude` in Solution 4 is an OpenTofu-specific flag introduced in v1.9.0 (January 2025). It is not present in Terraform CLI, but since the post is explicitly about `tofu apply`, the usage is appropriate.
- For `aws_eks_node_group`, listing multiple `instance_types` is most effective when `capacity_type = "SPOT"` or with a launch template covering mixed instances. With the default on-demand capacity type, typically only the first entry is honored. The post's example is syntactically valid but readers may want to pair it with Spot capacity for true availability benefits.
- The comment `# default is 40m` for `aws_db_instance` create timeout is accurate. The shown `update = "80m"` happens to match the provider default as well (the default update timeout is already 80m), so setting it explicitly is a no-op — but harmless.
- `m4.xlarge` is a previous-generation instance type; still available in most regions but readers should consider newer generations (m6i/m7i) for new deployments.
