# Validation Summary: How to Build Terraform Data Source Schemas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (data sources, resources, HCL)
- terraform-plugin-framework (HashiCorp's modern provider SDK)
- terraform-plugin-framework-validators
- terraform-plugin-testing
- Go (programming language for provider development)

## Sources Consulted
- terraform-plugin-framework official docs: https://developer.hashicorp.com/terraform/plugin/framework
- Data sources section: https://developer.hashicorp.com/terraform/plugin/framework/data-sources
- Schema attribute types: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes
- Validators docs: https://developer.hashicorp.com/terraform/plugin/framework/validation
- terraform-plugin-framework-validators repo: https://github.com/hashicorp/terraform-plugin-framework-validators
- terraform-plugin-testing docs: https://developer.hashicorp.com/terraform/plugin/testing
- Plugin framework `types` package reference (StringValue/Int64Value/MapValueFrom semantics)

## Issues Found
No technical issues found.

Verified specifically:
- Package import paths (`datasource`, `datasource/schema`, `types`, `terraform-plugin-framework-validators/stringvalidator`, `int64validator`, `schema/validator`, `terraform-plugin-testing/helper/resource`) are all correct.
- Interface names `datasource.DataSource` and `datasource.DataSourceWithConfigure` are accurate.
- Method signatures for `Metadata`, `Schema`, `Configure`, and `Read` (with their `*Request`/`*Response` types) match the framework.
- Schema attribute types (`StringAttribute`, `Int64Attribute`, `BoolAttribute`, `MapAttribute`, `SingleNestedAttribute`, `ListNestedAttribute`, `NestedAttributeObject`) are correct.
- `types.StringValue`, `types.Int64Value`, `types.MapValueFrom`, and `types.StringType` usage matches the official API.
- Custom validator pattern (implementing `Description`, `MarkdownDescription`, `ValidateString`) is correct.
- Acceptance test helpers (`resource.Test`, `resource.TestCase`, `ProtoV6ProviderFactories`, `ComposeAggregateTestCheckFunc`, `TestCheckResourceAttr`, `TestCheckResourceAttrSet`) are all from the correct package.
- The `types.Number` description ("arbitrary precision") is accurate — it wraps `*big.Float`.
- HCL usage and `data.example_servers.production.servers[*].id` splat expression are valid Terraform syntax.

## Review Notes
- Some Go code excerpts use `fmt`, `time`, `strings`, and `regexp` without showing their imports in the snippet. This is acceptable as these are illustrative excerpts rather than complete files, and adding them would clutter the examples.
- The provider snippet (`Registering Data Sources with the Provider`) imports `provider/schema` and `resource` but does not use them in the shown code. Again, acceptable as an excerpt where the omitted `Schema`/`Resources` method bodies would use those packages.
- `go get github.com/hashicorp/terraform-plugin-go` is shown in setup. This is generally pulled in as an indirect dependency, so the explicit `go get` isn't strictly required, but it isn't wrong either.
- The `ServerWithNetworkModel` uses `*NetworkConfigModel` pointer for a `SingleNestedAttribute`, which is a valid pattern (the alternative is `types.Object` with attribute types).
- No version pinning is shown for `terraform-plugin-framework`; readers should check the latest released version when following along.
