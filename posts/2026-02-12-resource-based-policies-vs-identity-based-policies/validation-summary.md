# Validation Summary: How to Use Resource-Based Policies vs Identity-Based Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS identity-based policies
- AWS resource-based policies
- Amazon S3 bucket policies
- Amazon SQS queue policies
- AWS Lambda function policies
- AWS KMS key policies
- AWS Secrets Manager resource policies
- AWS CLI
- AWS CloudTrail

## Sources Consulted
- AWS IAM User Guide: Identity-based policies and resource-based policies - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html
- AWS IAM User Guide: Policy evaluation for requests within a single account - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-basics.html
- AWS IAM User Guide: Cross-account policy evaluation logic - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
- AWS IAM User Guide: AWS JSON policy elements: Principal - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM User Guide: Managed policies and inline policies - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS IAM User Guide: AWS services that work with IAM - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-services-that-work-with-iam.html
- Amazon DynamoDB Developer Guide: Using resource-based policies for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html
- Amazon RDS User Guide: How Amazon RDS works with IAM - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/security_iam_service-with-iam.html
- AWS CLI Command Reference: iam put-role-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/put-role-policy.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI Command Reference: iam simulate-principal-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html

## Issues Found
- The post said DynamoDB does not support resource-based policies. AWS documentation now states that DynamoDB supports resource-based policies for tables and streams, so I added DynamoDB to the supported-services list and removed it from the unsupported-services sentence.
- The "Use Both" section said using both policy types can require both the user's policy and the resource policy to allow access. That is accurate for cross-account requests, but too broad for same-account evaluation where either an identity-based policy or a resource-based policy allow can be sufficient unless other limiting policies or explicit denies apply. I narrowed the bullet to cross-account access.

## Review Notes
- AWS also supports additional policy types, including service control policies, resource control policies, permissions boundaries, and session policies. The post intentionally focuses on identity-based and resource-based policies, and its simplified evaluation diagrams are reasonable for that scope.
- The `simulate-principal-policy` example is valid for checking identity-based permissions. The AWS CLI can include one resource policy in simulations for IAM users, but resource-based policy simulation is not supported for IAM roles.
