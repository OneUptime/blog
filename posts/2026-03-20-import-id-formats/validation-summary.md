# Validation Summary: How to Handle Import ID Formats for Different Resource Types in OpenTofu

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- OpenTofu
- Terraform AWS Provider
- AWS CLI
- Amazon EC2
- Amazon S3
- AWS Identity and Access Management (IAM)
- Amazon RDS
- Amazon Route 53
- Amazon ECS
- Amazon EKS
- Amazon CloudFront

## Sources Consulted
- OpenTofu CLI import documentation: https://opentofu.org/docs/cli/import/
- OpenTofu language import documentation: https://opentofu.org/docs/language/import/
- Terraform AWS Provider `aws_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- Terraform AWS Provider `aws_s3_bucket_acl` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_acl.html.markdown
- Terraform AWS Provider `aws_s3_object` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_object.html.markdown
- Terraform AWS Provider `aws_iam_role_policy_attachment` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_role_policy_attachment.html.markdown
- Terraform AWS Provider `aws_iam_user_group_membership` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_user_group_membership.html.markdown
- Terraform AWS Provider `aws_route53_record` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_record.html.markdown
- Terraform AWS Provider `aws_ecs_service` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS Provider `aws_ecs_task_definition` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform AWS Provider `aws_eks_node_group` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_node_group.html.markdown
- Terraform AWS Provider `aws_eks_addon` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_addon.html.markdown
- Terraform AWS Provider `aws_cloudfront_distribution` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS CLI `describe-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI `list-buckets` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html
- AWS CLI `list-roles` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/list-roles.html
- AWS CLI `describe-db-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html

## Issues Found
- The note saying the provider documentation "always" lists the import format was too absolute. I changed it to say the provider documentation lists the format for importable resources, which matches the OpenTofu guidance more precisely.
- The `aws_s3_bucket_acl` entry was too broad. I updated it to note that importing can be just the bucket name in the simplest case, but may also require `expected_bucket_owner` and/or `acl` depending on the bucket configuration documented by the provider.
- The `aws_iam_user_group_membership` example used `user_name/group1,group2`, which is incorrect. I changed it to slash-separated group names: `user_name/group1/group2`.
- The `aws_route53_record` example used `zone_id/name/type`, which is incorrect. I changed it to the documented underscore-separated format: `zone_id_record_name_type[_set_identifier]`.
- The `aws_ecs_task_definition` example used `family:revision`, which is not the documented `terraform import` / `tofu import` format. I changed it to a full task definition ARN.
- The `aws_eks_node_group` example used `cluster_name/node_group_name`, which is incorrect. I changed it to the documented colon-separated format: `cluster_name:node_group_name`.

## Review Notes
- The AWS CLI command examples are valid as written. One caveat is that AWS now recommends paginated `ListBuckets` requests for accounts with bucket quotas above 10,000; the post's `list-buckets` example is still fine as a simple lookup pattern.
- `aws_key_pair` imports by key name, but the provider documentation notes that a later apply may still propose replacement because the AWS API does not return the public key material.
