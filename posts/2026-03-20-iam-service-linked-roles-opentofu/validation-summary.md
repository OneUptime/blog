# Validation Summary: How to Create IAM Service-Linked Roles with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS service-linked roles
- AWS CLI
- AWS provider for OpenTofu/Terraform
- Amazon ECS
- Elastic Load Balancing
- Amazon EC2 Auto Scaling
- Amazon RDS
- Amazon ElastiCache

## Sources Consulted
- OpenTofu import command: https://opentofu.org/docs/cli/import/
- OpenTofu import blocks: https://opentofu.org/docs/v1.11/language/import/
- AWS provider `aws_iam_service_linked_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_service_linked_role
- AWS provider `aws_iam_role` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role
- IAM User Guide, Create a service-linked role: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create-service-linked-role.html
- AWS CLI `create-service-linked-role`: https://docs.aws.amazon.com/cli/latest/reference/iam/create-service-linked-role.html
- AWS CLI `list-roles`: https://docs.aws.amazon.com/cli/latest/reference/iam/list-roles.html
- AWS CLI `get-role`: https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html
- Amazon ECS service-linked role docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-service-linked-roles-for-clusters.html
- Elastic Load Balancing service-linked role docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/elb-service-linked-roles.html
- Amazon EC2 Auto Scaling service-linked role docs: https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-service-linked-role.html
- Amazon RDS service-linked role docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAM.ServiceLinkedRoles.html
- Amazon ElastiCache service-linked role docs: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/using-service-linked-roles.html

## Issues Found
- The ECS example comment said the role manages EC2 instances and load balancers. I corrected that to a cluster-related description because AWS documents `AWSServiceRoleForECS` as the service-linked role for ECS cluster features such as load balancer registration and service discovery, not generic EC2 instance management.
- The `custom_suffix` guidance was attached to the ECS example even though suffix support is service-specific. I moved that note to the Auto Scaling example because the Auto Scaling documentation explicitly supports additional service-linked roles with a custom suffix.
- The "handle already-existing roles" example used `data "aws_iam_role"` to conditionally create the role if missing. I replaced that pattern with import guidance because the correct documented way to bring an existing `aws_iam_service_linked_role` under management is to import it by ARN before apply.
- The `aws iam list-roles` example labeled the entire assume-role policy document as `Service`. I changed the query to use documented top-level fields (`RoleName` and `Arn`) so the command output matches what the label says and avoids ambiguous policy-document formatting.
- The `aws iam get-role` example was described as fetching the policy directly. I changed it to "Get details for a specific service-linked role" because `get-role` returns the full role object, and AWS documents the trust policy in that response as URL-encoded.

## Review Notes
- Many AWS services auto-create service-linked roles the first time you create a dependent resource. Pre-creating them with OpenTofu is still technically valid when you want deterministic first-run deployments.
- `custom_suffix` is not universally supported for service-linked roles. AWS CLI documentation explicitly notes that some services reject it, so examples should keep it limited to services that document support.
- If a future revision wants to show the trust policy itself instead of general role details, the post should include a URL-decoding step because IAM documents `get-role` policy output as URL-encoded.
