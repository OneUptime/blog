# Validation Summary: How to Implement Resource CRUD Operations in Terraform Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin SDKv2 lifecycle concepts
- Go
- Terraform provider resource CRUD operations
- Terraform diagnostics, state handling, and retry patterns

## Sources Consulted
- HashiCorp Terraform Plugin Framework: Create resources: https://developer.hashicorp.com/terraform/plugin/framework/resources/create
- HashiCorp Terraform Plugin Framework: Read resources: https://developer.hashicorp.com/terraform/plugin/framework/resources/read
- HashiCorp Terraform Plugin Framework: Update resources: https://developer.hashicorp.com/terraform/plugin/framework/resources/update
- HashiCorp Terraform Plugin Framework: Delete resources: https://developer.hashicorp.com/terraform/plugin/framework/resources/delete
- HashiCorp Terraform Plugin Framework: Returning errors and warnings: https://developer.hashicorp.com/terraform/plugin/framework/diagnostics
- HashiCorp Terraform Plugin Framework: Map types: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/types/map
- HashiCorp Terraform Plugin Framework: String types: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/types/string
- HashiCorp Terraform Plugin SDKv2 resources: https://developer.hashicorp.com/terraform/plugin/sdkv2/resources

## Issues Found
- The introduction claimed the guide used both the Plugin Framework and SDKv2, but the examples are Plugin Framework examples. Changed the wording to say the guide uses the Plugin Framework and that the lifecycle concepts also apply to SDKv2 resources.
- The lifecycle section implied Terraform calls Read after Create and Update to verify final state. Official framework documentation requires Create and Update to return updated state, while providers commonly reuse Read or equivalent API read logic. Updated the wording to reflect that distinction.
- The Create example could dereference `database.ID` after `waitForDatabaseReady` returned an error and a nil database. Stored the ID in `databaseID` before waiting and used that value in the error path.
- The Create lifecycle text used the SDKv2-specific `ForceNew` term even though the examples are Plugin Framework based. Reworded it to "attribute change requires replacement."
- The retry example described backoff as `1s, 2s, 4s`, but a three-attempt loop only sleeps before the two retry attempts. Updated the code and comment to use `1s, 2s` between retries.
- The best-practice note about saving state after setting the ID did not mention Terraform's error/taint behavior. Reworded it to say saving the ID lets Terraform track the object and mark it for replacement or cleanup.

## Review Notes
The examples are illustrative and depend on placeholder `api` client types and a `DatabaseResourceModel` that are not defined in the post. The Plugin Framework APIs used in the snippets, including diagnostics, `State.Set`, `RemoveResource`, map handling, and string accessors, are current and consistent with official documentation.
