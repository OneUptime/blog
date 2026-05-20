# Validation Summary: How to Implement Secret Rotation with ArgoCD and AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS KMS
- AWS IAM Roles for Service Accounts (IRSA)
- Amazon EKS and eksctl
- External Secrets Operator
- AWS Secrets and Configuration Provider (ASCP)
- Argo CD
- AWS Lambda secret rotation
- AWS CloudTrail and CloudWatch
- Stakater Reloader
- Kubernetes Secrets

## Sources Consulted
- AWS Secrets Manager rotation by Lambda function: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Secrets Manager Lambda rotation functions and four-step protocol: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html
- AWS Secrets Manager rotation function templates: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_available-rotation-templates.html
- AWS sample PostgreSQL rotation Lambda template: https://github.com/aws-samples/aws-secrets-manager-rotation-lambdas/tree/master/SecretsManagerRDSPostgreSQLRotationSingleUser
- AWS CLI rotate-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CLI replicate-secret-to-regions reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/replicate-secret-to-regions.html
- AWS Secrets Manager CloudTrail rotation events: https://docs.aws.amazon.com/secretsmanager/latest/userguide/cloudtrail_log_entries.html
- AWS Secrets Manager CloudWatch monitoring: https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudwatch.html
- AWS KMS key rotation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS KMS pricing: https://aws.amazon.com/kms/pricing/
- AWS Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- External Secrets Operator AWS provider authentication: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator templating v2: https://external-secrets.io/v0.10.4/guides/templating/
- eksctl IAM service accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS Secrets and Configuration Provider examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/ascp-examples.html
- Argo CD Application specification and config management plugins: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Stakater Reloader documentation: https://docs.stakater.com/reloader/main/index.html

## Issues Found
- KMS was described as if it could be synced to Kubernetes through ESO or ASCP. Updated the wording to clarify that Secrets Manager and Parameter Store integrate with ESO/ASCP, while KMS provides encryption keys.
- The KMS table entry implied all KMS key rotation is simply automatic and only costs $1/key/month. Updated it to note optional automatic rotation for supported keys and additional rotation/request charges.
- The RDS PostgreSQL secret example omitted the `engine` field required by AWS's PostgreSQL rotation Lambda template. Added `"engine": "postgres"`.
- The RDS rotation command referenced a generic Lambda function name and described it as an already-provided Lambda. Updated the wording and ARN example to use a Lambda created from the AWS PostgreSQL single-user rotation template.
- The custom rotation Lambda `create_secret` step was not idempotent. Added an `AWSPENDING` lookup before creating a pending version so retries do not try to create a different value with the same client request token.
- The custom rotation Lambda `finish_secret` step did not handle the case where the pending version was already current. Added a guard before moving the `AWSCURRENT` staging label.
- The restart-controller step referred to "Reloader or Stakater" as if they were separate products. Changed it to "Stakater Reloader or another restart controller."
- The monitoring example used a non-existent Secrets Manager `RotationFailed` CloudWatch metric. Replaced it with a CloudTrail `lookup-events` command for `RotationFailed` events.

## Review Notes
- The Argo CD Terraform plugin example assumes a config management plugin named `terraform` has already been installed and configured in Argo CD.
- The `${AWS_REGION}` value in the multi-region `ClusterSecretStore` snippet must be rendered by a tool such as Helm, Kustomize, or envsubst before applying the manifest.
