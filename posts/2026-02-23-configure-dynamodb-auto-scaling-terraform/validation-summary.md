# Validation Summary: How to Configure DynamoDB Auto Scaling in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon DynamoDB
- AWS Application Auto Scaling
- Amazon CloudWatch

## Sources Consulted
- AWS DynamoDB Developer Guide: Managing throughput capacity automatically with DynamoDB auto scaling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- AWS DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- Terraform Registry: aws_dynamodb_table resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table.html
- Terraform Registry: aws_appautoscaling_target resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target.html
- Terraform Registry: aws_appautoscaling_policy resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy.html
- Terraform Registry: aws_appautoscaling_scheduled_action resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_scheduled_action
- HashiCorp Developer tutorial: Manage AWS DynamoDB scale: https://developer.hashicorp.com/terraform/tutorials/aws/aws-dynamodb-scale
- AWS Database Blog: New in Terraform: Manage global secondary index drift in Amazon DynamoDB: https://aws.amazon.com/blogs/database/new-in-terraform-manage-global-secondary-index-drift-in-amazon-dynamodb/

## Issues Found
- The post stated that DynamoDB on-demand mode costs roughly 6.5x more per unit of capacity than provisioned mode. AWS's current DynamoDB pricing makes the fully utilized per-request comparison roughly 3.5x in many regions after recent on-demand price reductions. I changed the sentence to say "roughly 3.5x more per fully utilized unit of capacity than provisioned mode in many regions."

## Review Notes
The Terraform resource shapes, scalable dimensions, DynamoDB predefined metric types, scheduled action syntax, and `ignore_changes` guidance are consistent with official AWS and HashiCorp documentation. Terraform and OpenTofu were not installed in the workspace, so I could not run `terraform validate`; the HCL snippets were reviewed against provider documentation instead.
