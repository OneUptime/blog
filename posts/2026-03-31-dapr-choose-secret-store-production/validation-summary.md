# Validation Summary: How to Choose the Right Secret Store for Dapr in Production

## Status
validated

## Post Type
Guide / Decision Framework

## Technologies Covered
- Dapr (secret store components)
- AWS Secrets Manager
- AWS SSM Parameter Store
- Azure Key Vault
- GCP Secret Manager
- HashiCorp Vault
- OpenBao
- Kubernetes Secrets

## Sources Consulted
- Dapr Supported Secret Stores Reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/
- Dapr HashiCorp Vault Component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Kubernetes Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- AWS Secrets Manager Pricing: https://aws.amazon.com/secrets-manager/pricing/
- Azure Key Vault Pricing: https://azure.microsoft.com/en-us/pricing/details/key-vault/
- GCP Secret Manager Pricing: https://cloud.google.com/secret-manager/pricing
- OpenBao Documentation: https://openbao.org/

## Issues Found
1. **Incorrect Dapr component type for AWS Secrets Manager**: The post used `secretstores.aws.secretsmanager` (with an extra 's'). The correct Dapr component type is `secretstores.aws.secretmanager`. Fixed in the table.
2. **AWS Secrets Manager pricing understated**: The post listed ~$0.30/month per secret. The actual AWS pricing is $0.40/month per secret. Corrected to ~$0.40/month.
3. **GCP Secret Manager pricing overstated**: The post listed $0.06 per 10,000 accesses. The actual GCP pricing is $0.03 per 10,000 access operations (the $0.06 figure relates to active secret version storage, not access operations). Corrected to $0.03 per 10,000 access operations.

## Review Notes
- The HashiCorp Vault YAML example is correct but minimal. It only shows `vaultAddr` and `vaultTokenMountPath`, which are valid metadata fields. Production deployments would typically also configure TLS settings (`caCert`, `skipVerify`) and engine path, but the example is appropriate for a guide-level overview.
- The Kubernetes secret store correctly shows empty metadata, though optional fields like `defaultNamespace` exist.
- OpenBao is accurately described as a Vault-compatible open-source alternative. Dapr also has a dedicated `secretstores.openbao` component type, though using `secretstores.hashicorp.vault` would also work due to API compatibility.
- The post mentions Alibaba in the decision criteria but does not include it in the cloud-native options table. Dapr does support `secretstores.alibabacloud.parameterstore`, which could be a useful addition in a future update.
- Pricing figures are approximate and may change over time; readers should verify current pricing with their cloud provider.
