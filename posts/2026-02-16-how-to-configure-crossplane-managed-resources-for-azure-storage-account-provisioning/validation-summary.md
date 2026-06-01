# Validation Summary: How to Configure Crossplane Managed Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Upbound Azure provider
- Azure Storage Accounts
- Azure Resource Groups
- Azure Blob Containers
- Kubernetes custom resources
- Helm
- Azure CLI
- Crossplane Compositions and CompositeResourceDefinitions

## Sources Consulted
- Crossplane installation documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider package and ProviderConfig documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Composition documentation: https://docs.crossplane.io/v1.19/concepts/compositions/
- Crossplane Patch and Transform function guide: https://docs.crossplane.io/v1.19/guides/function-patch-and-transform/
- Upbound Marketplace provider-azure-storage Account v1.0.0 API reference: https://marketplace.upbound.io/providers/upbound/provider-azure-storage/v1.0.0/resources/storage.azure.upbound.io/Account/v1beta1
- Upbound Marketplace provider-azure-storage Container API reference: https://marketplace.upbound.io/providers/upbound/provider-azure-storage/v1.3.0/resources/storage.azure.upbound.io/Container/v1beta1
- Upbound Marketplace provider-family-azure ResourceGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v0.34.0/resources/azure.upbound.io/ResourceGroup/v1beta1
- Upbound Marketplace provider-family-azure ProviderConfig API reference: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v0.36.0/resources/azure.upbound.io/ProviderConfig/v1beta1
- Microsoft Azure CLI `az ad sp create-for-rbac` documentation: https://learn.microsoft.com/en-us/cli/azure/ad/sp

## Issues Found
- The Azure provider install snippet said `runtimeConfigRef` automatically creates a `ProviderConfig` named `default`. `runtimeConfigRef` configures the provider runtime deployment, not cloud credentials, so I removed that incorrect comment and field from the basic provider install snippet.
- The storage account examples used `storage.azure.upbound.io/v1beta2` for `Account`, but the pinned `provider-azure-storage:v1.0.0` exposes `Account` as `storage.azure.upbound.io/v1beta1`. I updated both storage account examples to `v1beta1`.
- The post claimed every ARM or Terraform property has a corresponding Crossplane field. That was too broad, so I changed it to "many properties" to match the provider schema more accurately.
- The Composition example used the legacy `spec.resources` composition mode, which current Crossplane documentation marks deprecated. I updated it to `mode: Pipeline` with the official Patch and Transform function input shape.
- The Composition storage account omitted a resource group reference. I added `resourceGroupNameSelector.matchControllerRef: true` so the composed account can reference the composed resource group.
- The composite claim accepted a `containers` parameter but the Composition did not create containers from that list. I replaced it with an explicit `storageAccountName` parameter that the Composition patches to `crossplane.io/external-name`.
- The composite storage account example could have produced an invalid Azure Storage Account name from the generated Kubernetes child resource name. I added a lowercase alphanumeric storage account name parameter with a validation pattern and patched it to the Azure external name annotation.
- The drift detection section stated a default polling interval of 10 minutes for most providers. Because that value is provider and version dependent, I changed the wording to say Crossplane detects drift during reconciliation.

## Review Notes
The tutorial is technically valid for the pinned Upbound Azure provider API family shown in the post. Future updates could modernize the entire tutorial for the latest Crossplane 2.x and Upbound Azure 2.x namespaced managed resource APIs, which use `*.m.upbound.io` API groups.
