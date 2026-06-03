# Validation Summary: How to Create Neptune Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code Guide

## Technologies Covered
- Amazon Neptune
- Terraform
- HashiCorp AWS provider
- AWS IAM
- Amazon S3
- Amazon VPC security groups and DB subnet groups
- AWS KMS
- Amazon CloudWatch Logs
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_neptune_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster
- Terraform AWS provider documentation for `aws_neptune_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster_instance
- Terraform AWS provider documentation for `aws_neptune_event_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_event_subscription
- Amazon Neptune parameter groups: https://docs.aws.amazon.com/neptune/latest/userguide/parameter-groups.html
- Amazon Neptune parameters: https://docs.aws.amazon.com/neptune/latest/userguide/parameters.html
- Amazon Neptune engine version 1.3.1.0 release notes: https://docs.aws.amazon.com/neptune/latest/userguide/engine-releases-1.3.1.0.html
- Amazon Neptune query languages: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-queries.html
- Amazon Neptune Serverless: https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless.html
- Amazon Neptune Serverless capacity scaling: https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless-capacity-scaling.html
- Publishing Neptune logs to CloudWatch Logs: https://docs.aws.amazon.com/neptune/latest/userguide/cloudwatch-logs.html
- Neptune audit logs: https://docs.aws.amazon.com/neptune/latest/userguide/auditing.html
- Neptune bulk loader and IAM prerequisites: https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load.html
- Neptune load data formats: https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-tutorial-format.html
- Creating an IAM role for Neptune S3 access: https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-tutorial-IAM-CreateRole.html
- Neptune subnet API: https://docs.aws.amazon.com/neptune/latest/userguide/api-subnets.html
- Neptune event categories: https://docs.aws.amazon.com/neptune/latest/userguide/event-lists.html

## Issues Found
- The post described Neptune as supporting only Gremlin and SPARQL. Amazon Neptune also supports openCypher, so the introduction and summary were updated to include it.
- The `iam_database_authentication_enabled` note said IAM credentials are used instead of passwords. Neptune does not support username/password-based access control, so the wording was corrected to describe IAM authentication more precisely.
- The cluster instance example had a comment saying "Enable performance insights" above `auto_minor_version_upgrade`. That Terraform argument controls automatic minor version upgrades, so the comment was corrected.
- The Neptune Serverless example did not set a compatible cluster parameter group even though Terraform's Neptune Serverless guidance calls out the need for a compatible parameter group. The example now uses the existing Neptune 1.3 cluster and instance parameter groups.
- The loading section said to create CSV or JSON files in Neptune format. The Neptune bulk loader supports Gremlin/openCypher CSV formats and RDF formats such as N-Triples, N-Quads, RDF/XML, and Turtle, so that sentence was corrected.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL resource names and arguments were reviewed against the current HashiCorp AWS provider documentation instead.
- The example pins Neptune engine version `1.3.1.0`, which is valid and uses the matching `neptune1.3` parameter group family. Future updates may want to revisit the pinned engine version if the post is intended to track newer Neptune releases.
