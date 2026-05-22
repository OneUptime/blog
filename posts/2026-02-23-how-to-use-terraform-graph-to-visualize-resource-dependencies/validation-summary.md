# Validation Summary: How to Use terraform graph to Visualize Resource Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform dependency graph
- Graphviz DOT rendering
- AWS provider resources and data sources
- GitHub Actions
- Blast Radius

## Sources Consulted
- HashiCorp Terraform CLI `graph` command documentation: https://developer.hashicorp.com/terraform/cli/commands/graph
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `destroy` command documentation: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Graphviz output formats documentation: https://graphviz.org/docs/outputs/
- Terraform AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_subnet_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Blast Radius project documentation: https://github.com/28mm/blast-radius

## Issues Found
- The post incorrectly described `terraform graph -type=plan` as the default graph. Current Terraform documentation says the default graph is a simplified resources-only dependency graph, while `-type=plan`, `-type=plan-refresh-only`, `-type=plan-destroy`, and `-type=apply` select more detailed operation graphs. Updated the Graph Types section accordingly.
- The destroy graph explanation stated destruction order as an absolute reverse of creation order. Updated this to say destruction generally follows reverse dependency order, which is more accurate for Terraform graph behavior.
- The AWS RDS example omitted a DB subnet group and used an undeclared `var.db_password`. Added a DB subnet group, a second subnet in another availability zone, and `manage_master_user_password = true` so the example better matches current AWS provider documentation.
- The EC2 example used a hard-coded AMI ID that is region-specific and can become stale. Replaced it with an `aws_ami` data source filtered to Amazon Linux 2023.
- The filtered graph command using `grep -E "(aws_instance|aws_security_group|->)"` would remove required DOT graph structure such as `digraph` and closing braces, producing invalid DOT. Replaced it with an `awk` filter that preserves graph structure.
- The graph-reading guidance overstated layout position and graph width as exact creation order and parallelism. Updated the wording to describe dependency direction and possible parallelism more precisely.

## Review Notes
Terraform and Graphviz were not installed in the local workspace, so CLI behavior was verified against official documentation rather than local `--help` output. The GitHub Actions workflow syntax and Graphviz output formats are consistent with current official documentation.
