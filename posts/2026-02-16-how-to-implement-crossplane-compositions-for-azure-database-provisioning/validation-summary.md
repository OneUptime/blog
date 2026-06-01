# Validation Summary: How to Implement Crossplane Compositions for Azure Database Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Crossplane
- Crossplane CompositeResourceDefinitions and Compositions
- Crossplane Function Patch and Transform
- Upbound Azure SQL provider
- Azure SQL Database
- Kubernetes custom resources and Secrets
- Helm and kubectl

## Sources Consulted
- Crossplane Composition documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/v2.3/composition/composite-resource-definitions/
- Crossplane connection details documentation: https://docs.crossplane.io/v1.20/concepts/connection-details/
- Crossplane claims documentation: https://docs.crossplane.io/v1.19/concepts/claims/
- Upbound provider-azure-sql MSSQLServer API reference: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v1.7.0/resources/sql.azure.upbound.io/MSSQLServer/v1beta1
- Upbound provider-azure-sql MSSQLDatabase API reference: https://marketplace.upbound.io/providers/upbound/provider-azure-sql/v0.39.0/resources/sql.azure.upbound.io/MSSQLDatabase/v1beta1
- Upbound provider-family-azure ResourceGroup API reference: https://marketplace.upbound.io/providers/upbound/provider-family-azure/v1.7.0/resources/azure.upbound.io/ResourceGroup/v1beta1
- Microsoft Azure SQL Database DTU purchasing model documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-dtu
- Microsoft Azure SQL Database DTU resource limits documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases

## Issues Found
- The Composition used legacy native `resources` mode implicitly. Crossplane documentation states native patch and transform was deprecated in favor of `mode: Pipeline` with `function-patch-and-transform`, so the Composition was updated to use the function pipeline form.
- The setup installed only the Azure provider, but the corrected Composition requires the patch-and-transform function. Added a `Function` manifest for `function-patch-and-transform`.
- The SQL Server `administratorLoginPasswordSecretRef` was missing the required `name` field. Added the `name: sql-admin-password` field and added a matching `kubectl create secret` command.
- The post claimed the Composition provisioned diagnostic settings, but no diagnostic setting managed resource was included. Removed diagnostic settings from the text and diagram rather than adding unrelated provider resources.
- The post claimed the claim secret would contain connection details, but the Composition did not define `connectionDetails`, did not configure the aggregate connection secret name, and the XRD did not expose connection keys. Added `connectionSecretKeys` to the XRD, `writeConnectionSecretToRef` to the function input, and `connectionDetails` for the SQL Server endpoint and username.
- The string transform omitted the explicit `type: Format` used by the current Function Patch and Transform API. Added it to the transform.
- The `maxSizeGb` map emitted quoted string values for a numeric field. Changed those values to numbers.
- The external-name field path was updated to the quoted annotation form, `metadata.annotations["crossplane.io/external-name"]`.
- The status fields declared in the XRD were never populated. Added `ToCompositeFieldPath` patches for `status.serverFqdn` and `status.databaseId`.
- The status command used the singular resource name. Updated it to `kubectl get xdatabases -o wide`.
- The environment-specific routing explanation implied Crossplane automatically selected a Composition from the `environment` parameter. Reworded it to describe routing with labels and composition selectors.
- The deletion-policy guidance referred to "Composition resources" imprecisely. Reworded it to refer to managed resource templates in the Composition.

## Review Notes
The examples remain version-sensitive because the Upbound Azure providers have multiple major lines with different API groups and scoping behavior. The post now avoids deprecated Crossplane composition mode, but teams should still verify provider package versions and API groups against the exact Crossplane and provider versions installed in their clusters.
