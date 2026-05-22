# Validation Summary: How to Use the Terraform Plugin SDK v2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin SDK v2
- Terraform Plugin Framework
- terraform-plugin-mux
- Go
- Terraform provider schemas, resources, data sources, CRUD functions, validation, imports, and timeouts

## Sources Consulted
- HashiCorp Developer: Terraform Plugin SDKv2 Schemas - https://developer.hashicorp.com/terraform/plugin/sdkv2/schemas
- HashiCorp Developer: Terraform Plugin SDKv2 Schema Behaviors - https://developer.hashicorp.com/terraform/plugin/sdkv2/schemas/schema-behaviors
- HashiCorp Developer: Terraform Plugin SDKv2 Retries and Customizable Timeouts - https://developer.hashicorp.com/terraform/plugin/sdkv2/resources/retries-and-customizable-timeouts
- HashiCorp Developer: Terraform Plugin SDK v2 Upgrade Guide - https://developer.hashicorp.com/terraform/plugin/sdkv2/guides/v2-upgrade-guide
- HashiCorp Developer: Terraform Plugin Framework migration using a mux server - https://developer.hashicorp.com/terraform/plugin/framework/migrating/mux
- HashiCorp Developer: Combining and Translating Providers - https://developer.hashicorp.com/terraform/plugin/mux
- Go package documentation: terraform-plugin-sdk/v2/helper/schema - https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema
- Go package documentation: terraform-plugin-sdk/v2/plugin - https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/plugin
- Go package documentation: terraform-plugin-sdk/v2/helper/validation - https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/validation
- Go package documentation: terraform-plugin-framework/providerserver - https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver

## Issues Found
- The initial SDKv2 `main.go` snippet imported `helper/schema` but did not use it, which would cause a Go compile error. Removed the unused import.
- The resource schema snippet used `time.Minute` in `schema.DefaultTimeout(...)` without importing `time`. Added the missing `time` import.
- The schema examples used the deprecated `ValidateFunc` field. Updated them to `ValidateDiagFunc` and used `validation.ToDiagFunc(...)` for SDK helper validators, matching current SDKv2 diagnostics guidance.
- The custom validation examples used the deprecated `ValidateFunc` signature. Updated them to `ValidateDiagFunc`-compatible functions returning `diag.Diagnostics`.
- The mux server example attempted to pass an SDKv2 protocol 5 provider server directly to `tf6muxserver`. Updated the example to use `tf5to6server.UpgradeServer(...)` before combining it with the Plugin Framework protocol 6 provider.
- The mux server example ignored the error returned by `tf6server.Serve(...)`. Updated the snippet to capture and handle the returned error.
- The CRUD error examples did not include the resource ID even though the post recommends doing so. Updated read, update, and delete errors to include `d.Id()`.

## Review Notes
The article is technically relevant and mostly accurate for maintaining SDKv2 providers. The Plugin Framework remains HashiCorp's recommended path for new provider development, and the mux migration guidance is valid when the SDKv2 and framework provider schemas/configuration behavior are kept compatible.
