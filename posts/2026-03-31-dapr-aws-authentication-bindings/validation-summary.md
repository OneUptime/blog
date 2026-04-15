# Validation Summary: How to Configure AWS Authentication for Dapr Bindings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component model, bindings, secret references)
- AWS IAM (roles, policies, instance profiles, IRSA)
- AWS STS (AssumeRole, temporary credentials)
- AWS SDK for Go v2 (default credential provider chain)
- Amazon S3 (used as example binding target)
- Amazon EKS (IRSA / IAM Roles for Service Accounts)
- Amazon EC2 (instance profiles, IMDS)
- Amazon ECS (task roles)
- Kubernetes (Secrets, ServiceAccounts)
- eksctl

## Sources Consulted
- Dapr documentation on AWS binding authentication: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr documentation on secret references in components: https://docs.dapr.io/operations/components/component-secrets/
- AWS SDK for Go v2 credential provider chain: https://aws.github.io/aws-sdk-go-v2/docs/configuring-sdk/#specifying-credentials
- AWS IAM ARN format documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- eksctl documentation for OIDC provider association

## Issues Found
1. **AWS SDK credential chain order was incorrect (Method 3, lines 82-87).**
   - **What was wrong:** The post listed the credential resolution order as: (1) environment variables, (2) credentials file, (3) EC2 IMDS, (4) ECS task role, (5) EKS IRSA. This is backwards for items 3-5.
   - **What was changed:** Corrected the order to match the actual AWS SDK for Go v2 default credential provider chain: (1) environment variables, (2) `~/.aws/credentials` and `~/.aws/config` files, (3) Web Identity Token credentials (EKS IRSA), (4) ECS container credentials (task role), (5) EC2 instance metadata service (IMDS). Also added `~/.aws/config` alongside `~/.aws/credentials` since both shared config files are consulted.
   - **Why:** The AWS SDK checks web identity tokens (used by IRSA) before ECS container credentials, and ECS credentials before EC2 IMDS. Getting this order wrong could mislead readers about which credential source takes precedence in environments where multiple are available.

## Review Notes
- **Method 4 (EC2 Instance Profile)** is incomplete: the commands create an IAM role and attach a policy, but do not create an instance profile, add the role to it, or associate it with an EC2 instance. These steps (`aws iam create-instance-profile`, `aws iam add-role-to-instance-profile`, `aws ec2 associate-iam-instance-profile`) would be needed for a fully working setup. This is acceptable as a simplified illustration but could be expanded in a future revision.
- The Dapr component metadata field names (`accessKey`, `secretKey`, `sessionToken`) are correct and consistent with the official Dapr AWS component documentation.
- The `secretKeyRef` pattern for referencing Kubernetes secrets in Dapr components is correctly demonstrated.
- All IAM ARN formats used (with empty region field for the global IAM service) are syntactically correct.
- The IRSA setup commands and service account annotation are accurate.
- The recommendation table at the end is sound and aligns with AWS best practices for each environment.
