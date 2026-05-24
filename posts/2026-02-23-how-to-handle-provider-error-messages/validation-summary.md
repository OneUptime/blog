# Validation Summary: How to Handle Provider Error Messages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform diagnostics package (`diag`)
- Terraform path package (`path`)
- Terraform logging package (`tflog` from `github.com/hashicorp/terraform-plugin-log`)
- Go standard library (`net/http`, `fmt`, `strings`)
- Custom Terraform provider development patterns (CRUD operations)

## Sources Consulted
- HashiCorp Terraform Plugin Framework Diagnostics docs: https://developer.hashicorp.com/terraform/plugin/framework/diagnostics
- HashiCorp Terraform Plugin Framework resources docs: https://developer.hashicorp.com/terraform/plugin/framework/resources
- HashiCorp Terraform Plugin Framework path docs: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/paths
- HashiCorp tflog package docs: https://developer.hashicorp.com/terraform/plugin/log/writing
- Go `net/http` package docs for HTTP status code constants

## Issues Found
No technical issues found.

All API surfaces used in the post are correct:
- `resp.Diagnostics.AddError(summary, detail)`, `AddWarning(summary, detail)`, `AddAttributeError(path, summary, detail)`, `HasError()`, and `Append(...)` match the Plugin Framework `diag.Diagnostics` API.
- `path.Root("name")` and chained `AtListIndex(i).AtName("name")` are valid path-construction calls.
- `resp.State.RemoveResource(ctx)` is the correct way to remove a resource from state during Read when an upstream resource has been deleted.
- `tflog.Warn(ctx, "message", map[string]interface{}{...})` matches the `tflog` API.
- HTTP status code constants (`StatusNotFound`, `StatusConflict`, `StatusUnauthorized`, `StatusForbidden`, `StatusBadRequest`, `StatusUnprocessableEntity`) are all valid `net/http` constants.
- Resource type signatures (`resource.CreateRequest`, `resource.CreateResponse`, `resource.ReadRequest`, `resource.ReadResponse`) are correct.

## Review Notes
- The type assertion pattern `if apiErr, ok := err.(*APIError); ok` works for direct errors but does not unwrap errors wrapped with `fmt.Errorf("...%w", err)`. For robustness with wrapped errors, `errors.As(err, &apiErr)` from the `errors` package is generally preferred. The post's pattern is still valid and commonly seen in provider codebases, so it is not technically incorrect — just something to consider for future-proofing.
- The post's best-practice guidance (include request IDs, log before erroring, never expose secrets, prefer attribute errors) aligns with HashiCorp's own provider design recommendations.
- The `TF_LOG=debug` mention in the best practices is accepted by Terraform (log levels are case-insensitive in modern Terraform releases; canonical values are `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`).
