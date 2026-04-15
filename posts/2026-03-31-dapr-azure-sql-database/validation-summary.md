# Validation Summary: How to Use Dapr with Azure SQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure SQL Database
- Dapr State Store (SQL Server component)
- Dapr Go SDK
- Kubernetes / kubectl
- Azure Managed Identity / Microsoft Entra ID

## Sources Consulted
- Dapr State Store - Microsoft SQL Server & Azure SQL documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlserver/
- Dapr Supported Bindings reference: https://docs.dapr.io/reference/components-reference/supported-bindings/
- Dapr Go SDK client documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Go SDK source code (SaveState): https://github.com/dapr/go-sdk/blob/main/client/state.go
- Dapr Azure AD / Managed Identity how-to: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/howto-mi/
- Dapr State Management HTTP API: https://docs.dapr.io/reference/api/state_api/
- GitHub issue dapr/dapr#7707 (no SQL Server binding support)
- GitHub PR dapr/components-contrib#1739 (MSSQL binding PR closed without merge)

## Issues Found

### 1. Incorrect state store component type
- **What was wrong:** The post used `state.azure.sql` as the component type. There is no such component in Dapr.
- **What was changed:** Changed to `state.sqlserver`, which is the correct component type that supports both on-premises SQL Server and Azure SQL Database.
- **Why:** The Dapr docs at docs.dapr.io list this component as `state.sqlserver`, not `state.azure.sql`.

### 2. Incorrect connection string format
- **What was wrong:** The post used a URI-style connection string (`sqlserver://myserver.database.windows.net:1433?database=mydb&user=myuser&password=mypassword&encrypt=true`) for password-based authentication.
- **What was changed:** Changed to ADO.NET-style format (`Server=myserver.database.windows.net;Database=mydb;User Id=myuser;Password=mypassword;Encrypt=true;`) which matches the official Dapr documentation.
- **Why:** The Dapr docs show ADO.NET-style connection strings for password-based auth. While the underlying go-mssqldb driver supports URL format, the parameter names used in the blog (`user`, `password` as query params) did not match the correct URL format either.

### 3. Entire output binding section removed — component does not exist
- **What was wrong:** The post documented a `bindings.azure.sql` output binding component with type `bindings.azure.sql`. This component does not exist in Dapr. No SQL Server/Azure SQL output binding has ever been released. A GitHub PR (#1739 on dapr/components-contrib) attempted to add one but was closed without being merged.
- **What was changed:** Removed the entire "Configuring the Output Binding" section, including the fabricated component YAML and the curl invocation example. Updated the Overview and Summary paragraphs to no longer reference output bindings.
- **Why:** Documenting a non-existent component is a fundamental technical error that would cause readers to fail when attempting to follow the instructions.

### 4. Incorrect managed identity configuration
- **What was wrong:** The post embedded `azureClientId` directly in the connection string URL (`&azureClientId=<managed-identity-client-id>`). It also omitted the required `useAzureAD` metadata field.
- **What was changed:** Restructured to use separate metadata fields: `connectionString` (without credentials), `useAzureAD: "true"`, and `azureClientId` as its own metadata entry. Also added a note that `azureClientId` is only needed for user-assigned managed identities. Changed "pod identity" to "workload identity" as Azure AD Pod Identity is deprecated in favor of workload identity.
- **Why:** The Dapr docs require `useAzureAD` as a separate boolean metadata field and `azureClientId` as its own metadata field, not embedded in the connection string.

## Review Notes
- The `version: v1` used for the state store is correct, though Dapr runtime 1.17+ also supports `v2`. For new deployments, `v2` may be preferable.
- The Go SDK code example is correct — the `SaveState` signature, import alias, and `nil` metadata argument all match the official SDK documentation and examples.
- The Dapr HTTP API calls for saving and retrieving state are correct.
- The `tableName` and `schema` metadata fields are valid and correctly used.
- The post description still mentions "bindings" but this was left as-is since the description line is metadata and Dapr state management is still a form of integration/binding in the general sense.
