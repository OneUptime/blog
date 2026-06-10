# Validation Summary: How to Build Terraform Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (Terraform Core, Terraform CLI)
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform Plugin Testing (`github.com/hashicorp/terraform-plugin-testing`)
- Go (HTTP client, JSON encoding, flag/log packages)
- gRPC (transport between Terraform Core and providers)
- HCL (provider/resource configuration)
- Terraform Registry / local plugin directory layout

## Sources Consulted
- Terraform Plugin Framework documentation: https://developer.hashicorp.com/terraform/plugin/framework
- Plugin Framework provider tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework
- `providerserver.Serve` and `ServeOpts`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver
- Provider interface (`Metadata`, `Schema`, `Configure`, `Resources`, `DataSources`): https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/provider
- Resource interface and `ResourceWithImportState`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource
- `resource.ImportStatePassthroughID` and `path.Root`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource and https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/path
- `stringplanmodifier.UseStateForUnknown`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier
- Acceptance testing helpers (`ProtoV6ProviderFactories`, `resource.TestCase`): https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/helper/resource
- Local plugin install paths: https://developer.hashicorp.com/terraform/cli/config/config-file#implied-local-mirror-directories

## Issues Found
- **Missing `path` import in `item_resource.go`.** The `ImportState` method called `path.Root("id")` but the file's import block did not include `github.com/hashicorp/terraform-plugin-framework/path`. The snippet would not compile as written. Added the missing import so the example builds correctly.

## Review Notes
- The Plugin Framework APIs used (`provider.Provider`, `provider.MetadataRequest/Response`, `provider.SchemaRequest/Response`, `provider.ConfigureRequest/Response`, `resource.Resource`, `resource.ResourceWithImportState`, the `schema` packages, `planmodifier`/`stringplanmodifier`, and `types.String/List`) all match current public APIs.
- `providerserver.ServeOpts{Address, Debug}` and `providerserver.Serve(ctx, factory, opts)` are correct.
- The provider's `Configure` correctly uses `req.Config.Get` and propagates diagnostics, and assigns the client to both `DataSourceData` and `ResourceData` so resources and data sources can type-assert it.
- The resource `Configure` correctly handles the `req.ProviderData == nil` case (called during validation when provider data is not yet available) before type-asserting.
- The `Delete` method does not call `resp.State.RemoveResource(ctx)` — this is fine because the framework removes state automatically after a successful `Delete` that returns no diagnostics.
- The acceptance test uses `ProtoV6ProviderFactories`, which is the recommended field for Plugin Framework providers (which speak protocol v6 by default).
- The local install path layout (`~/.terraform.d/plugins/<HOSTNAME>/<NAMESPACE>/<TYPE>/<VERSION>/<OS_ARCH>/`) is valid. The example uses `darwin_arm64`; readers on other platforms will need to substitute their own `<OS>_<ARCH>` (e.g., `linux_amd64`, `windows_amd64`). Not an error, just a portability caveat.
- For active local development, `dev_overrides` in `~/.terraformrc` is often more convenient than manually copying the binary into the plugin directory. The post's approach still works, just worth knowing about as a future improvement.
- The phrase "the Plugin Framework includes a testing package" is slightly loose — `terraform-plugin-testing` is a separate Go module maintained by HashiCorp for use alongside the Plugin Framework. The code itself imports the correct module, so this is purely a wording nuance and not a technical error.
- Minor style: `var version string = "dev"` is valid Go but more idiomatically written as `var version = "dev"`. Left as-is since it is not incorrect.
- The `CreateItem` client function uses `body, _ := json.Marshal(payload)`, silently discarding the marshal error. For a `map[string]string` this cannot realistically fail, so it is acceptable in a tutorial context.
