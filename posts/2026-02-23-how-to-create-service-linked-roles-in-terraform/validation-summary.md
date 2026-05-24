# Validation Summary: How to Create Service-Linked Roles in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (service-linked roles)
- AWS services: ECS, OpenSearch/Elasticsearch, EC2 Auto Scaling, Elastic Load Balancing, EC2 Spot Fleet, RDS, Application Auto Scaling
- `aws_iam_service_linked_role` Terraform resource
- `aws_iam_policy` Terraform resource
- `aws_opensearch_domain` Terraform resource

## Sources Consulted
- Terraform AWS provider docs for `aws_iam_service_linked_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_service_linked_role
- Terraform AWS provider docs for `aws_opensearch_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS IAM documentation on service-linked roles: https://docs.aws.amazon.com/IAM/UserGuide/using-service-linked-roles.html
- AWS service-linked role naming and service principals reference: https://docs.aws.amazon.com/IAM/UserGuide/reference_aws-services-that-work-with-iam.html
- Terraform lifecycle meta-argument docs: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

## Issues Found
1. **Misleading explanation of `prevent_destroy` lifecycle rule.** The original "Using Lifecycle Rules" subsection claimed that `prevent_destroy = true` would "prevent errors if the role already exists" and "if the role already exists, do not try to recreate it." This is technically wrong: `prevent_destroy` only blocks `terraform destroy`/replacement operations — it does not prevent Terraform from attempting to create a duplicate resource on `terraform apply`, which is the failure mode being discussed. The "already exists" error occurs at create-time and must be resolved by import or conditional creation (both of which are covered in the adjacent subsections). Fixed by reframing the subsection to explain that `prevent_destroy` is for protecting a managed/imported role from accidental destruction, with a note that it does not address the "already exists" creation error.

## Review Notes
- Service principals listed (`es.amazonaws.com`, `autoscaling.amazonaws.com`, `elasticloadbalancing.amazonaws.com`, `ecs.amazonaws.com`, `spotfleet.amazonaws.com`, `rds.amazonaws.com`, `ecs.application-autoscaling.amazonaws.com`) all match AWS's documented service-linked-role principals.
- The post uses `es.amazonaws.com` for OpenSearch, which is the legacy Elasticsearch service principal and is still accepted/used by `aws_opensearch_domain`. AWS also has the newer `opensearchservice.amazonaws.com` principal (creating `AWSServiceRoleForAmazonOpenSearchService`), but for compatibility with the existing `aws_opensearch_domain` resource the legacy principal remains valid. Worth a future update if the post is revised.
- `terraform import` syntax shown is correct; the example ARN uses the legacy Elasticsearch role name `AWSServiceRoleForAmazonElasticsearchService`, which matches the `es.amazonaws.com` principal.
- `aws_opensearch_domain` example uses `OpenSearch_2.7`, `r6g.large.search`, and `gp3` — all valid as of the post's timeframe. Newer engine versions exist, but the example is not incorrect.
- IAM policy actions (`iam:CreateServiceLinkedRole`, `iam:DeleteServiceLinkedRole`, `iam:GetServiceLinkedRoleDeletionStatus`) and the resource ARN scope (`arn:aws:iam::*:role/aws-service-role/*`) are correct. In production, scoping by `iam:AWSServiceName` condition key per service is generally a tighter pattern, but the policy as written is functional.
- ECS, ELB, and Auto Scaling typically create their service-linked roles automatically on first use. The post correctly calls out that automatic creation varies and that explicit Terraform creation is safer for IaC workflows.
