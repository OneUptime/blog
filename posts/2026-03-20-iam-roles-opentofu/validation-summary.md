# Validation Summary: How to Manage IAM Roles with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- GitHub Actions OIDC federation
- Amazon ECR
- Amazon ECS
- AWS Step Functions
- AWS X-Ray

## Sources Consulted
- AWS IAM User Guide, Permissions boundaries for IAM entities: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM User Guide, IAM and AWS STS condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS IAM User Guide, Create an OpenID Connect (OIDC) identity provider in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS IAM User Guide, Obtain the thumbprint for an OpenID Connect identity provider: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- Amazon ECR User Guide, IAM permissions for pushing an image to an Amazon ECR private repository: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- AWS Service Authorization Reference, Amazon Elastic Container Registry: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html
- AWS Service Authorization Reference, Amazon Elastic Container Service: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
- AWS Step Functions Developer Guide, Trace Step Functions request data in AWS X-Ray: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-xray-tracing.html
- AWS IAM User Guide, The confused deputy problem: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- AWS IAM User Guide, Access to AWS accounts owned by third parties: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- HashiCorp AWS Provider source, `aws_iam_openid_connect_provider` schema (`thumbprint_list` optional in current provider versions): https://github.com/hashicorp/terraform-provider-aws/blob/v6.39.0/internal/service/iam/openid_connect_provider.go

## Issues Found
- The post described the Step Functions example as "role chaining," but the code showed a normal Step Functions execution role. I renamed that description to match AWS IAM terminology.
- The permission-boundary example claimed to constrain developer-created roles, but the inline deny block did not model the documented delegated-role-creation pattern correctly. I removed that incorrect deny block and clarified the boundary as a maximum-permissions boundary applied to the role itself.
- The GitHub OIDC provider example hard-coded a thumbprint even though current AWS IAM behavior and current AWS provider versions can retrieve or manage this automatically. I removed the legacy thumbprint configuration from the example.
- The GitHub Actions ECR policy was missing `ecr:BatchCheckLayerAvailability`, which AWS documents as required for image pushes. I added that action.
- The Step Functions X-Ray policy was missing `xray:PutTelemetryRecords` and `xray:GetSamplingTargets`, which AWS documents for X-Ray tracing in Step Functions. I added those actions.
- The conclusion said to always require `sts:ExternalId` for cross-account access. AWS documents this recommendation specifically for third-party cross-account access to prevent confused deputy issues, so I narrowed that guidance.
- The conclusion implied that permission boundaries alone prevent privilege escalation when teams create roles. I corrected that guidance to note that you pair boundaries with IAM policies that require `iam:PermissionsBoundary` on role-creation APIs.

## Review Notes
- The post assumes referenced resources and data sources such as `data.aws_caller_identity.current`, `aws_s3_bucket.app`, `aws_ecs_service.app`, and `aws_lambda_function.*` are defined elsewhere in the surrounding OpenTofu configuration.
