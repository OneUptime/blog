# Validation Summary: How to Create a Custom Terraform Provider from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Plugin Framework
- Terraform provider development
- Go
- Terraform CLI
- HCL

## Sources Consulted
- HashiCorp Terraform Plugin Framework overview: https://developer.hashicorp.com/terraform/plugin/framework
- HashiCorp Terraform Plugin Framework provider implementation docs: https://developer.hashicorp.com/terraform/plugin/framework/providers
- HashiCorp Terraform Plugin Framework debugging docs: https://developer.hashicorp.com/terraform/plugin/framework/debugging
- HashiCorp Terraform Plugin Framework resource read docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/read
- HashiCorp Terraform Plugin Framework resource import docs: https://developer.hashicorp.com/terraform/plugin/framework/resources/import
- HashiCorp Terraform Plugin Framework path handling docs: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/paths
- HashiCorp Terraform CLI configuration docs for provider development overrides and local provider behavior: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform CLI init command reference: https://developer.hashicorp.com/terraform/cli/commands/init

## Issues Found
- The resource import example used `path.Root("id")` without importing the Terraform Plugin Framework `path` package. Added the missing import so the snippet is syntactically complete.
- The provider registered `NewTaskDataSource`, and the project structure listed `data_source_task.go`, but the tutorial never implemented that data source. Changed the example to return `nil` from `DataSources`, removed the unused data source file from the shown structure, and adjusted surrounding text so the tutorial accurately describes a resource-only provider.
- The front matter claimed the tutorial covered publishing to the registry, but no publishing steps were present. Updated the description to cover project setup, compilation, and local testing only.
- Optional/computed attributes such as `status` and `priority` can be unknown in Terraform plans when not configured. Updated the request-building checks to test both `IsNull()` and `IsUnknown()` before reading values.
- The `Read` method claimed to refresh state but only updated a subset of declared attributes. Updated it to refresh all task attributes when present in the API response.
- The `Update` method accepted `priority` and `assignee` in the schema but did not send them to the API. Updated the request body construction to include those attributes when set.
- The `Delete` method did not close the HTTP response body. Updated it to close the response body after a successful delete request.
- The conclusion stated that the tutorial exposes data sources, which was not true after correcting the undefined data source. Updated the wording to say data sources can be added later.

## Review Notes
The code remains an instructional example for a fictional API and still omits production-grade HTTP status validation and JSON decoding diagnostics in several places. Local compilation and Terraform CLI execution could not be performed because `go` and `terraform` are not installed in the review environment.
