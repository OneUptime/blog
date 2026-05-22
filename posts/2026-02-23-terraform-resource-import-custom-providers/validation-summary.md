# Validation Summary: How to Implement Resource Import in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform Plugin Framework
- Terraform Plugin SDKv2
- Terraform Plugin Testing
- Go
- Terraform provider development

## Sources Consulted
- Terraform Plugin Framework resource import documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/import
- Terraform Plugin Framework resource read documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/read
- Terraform Plugin Framework import tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-resource-import
- Terraform CLI import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- Terraform Plugin SDKv2 resource import documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/resources/import
- Terraform Plugin SDKv2 helper/schema API documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema
- Terraform Plugin Testing import mode documentation: https://developer.hashicorp.com/terraform/plugin/testing/acceptance-tests/import-mode
- Terraform Plugin Framework write-only arguments documentation: https://developer.hashicorp.com/terraform/plugin/framework/resources/write-only-arguments

## Issues Found
- The composite import acceptance test referenced `yourservice_server.test.id` without defining `yourservice_server.test` in the test configuration. I added the server resource to the same `Config` block so the Terraform configuration is valid.
- The write-only attribute schema example described write-only handling but used only `Sensitive: true` and `UseStateForUnknown()`. Sensitive attributes are still persisted in state, and `UseStateForUnknown()` is not how Plugin Framework marks an attribute as write-only. I changed the example to use `WriteOnly: true` and added the Terraform 1.11+ support caveat.

## Review Notes
The remaining import examples align with the official Plugin Framework, SDKv2, Terraform CLI, and Plugin Testing documentation. The snippets are illustrative and omit surrounding provider boilerplate such as schemas, client setup, and imports for some partial examples.
