# Validation Summary: How to Deploy Redshift Clusters with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Provider for Terraform/OpenTofu
- Amazon Redshift provisioned clusters
- Amazon VPC networking and security groups
- Amazon S3 audit logging
- AWS KMS

## Sources Consulted
- AWS provider docs for `aws_redshift_cluster` (current): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/redshift_cluster.html.markdown
- AWS provider docs for `aws_redshift_logging` (current): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/redshift_logging.html.markdown
- AWS provider docs for `aws_redshift_cluster` in v5.30.0: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/website/docs/r/redshift_cluster.html.markdown
- AWS provider docs for `aws_redshift_parameter_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/redshift_parameter_group.html.markdown
- Amazon Redshift parameter groups: https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-parameter-groups.html
- Amazon Redshift workload management: https://docs.aws.amazon.com/redshift/latest/mgmt/workload-mgmt-config.html
- Amazon Redshift WLM query monitoring rules: https://docs.aws.amazon.com/redshift/latest/dg/cm-c-wlm-query-monitoring-rules.html
- Amazon Redshift provisioned clusters: https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html
- Amazon Redshift enhanced VPC routing: https://docs.aws.amazon.com/redshift/latest/mgmt/enhanced-vpc-routing.html
- Amazon Redshift Multi-AZ deployment: https://docs.aws.amazon.com/redshift/latest/mgmt/managing-cluster-multi-az.html
- Amazon Redshift audit logging: https://docs.aws.amazon.com/redshift/latest/mgmt/db-auditing.html

## Issues Found
- The post pinned the AWS provider to `~> 5.30`, which is older than the current provider line. I updated it to `~> 6.0` and changed audit logging to the current `aws_redshift_logging` resource, because provider 6.x no longer models audit logging under the `aws_redshift_cluster` resource.
- The parameter `max_cursor_result_set_size` was included even though Amazon Redshift documents it as deprecated and no longer used. I removed it.
- The WLM JSON used incorrect/manual shorthand keys (`memory_percent` and `concurrency`) that do not match Redshift’s documented JSON property names. I corrected them to `memory_percent_to_use` and `query_concurrency`, and added explicit `queue_type = "manual"` for clarity.
- The WLM example used `max_execution_time` for the ETL queue. Amazon Redshift documents WLM timeout as deprecated and recommends query monitoring rules instead. I replaced it with a `rules` block using `query_execution_time` and `abort`, with the threshold expressed in seconds as required by Redshift.
- The comment `At least 2 for HA` on `number_of_nodes` was misleading. Multi-node is not the same as Multi-AZ high availability in Redshift, so I changed the comment to describe the actual requirement.
- The enhanced VPC routing comment overstated the behavior. I narrowed it to COPY and UNLOAD traffic, which matches the Redshift documentation.
- The RA3 best-practice bullet attributed cross-instance restore to RA3 specifically. I changed it to the documented RA3 benefit of scaling compute independently from managed storage.
- The `require_ssl` best-practice wording implied it needed to be enabled from a false default. Because Redshift now defaults `require_ssl` to `true`, I changed the wording to keep it enabled rather than newly enable it.

## Review Notes
- Manual WLM is still supported, but AWS currently recommends automatic WLM by default unless you specifically need manual queue control.
- The audit logging example now uses the correct provider 6.x resource, but it still assumes an existing same-region S3 bucket with the required `s3:GetBucketAcl` and `s3:PutObject` permissions for Redshift log delivery.
- I did not run `tofu validate` or `terraform validate` locally because neither binary is installed in this workspace.
