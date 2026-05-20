# Validation Summary: How to Manage Secrets with ArgoCD and AWS Secrets Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ArgoCD
- Amazon EKS
- AWS Secrets Manager
- AWS IAM Roles for Service Accounts (IRSA)
- External Secrets Operator
- Kubernetes Secrets
- Kustomize
- AWS CLI
- eksctl

## Sources Consulted
- Amazon EKS: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS: Assign IAM roles to Kubernetes service accounts: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- eksctl User Guide: IAM Roles for Service Accounts: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS Secrets Manager Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecretsmanager.html
- AWS CLI Command Reference: secretsmanager rotate-secret: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CLI Command Reference: cloudtrail lookup-events: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- External Secrets Operator latest ClusterSecretStore API documentation: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator latest ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator stability and support documentation: https://external-secrets.io/latest/introduction/stability-support/
- External Secrets Operator v0.17.0 release notes: https://newreleases.io/project/github/external-secrets/external-secrets/release/v0.17.0
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- The OIDC verification command only retrieved the EKS issuer URL and did not verify whether an IAM OIDC provider existed for IRSA. Updated the snippet to retrieve the issuer ID, check `aws iam list-open-id-connect-providers`, and create the provider only when no match is returned.
- The IAM policy included `secretsmanager:ListSecrets` in a resource-scoped statement. AWS documents `ListSecrets` without resource-level permissions, and the shown ExternalSecret examples do not require it. Removed `ListSecrets` from the least-privilege policy.
- The ESO installation was pinned to chart `0.10.0`, and the CR examples used `external-secrets.io/v1beta1`. ESO documentation now only supports the current minor release, and v0.17.0 stopped serving `v1beta1` APIs. Updated the chart target revision to `2.5.0` and changed `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.

## Review Notes
The remaining AWS CLI commands, IRSA trust policy shape, ArgoCD Helm Application fields, ESO `ClusterSecretStore`/`ExternalSecret` field names, Kustomize JSON patches, Secrets Manager rotation command, and CloudTrail lookup command were consistent with the consulted official documentation. The workspace does not have `aws` or `eksctl` installed, so CLI checks were performed against official command references rather than local `--help` output.
