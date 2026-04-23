# Validation Summary: How to Set Up RDS Blue-Green Deployments with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon RDS for MySQL
- AWS RDS Blue/Green Deployments

## Sources Consulted
- AWS provider `aws_db_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.42.0/website/docs/r/db_instance.html.markdown
- AWS provider `aws_db_parameter_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v6.42.0/website/docs/r/db_parameter_group.html.markdown
- AWS provider design note for RDS blue/green support: https://github.com/hashicorp/terraform-provider-aws/blob/v6.42.0/docs/design-decisions/rds-bluegreen-deployments.md
- AWS provider implementation for RDS DB instance blue/green updates: https://github.com/hashicorp/terraform-provider-aws/blob/v6.42.0/internal/service/rds/instance.go
- Amazon RDS Blue/Green Deployments overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html
- Creating a blue/green deployment in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-creating.html
- Switching a blue/green deployment in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-switching.html
- Deleting a blue/green deployment in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-deleting.html
- AWS CLI `switchover-blue-green-deployment`: https://docs.aws.amazon.com/cli/latest/reference/rds/switchover-blue-green-deployment.html
- AWS CLI `delete-blue-green-deployment`: https://docs.aws.amazon.com/cli/latest/reference/rds/delete-blue-green-deployment.html
- MySQL on Amazon RDS versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- RDS for MySQL slow query and general logs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html

## Issues Found
- The post used `aws_rds_blue_green_deployment` as if it were a supported standalone AWS provider resource. Current official AWS provider documentation exposes blue/green support on `aws_db_instance` through `blue_green_update.enabled`, not as a documented standalone resource. I replaced the unsupported resource example with the supported `aws_db_instance` configuration.
- The post claimed OpenTofu managed manual blue/green lifecycle steps, including a separate switchover script. In the supported AWS provider workflow, the provider creates the blue/green deployment, updates the green instance, performs the switchover, and cleans up during `tofu apply`. I rewrote the switchover and cleanup sections to reflect that behavior.
- The cleanup command used `--delete-source`, which is not a valid AWS CLI option for `delete-blue-green-deployment`. The documented options are `--delete-target` and `--no-delete-target`, and `--delete-target` cannot be used after `SWITCHOVER_COMPLETED`. Because the corrected OpenTofu workflow does not require a manual delete step, I removed the invalid command and replaced it with an accurate note.
- The `green_db_endpoint` output pointed to `aws_rds_blue_green_deployment.main.id`, which is a deployment identifier rather than a database endpoint. I replaced the outputs with `aws_db_instance.blue.identifier` and `aws_db_instance.blue.endpoint`.
- The parameter group section incorrectly stated that `binlog_format = ROW` and `binlog_row_image = Full` were required for RDS Blue/Green replication. AWS RDS blue/green documentation for MySQL requires automated backups, but it does not require those parameter changes for blue/green deployments. I replaced the section with an optional custom parameter group example using valid MySQL logging parameters.
- The example versions `8.0.35` and `8.0.36` were outdated as of April 23, 2026. I updated the MySQL example to a currently supported 8.0 minor version.
- The description and summary overstated the scope by referring to zero-downtime schema changes under OpenTofu control. The supported provider workflow is for low-downtime DB instance updates such as engine version, instance class, and parameter group changes. I corrected that wording.

## Review Notes
- `blue_green_update` is a low-downtime update mechanism on `aws_db_instance`; it does not expose the temporary green environment for manual testing before switchover.
- AWS provider documentation states that low-downtime updates require automated backups and are not available for DB instances with replicas.
- The example now reflects the AWS provider version current on April 23, 2026 (`v6.42.0`) and a MySQL version currently supported by Amazon RDS on that date.
