# Validation Summary: How to Use Terraform with Runbook Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform CLI
- HashiCorp AWS provider
- AWS Auto Scaling
- Amazon RDS
- Amazon EC2 security groups and network interfaces
- Amazon EBS snapshots
- Amazon Route 53
- AWS CLI
- Rundeck job YAML
- Python subprocess automation

## Sources Consulted
- Terraform CLI `plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `output` command: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform CLI `import` command: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform AWS provider `aws_autoscaling_group` data source/resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/autoscaling_group and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_db_instance` data source/resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS read replica promotion documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- AWS CLI `promote-read-replica`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/rds/promote-read-replica.html
- Terraform AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS CLI `modify-network-interface-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-network-interface-attribute.html
- Terraform AWS provider `aws_instance` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instance
- Terraform AWS provider `aws_ebs_snapshot` and `aws_ebs_snapshots`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ebs_snapshot
- Rundeck JOB-YAML reference: https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html

## Issues Found
- The scaling runbook referenced `var.subnet_ids` and `data.aws_launch_template.web` without declaring them. Added the missing variable and data source.
- The scaling runbook described modifying an existing Auto Scaling group but modeled it as a managed resource without noting state import. Added a first-run `terraform import` comment so the existing resource is in Terraform state before updates.
- The database failover runbook modeled read replica promotion as a normal `aws_db_instance` resource. Terraform's AWS provider manages RDS instances but read replica promotion is an imperative RDS operation, so the example now uses the documented AWS CLI `promote-read-replica` command and waits for availability before reading the promoted instance as a data source.
- The Route 53 CNAME used the RDS `endpoint` value, which includes a port. Changed the DNS record to use the RDS data source `address` value, which is a hostname suitable for a CNAME record.
- The database failover runbook used `var.hosted_zone_id` and `var.domain` without declarations. Added the missing variables.
- The isolation security group claimed to have no outbound access but did not explicitly remove the default outbound rule. Added empty `ingress` and `egress` lists.
- The EC2 isolation runbook used `aws_network_interface_sg_attachment`, which attaches one security group rather than replacing the interface's group set. Replaced it with the documented AWS CLI `modify-network-interface-attribute --groups` call to set the primary ENI's security groups to only the isolation group.
- The forensic snapshot example only covered non-root EBS block devices. Updated it to include both root and additional EBS block devices from the instance data source.
- The snapshot cleanup runbook tried to read a non-existent `snapshots` collection from `aws_ebs_snapshots`. Added per-snapshot `aws_ebs_snapshot` data lookups and filtered against the documented `start_time` attribute.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than validated with `terraform validate`. Several snippets intentionally use `null_resource` plus AWS CLI for imperative runbook actions; this is technically correct for the shown operations, but production implementations should ensure the AWS CLI is installed, credentials are scoped, commands are idempotent, and audit logging captures command output.
