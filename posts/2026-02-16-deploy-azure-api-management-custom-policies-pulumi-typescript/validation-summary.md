# Validation Summary: How to Deploy Azure API Management with Custom Policies Using Pulumi TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- Pulumi Azure Native provider
- TypeScript
- APIM policies
- APIM products and subscriptions
- APIM response caching

## Sources Consulted
- Pulumi Azure Native ApiManagementService docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/apimanagementservice/
- Pulumi Azure Native Api docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/api/
- Pulumi Azure Native ApiOperation docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/apioperation/
- Pulumi Azure Native ApiPolicy docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/apipolicy/
- Pulumi Azure Native ApiOperationPolicy docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/apioperationpolicy/
- Pulumi Azure Native Product docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/product/
- Pulumi Azure Native ProductApi docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/productapi/
- Pulumi Azure Native ProductPolicy docs: https://www.pulumi.com/registry/packages/azure-native/api-docs/apimanagement/productpolicy/
- Pulumi CLI `pulumi new` docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Microsoft Learn API Management policy REST format docs: https://learn.microsoft.com/en-us/rest/api/apimanagement/api-policy/create-or-update?view=rest-apimanagement-2024-05-01
- Microsoft Learn `validate-jwt` policy docs: https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn `rate-limit-by-key` policy docs: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Microsoft Learn `cache-lookup` policy docs: https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn `cache-store` policy docs: https://learn.microsoft.com/en-us/azure/api-management/cache-store-policy
- Microsoft Learn `rate-limit` policy docs: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn `quota` policy docs: https://learn.microsoft.com/en-us/azure/api-management/quota-policy
- Microsoft Learn Product REST API docs: https://learn.microsoft.com/en-us/rest/api/apimanagement/product/create-or-update?view=rest-apimanagement-2024-05-01

## Issues Found
- The APIM policy resources used `format: "xml"` while the snippets provide raw policy XML in TypeScript template strings. Changed API, operation, and product policies to `format: "rawxml"` to match the Azure API Management policy content format for inline non-XML-encoded policy documents.
- The `rate-limit-by-key` `increment-condition` attribute contained unescaped XML special characters (`&&` and `<`). Escaped them as `&amp;&amp;` and `&lt;` so the policy XML is well-formed.
- The API-level policy used `cache-store` without a corresponding `cache-lookup`, and the operation-level policy also used caching. Removed API-level response caching to avoid an invalid or conflicting cache policy, leaving caching in the operation-level example where the matching lookup and store are shown together.
- The operation-level cache policy did not account for requests with an `Authorization` header. Added `allow-private-response-caching="true"` and varied the cache by the `Authorization` header so authenticated GET responses can be cached without sharing entries across tokens.
- The product example set `subscriptionsLimit` while also setting `subscriptionRequired: true`. Current Microsoft Product REST API documentation marks `subscriptionsLimit` as conditional, so the property was removed from the protected product example.

## Review Notes
The placeholder JWT values (`{tenant-id}` and `{api-audience}`) still need to be replaced with real tenant and audience values before deployment. The sample IP allowlist uses a private address range and will deny callers outside that range unless it is adjusted for the deployment network.
