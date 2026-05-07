# Validation Summary: How to Set Up AWS DMS Replication Tasks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Database Migration Service (AWS DMS)
- PostgreSQL
- Amazon Aurora PostgreSQL
- Terraform AWS Provider

## Sources Consulted
- Terraform AWS Provider: `aws_dms_replication_subnet_group` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dms_replication_subnet_group.html.markdown
- Terraform AWS Provider: `aws_dms_replication_instance` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dms_replication_instance.html.markdown
- Terraform AWS Provider: `aws_dms_endpoint` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dms_endpoint.html.markdown
- Terraform AWS Provider: `aws_dms_replication_task` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dms_replication_task.html.markdown
- AWS DMS User Guide: Creating the required IAM roles - https://docs.aws.amazon.com/dms/latest/userguide/security-iam.html#CHAP_Security.APIRole
- AWS DMS User Guide: Using a PostgreSQL database as an AWS DMS source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html
- AWS DMS User Guide: Using a PostgreSQL database as a target for AWS Database Migration Service - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html
- AWS DMS User Guide: Working with replication instance classes - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
- AWS DMS User Guide: AWS DMS release notes - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReleaseNotes.html
- OpenTofu CLI Docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI Docs: `tofu apply` - https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The replication instance pinned `engine_version = "3.5.3"`. AWS release notes show version 3.5.3 had a "No new instance date" of February 28, 2026, so that pin is no longer suitable for a new setup reviewed on May 7, 2026. I removed the pin so the example uses the current default DMS engine version instead.
- The source endpoint used `slot_name`, which AWS documents for previously created logical replication slots used with `CdcStartPosition`. The post did not configure a native CDC start point, so I removed `slot_name`.
- The source endpoint forced `plugin_name = "pglogical"`, which requires pglogical-specific source configuration. Because the post only described generic logical replication prerequisites, I removed that override.
- The source endpoint included `max_file_size`, but AWS documents that setting for PostgreSQL targets that ingest CSV files, not for a PostgreSQL source endpoint. I removed it.
- The replication task referenced `task-settings.json`, but the post never provided that file and the `replication_task_settings` argument is optional in the provider. I removed that reference so the sample is self-contained.
- The post did not mention the AWS DMS service-role prerequisite. I added the required `dms-vpc-role` and `dms-cloudwatch-logs-role` prerequisite to the introduction because AWS and the provider docs call these out for DMS networking and logging.

## Review Notes
- As of May 7, 2026, AWS documents 3.5.4 as the current default AWS DMS engine version. If the author wants to pin a specific engine version in the future, that value should be reviewed periodically against the AWS DMS release notes.
- The Terraform AWS Provider documentation notes that endpoint passwords are stored in raw state when passed directly as arguments. The post is still technically correct, but a future revision could mention Secrets Manager for production use.
