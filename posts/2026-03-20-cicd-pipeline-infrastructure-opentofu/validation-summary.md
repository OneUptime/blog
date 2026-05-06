# Validation Summary: How to Build a CI/CD Pipeline Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform AWS Provider
- Amazon ECR
- AWS KMS
- AWS IAM
- GitHub Actions OIDC
- Amazon ECS
- Amazon S3
- Amazon SNS
- Amazon EventBridge

## Sources Consulted
- Amazon ECR User Guide: Lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR User Guide: Configuring basic scanning for images - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic-enabling.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- Terraform language docs: Query data sources - https://developer.hashicorp.com/terraform/language/data-sources
- Terraform language docs: `count` meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/count
- AWS Service Authorization Reference: Amazon ECS actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
- Amazon SNS Developer Guide: HTTP/HTTPS subscription confirmation JSON format - https://docs.aws.amazon.com/sns/latest/dg/http-subscription-confirmation-json.html
- Amazon EventBridge User Guide: Using resource-based policies - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon ECS Developer Guide: ECS service deployment state change events - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service_deployment_events.html
- Terraform Registry: `aws_sns_topic_subscription` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform Registry: `aws_sns_topic_policy` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy

## Issues Found
- The ECR lifecycle policy used one `tagPrefixList` with `prod-`, `staging-`, and `dev-`, but Amazon ECR evaluates multiple tag prefixes as a combined match rather than "any of these prefixes." I split that into separate lifecycle rules so the example actually keeps 10 images for each environment prefix.
- The ECR repositories referenced `aws_kms_key.ecr` without defining the KMS key. I added the missing `aws_kms_key` resource so the encryption example is internally consistent.
- The GitHub OIDC section used a data-source lookup plus `count` to try to create the IAM OIDC provider only when absent. That pattern does not safely implement "create if missing" in Terraform/OpenTofu planning. I replaced it with a direct `aws_iam_openid_connect_provider` resource, added the required account and region data sources used later in the post, and updated the trust policy to reference the provider ARN directly.
- The ECS IAM policy example referenced `var.region` without defining it. I changed it to `data.aws_region.current.name` so the ARN is derived from the active provider configuration.
- The notification example attempted to subscribe an SNS topic directly to a Slack webhook URL. SNS HTTPS subscriptions require the endpoint to confirm the subscription and accept SNS POST payloads, so a raw Slack incoming webhook is not a drop-in endpoint. I changed the example to a generic HTTPS notification endpoint and documented the confirmation requirement.
- The EventBridge-to-SNS path was missing the SNS topic policy that allows `events.amazonaws.com` to publish. I added `aws_sns_topic_policy` so the deployment events can actually reach the SNS topic.

## Review Notes
- The GitHub OIDC thumbprint in the example is a point-in-time value and should be rechecked before reuse.
- The EventBridge rule is technically valid as written and will match ECS deployment events with `INFO` and `ERROR` types. If the goal is only success/failure alerts, filtering on specific `eventName` values such as `SERVICE_DEPLOYMENT_COMPLETED` and `SERVICE_DEPLOYMENT_FAILED` would be more precise.
