# Validation Summary: How to Use Dapr with Microsoft Entra ID (Azure AD)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Microsoft Entra ID (Azure Active Directory)
- Azure CLI (`az ad app`, `az ad sp`, `az role assignment`, `az cosmosdb sql role assignment`)
- OpenSSL (certificate generation)
- Kubernetes Secrets
- Azure Service Bus (pubsub component)
- Azure Key Vault (secret store component)
- Azure Cosmos DB (RBAC)
- Python (requests library for testing Dapr API)

## Sources Consulted
- Dapr Azure authentication documentation: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/
- Dapr Azure Key Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Azure Service Bus pubsub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Azure CLI `az ad app credential reset` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/credential
- Azure Cosmos DB built-in RBAC role definitions: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac
- Azure Key Vault RBAC roles: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

## Issues Found

### Issue 1: Incorrect claim about certificate expiry
- **What was wrong:** The text stated "Client certificates are more secure than secrets and do not expire by default." This is factually incorrect — all X.509 certificates have an expiry date. The example itself creates a certificate with `-days 365`, which expires in one year.
- **What was changed:** Replaced the claim with "Client certificates are more secure than secrets and are not vulnerable to leaking in logs or environment variables," which accurately describes a real security advantage of certificates over secrets.

### Issue 2: Incomplete certificate configuration for Dapr
- **What was wrong:** The Kubernetes secret stored the certificate (`dapr-cert.pem`) and private key (`dapr-key.pem`) as separate entries. The Dapr component only referenced the certificate (public part) via `azureCertificate`. However, Dapr's `azureCertificate` field requires a PEM bundle containing both the certificate and private key, because Dapr needs the private key to sign JWT assertions during the client certificate authentication flow with Entra ID.
- **What was changed:** Added a step to concatenate the certificate and private key into a single PEM file (`dapr-combined.pem`) and updated the `kubectl create secret` command to store this combined file as the `certificate` key. The Dapr component YAML remains unchanged since it already references the `certificate` key.

## Review Notes
- The post's summary mentions "workload identity federation (via federated credentials)" as an option but doesn't demonstrate it. This isn't an error — the summary is listing options — but readers looking for federated credential setup won't find it here.
- The `az ad app credential reset` command with `--append` will reset existing credentials while adding the new one. Consider using `az ad app credential create` for adding credentials without affecting existing ones, though the current command works for the tutorial context.
- The Cosmos DB built-in role definition ID `00000000-0000-0000-0000-000000000002` (Data Contributor) is correct.
- The Dapr secrets API endpoint format `/v1.0/secrets/{store-name}/{key}` is correct.
- All Azure CLI commands, Dapr component metadata field names (`azureTenantId`, `azureClientId`, `azureClientSecret`, `azureCertificate`, `namespaceName`, `vaultName`), and `secretKeyRef` format are verified correct.
