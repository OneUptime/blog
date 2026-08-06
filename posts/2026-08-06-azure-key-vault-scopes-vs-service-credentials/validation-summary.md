# Validation Summary: Azure Key Vault Scopes or Unity Catalog Service Credentials?

## Status
validated

## Post Type
Technical guide and architecture comparison

## Technologies Covered

- Azure Databricks
- Azure Key Vault
- Unity Catalog secret scopes, service credentials, and storage credentials
- Azure Databricks access connectors
- Microsoft Entra ID, managed identities, and service principals
- Azure RBAC and Key Vault access policies
- Azure Private Link and Databricks network connectivity configurations
- Databricks Runtime, SQL warehouses, Python, and the Azure SDK for Python

## Sources Consulted

- [Azure Databricks secret management](https://learn.microsoft.com/en-us/azure/databricks/security/secrets/)
- [Create Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/service-credentials)
- [Manage Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/manage-service-credentials)
- [Use Unity Catalog service credentials](https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-services/use-service-credentials)
- [Configure private connectivity for Azure Databricks serverless compute](https://learn.microsoft.com/en-us/azure/databricks/security/network/serverless-network-security/serverless-private-link)
- [Manage Azure Databricks private endpoint rules and supported resources](https://learn.microsoft.com/en-us/azure/databricks/security/network/serverless-network-security/manage-private-endpoint-rules)
- [Configure network security for Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/network-security)
- [Azure Key Vault trusted services](https://learn.microsoft.com/en-us/azure/key-vault/general/overview-vnet-service-endpoints)
- [Integrate Azure Key Vault with Azure Private Link](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service)
- [Azure Key Vault Python client library quickstart](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-python)
- [Python `SecretClient` API reference](https://learn.microsoft.com/en-us/python/api/azure-keyvault-secrets/azure.keyvault.secrets.secretclient?view=azure-python)

## Issues Found

- The post stated that a Key Vault-backed scope requires public network access and that disabling public network access makes the scope path unsupported. Current Key Vault documentation says the trusted-services bypass continues to apply when public network access is disabled, and Azure Databricks is a listed trusted service. The networking comparison, firewall section, diagram, and conclusion now distinguish the trusted-service path from a private endpoint and explain that a policy must also disallow the bypass to enforce private-endpoint-only access.
- The post described every Azure service credential as managed-identity-backed. Azure Databricks strongly recommends that configuration but also supports Microsoft Entra service principals. The introduction, comparison table, implementation section, and conclusion now identify managed identity as the recommended configuration rather than the only one.
- The post described Azure RBAC as the universal authorization layer for the managed identity. Target services determine their authorization model, and Key Vault can authorize a managed identity with Azure RBAC or a vault access policy. The affected statements now refer to target-service permissions and identify Azure RBAC as typical rather than universal.
- The SQL warehouse limitation was too broad. SQL warehouses do not support the shown `dbutils.credentials` notebook interface, but they do support service credentials in batch Unity Catalog Python UDFs through the UDF-specific API. The runtime requirements now state this exception.

## Review Notes

- The Python `dbutils.secrets.get`, `dbutils.credentials.getServiceCredentialsProvider`, `SecretClient`, and `get_secret` examples match the official APIs and are syntactically correct.
- The `SHOW SERVICE CREDENTIALS`, `DESCRIBE SERVICE CREDENTIAL`, and `GRANT ACCESS` SQL examples match the documented Unity Catalog syntax.
- The Databricks Runtime 16.2 general-availability requirement, 15.4 LTS Public Preview caveat, SQL management-command requirement, default-service-credential limitation, storage-credential distinction, and serverless private endpoint support for Azure Key Vault were current as of validation.
- Service credential runtime, language, compute, networking, and preview support can change; recheck the linked documentation before adopting the pattern as a platform standard.
