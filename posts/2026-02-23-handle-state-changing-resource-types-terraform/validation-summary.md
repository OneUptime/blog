# Validation Summary: How to Handle State When Changing Resource Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and state management
- Terraform moved blocks and provider state migration
- HashiCorp AWS Provider
- AWS EC2 instances, launch templates, and Auto Scaling groups
- AWS security groups and security group rules
- AWS RDS and Aurora
- AWS CLI

## Sources Consulted
- Terraform CLI `state mv` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform Plugin Framework state move documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/state-move
- Terraform import documentation: https://developer.hashicorp.com/terraform/cli/import/usage
- AWS Provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS Provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS Provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS Provider `aws_lb_target_group_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group_attachment
- AWS Provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- AWS Provider `aws_rds_cluster_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- AWS EC2 Auto Scaling launch template documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- AWS CLI `restore-db-cluster-from-snapshot` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-cluster-from-snapshot.html
- AWS CLI `create-db-instance` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI `describe-security-group-rules` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-group-rules.html

## Issues Found
- The post implied `moved` blocks only work for same-type moves. Updated the wording to note that cross-type moved blocks require explicit provider support, while `terraform state mv` requires the same resource type.
- The first launch template example specified a subnet inside the launch template while the Auto Scaling group also supplied subnets. Removed the launch template network interface subnet usage because Auto Scaling group subnets come from `vpc_zone_identifier`.
- The security group rule migration example used the older `aws_security_group_rule` import ID style and removed/re-imported the security group unnecessarily. Updated it to keep the security group in state, discover security group rule IDs, and import rules using `aws_vpc_security_group_ingress_rule`.
- The Aurora restore example used a DB snapshot name where AWS requires an ARN when restoring a DB snapshot to a DB cluster. Updated the example to use a snapshot ARN placeholder.
- The Aurora restore example imported an Aurora cluster instance without first creating one. Added the required `aws rds create-db-instance` step before Terraform import.
- The blue-green example attempted to use an Auto Scaling group ID as an `aws_lb_target_group_attachment.target_id`, but target group attachments register targets such as instances, IP addresses, or Lambda functions. Updated the example to attach the standalone blue instance with `aws_lb_target_group_attachment` and attach the green Auto Scaling group through `target_group_arns`.
- The blue-green example only created the green resources after switching `active_color`, which contradicted the text about creating green alongside blue. Updated the green Auto Scaling group to exist during the blue phase, with production target group attachment controlled by `active_color`.

## Review Notes
- Terraform and AWS CLI binaries were not installed in the local environment, so command validation was performed against official HashiCorp, Terraform Registry, AWS documentation, and AWS CLI command references.
- The examples remain illustrative and still assume surrounding resources such as subnets, security groups, load balancers, and target groups exist in the reader's Terraform configuration.
