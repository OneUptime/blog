# Validation Summary: How to Test Custom Terraform Providers with Acceptance Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin Testing
- Terraform provider acceptance testing
- Go testing
- Terraform CLI

## Sources Consulted
- HashiCorp Developer: Terraform Plugin Framework acceptance tests: https://developer.hashicorp.com/terraform/plugin/framework/acctests
- HashiCorp Developer: Terraform plugin acceptance testing: https://developer.hashicorp.com/terraform/plugin/testing/acceptance-tests
- HashiCorp Developer: Acceptance testing import mode: https://developer.hashicorp.com/terraform/plugin/testing/acceptance-tests/import-mode
- Go package documentation for terraform-plugin-testing/helper/resource: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/helper/resource
- Go package documentation for terraform-plugin-testing/helper/acctest: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/helper/acctest
- Go package documentation for terraform-plugin-framework: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework
- Go package documentation for terraform-plugin-testing: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing
- Go command documentation: https://pkg.go.dev/cmd/go

## Issues Found
- The dependency snippet used older `terraform-plugin-framework` and `terraform-plugin-testing` versions. Updated them to the current released versions verified on pkg.go.dev: `terraform-plugin-framework v1.19.0` and `terraform-plugin-testing v1.16.0`.
- The custom check function snippet used `context`, `fmt`, `resource`, and `terraform.State` without showing the required imports. Added the imports so the example is technically complete.
- The invalid-region error test snippet used `regexp` and testing APIs without showing imports. Added the imports needed for that standalone example.

## Review Notes
The article's main acceptance testing workflow is accurate: `resource.Test` requires `TF_ACC`, `ProtoV6ProviderFactories` is the correct field for protocol v6 framework providers, import verification uses `ImportState` and `ImportStateVerify`, `CheckDestroy` verifies cleanup after destroy, and Go's `-parallel` flag controls parallel test execution when tests use parallel execution. The example API client functions and provider resource names are illustrative and would need to match a real provider implementation.
