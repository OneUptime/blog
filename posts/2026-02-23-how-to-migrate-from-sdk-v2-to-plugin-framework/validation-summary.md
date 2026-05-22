# Validation Summary: How to Migrate from SDK v2 to Plugin Framework

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Terraform Plugin SDK v2
- Terraform Plugin Framework
- terraform-plugin-mux
- Terraform plugin protocol v5 and v6
- Go provider development

## Sources Consulted
- HashiCorp Terraform Plugin Framework migration guide: https://developer.hashicorp.com/terraform/plugin/framework/migrating
- HashiCorp mux migration guide: https://developer.hashicorp.com/terraform/plugin/framework/migrating/mux
- HashiCorp provider migration guide: https://developer.hashicorp.com/terraform/plugin/framework/migrating/providers
- HashiCorp schema migration guide: https://developer.hashicorp.com/terraform/plugin/framework/migrating/schema
- HashiCorp Plugin Framework provider documentation: https://developer.hashicorp.com/terraform/plugin/framework/providers
- Go package documentation for terraform-plugin-mux tf5to6server: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-mux/tf5to6server
- Go package documentation for terraform-plugin-framework/provider: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/provider
- Go package documentation for terraform-plugin-sdk/v2/helper/schema: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema

## Issues Found
- The mux server example used `tf6server.UpgradeServer`, which is not the documented API for translating an SDK v2 protocol 5 server to protocol 6. Updated the example to import `tf5to6server` and call `tf5to6server.UpgradeServer`.
- The mux server example referenced `tfprotov5.ProviderServer` without importing `tfprotov5`, and imported `plugin` without using it. Added the missing import and removed the unused import.
- The mux server example did not check the error returned from the SDK server upgrade before using the upgraded server. Added an immediate error check.
- The SDK v2 provider example kept `DefaultFunc` entries in the provider schema while discussing muxed migration. HashiCorp documents that SDK v2 `Default` and `DefaultFunc` usage can cause mux prepared-configuration mismatches and should be moved into provider configuration logic. Removed those schema defaults and added a note explaining the move.
- The Plugin Framework provider example returned `provider.Provider` but did not implement the required `Metadata` and `Configure` methods. Added those methods and an interface assertion so the example reflects the current `provider.Provider` interface.
- The migration strategy wording implied incremental migration never requires a major version bump. Added a caveat because the protocol version 6 mux path can change Terraform CLI compatibility and should be treated as breaking if it drops previously supported CLI versions.

## Review Notes
The resource migration snippets are intentionally partial and omit imports plus full `Read`, `Update`, `Delete`, metadata, and configure implementations. They are technically consistent as focused excerpts, but a future expansion could include a complete resource implementation showing `resource.ResourceWithConfigure` and importer/state upgrade handling.
