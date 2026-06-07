# Validation Summary: How to Use Pulumi with Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi CLI and Pulumi Cloud
- `@pulumi/azure-native` provider (TypeScript SDK)
- `pulumi_azure_native` provider (Python SDK)
- `@pulumi/random` (RandomPassword)
- `@pulumi/policy` (CrossGuard)
- Azure Resource Manager (Resource Groups, Storage Accounts, Virtual Networks, Subnets, Private Endpoints)
- Azure Kubernetes Service (AKS) — `containerservice.ManagedCluster`
- Azure SQL Database / SQL Server
- Azure Key Vault
- Azure App Service (Web App)
- Azure Monitor / Log Analytics (`operationalinsights.Workspace`)
- Azure CLI (`az`) for authentication and storage container provisioning
- GitHub Actions (`pulumi/actions@v5`)
- Azure DevOps Pipelines
- Mocha unit testing with `pulumi.runtime.setMocks`

## Sources Consulted
- Pulumi Azure Native provider documentation — https://www.pulumi.com/registry/packages/azure-native/
- Pulumi CLI installation docs — https://www.pulumi.com/docs/install/
- Pulumi Azure setup / authentication — https://www.pulumi.com/registry/packages/azure-native/installation-configuration/
- Pulumi Azure Blob storage backend — https://www.pulumi.com/docs/concepts/state/#azure-blob-storage
- Pulumi CrossGuard policy docs — https://www.pulumi.com/docs/using-pulumi/crossguard/
- Pulumi testing docs (mocks) — https://www.pulumi.com/docs/using-pulumi/testing/unit/
- Pulumi GitHub Actions — https://github.com/pulumi/actions
- Azure CLI `az login` reference — https://learn.microsoft.com/cli/azure/authenticate-azure-cli
- Azure REST/ARM property names for `Microsoft.Storage/storageAccounts` (`enableHttpsTrafficOnly`, `minimumTlsVersion`), `Microsoft.Sql/servers` (`minimalTlsVersion`, `publicNetworkAccess`), `Microsoft.KeyVault/vaults`, `Microsoft.ContainerService/managedClusters` — Microsoft Learn (learn.microsoft.com)

## Issues Found
- Markdown heading defect: the "Resource Drift" subsection in the Troubleshooting area was missing its `###` heading marker (it appeared as a bare line of text), breaking the heading hierarchy with the sibling "Authentication Errors" and "State Lock Issues" subsections. Fixed by prefixing it with `###`.

No other technical issues were found. The Pulumi CLI commands, resource type names, property names, enum identifiers, ARM env-var names (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`), and CI/CD configuration all match current official documentation.

## Review Notes
- The TypeScript code uses `azure.storage.listStorageAccountKeysOutput(...)` (the `*Output` variant) which is the idiomatic way to call data-source functions with `Input` values. The Python equivalent calls `storage.list_storage_account_keys(...)` inside an `apply`. This works because Pulumi's `apply` unwraps awaitable return values, but the modern idiom would be `storage.list_storage_account_keys_output(...)`. Not incorrect, just less idiomatic.
- The `calculateSubnet` helper destructures `[network, cidr]` but never uses `cidr`. The compiler will emit an unused-variable warning under strict settings, but the produced CIDR blocks (`/24` subnets carved out of a `/16`) are correct.
- The AKS sample sets `enableRBAC: true` and `aadProfile.managed: true` / `enableAzureRBAC: true`. Azure has been steering customers toward Workload Identity for newer workloads, but AAD-integrated AKS with managed AAD remains supported and is a valid choice.
- The Key Vault sample sets `enableSoftDelete: true`. Soft-delete on Azure Key Vault is mandatory and cannot be disabled on new vaults, so the explicit setting is harmless but redundant.
- `kubernetesVersion: "1.29"` is pinned; readers should consult the AKS supported versions page when adopting, as supported versions roll forward.
- `pulumi/actions@v5` is current at time of review. Readers may want to track newer major versions over time.
- The `pulumi login azblob://state?storage_account=pulumistate` form uses the query-string variant; the env-var approach (`AZURE_STORAGE_ACCOUNT`) shown in the next snippet is the more commonly documented path. Both are supported.
