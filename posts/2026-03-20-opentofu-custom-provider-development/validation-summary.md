# Validation Summary: Developing a Custom Provider for OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Go
- HCL (provider configuration)

## Sources Consulted
- Terraform Plugin Framework source: https://github.com/hashicorp/terraform-plugin-framework
  - `provider/provider.go` (Provider interface)
  - `resource/resource.go` (Resource interface)
  - `provider/metadata.go` (MetadataResponse fields)
  - `resource/metadata.go` (MetadataRequest fields)
  - `types/string_value.go`, `types/basetypes/string_value.go`
  - `tfsdk/plan.go`, `tfsdk/state.go`
- Terraform Plugin Framework docs: https://developer.hashicorp.com/terraform/plugin/framework
- OpenTofu CLI config docs: https://opentofu.org/docs/cli/config/config-file/
  - `provider_installation` / `dev_overrides` syntax
  - Provider source resolution (bare addresses resolve to `registry.opentofu.org`)
  - Filesystem mirror layout

## Issues Found

1. **Missing `Configure` method on the Provider** — The `provider.Provider` interface in the Terraform Plugin Framework requires five methods: `Metadata`, `Schema`, `Configure`, `DataSources`, and `Resources`. The original post defined the first two and the last two but omitted `Configure`, which means `*PetstoreProvider` did not satisfy the `provider.Provider` interface and the `New()` function (`return &PetstoreProvider{}` cast to `provider.Provider`) would fail to compile. Added a minimal `Configure` method to make the example compilable. (Note: `Configure` is optional on `resource.Resource` via the separate `ResourceWithConfigure` interface, so the resource code did not have the same problem.)

2. **Wrong registry hostname in local mirror path** — The post instructed readers to install the built provider under `~/.terraform.d/plugins/registry.terraform.io/myorg/petstore/...` while using a bare `source = "myorg/petstore"` in `required_providers`. OpenTofu resolves bare source addresses to `registry.opentofu.org` (not `registry.terraform.io`), so it would look up the plugin under `registry.opentofu.org/myorg/petstore/...` and fail to find it. Since the post's focus is OpenTofu (with `tofu plan` and `~/.tofurc`), corrected the mirror path to `registry.opentofu.org/myorg/petstore/...` so the install actually matches the resolved source address.

## Review Notes

- `dev_overrides` syntax in `~/.tofurc` is correct as written. The override path must be a directory containing the `terraform-provider-petstore` binary (not the binary itself); `/home/user/go/bin` after `go install .` satisfies this since Go installs the binary into that directory by default.
- `main.go` is shown in the project structure but not implemented in the post. A working build also requires a `main.go` that calls `providerserver.Serve(...)` from `github.com/hashicorp/terraform-plugin-go/tfprotov6/providerserver` (or the v5 equivalent). The post does not claim to be a full reference, so this omission is left as-is — it is consistent with the post's stub `Read`/`Update`/`Delete` methods.
- `provider.MetadataResponse` field names (`TypeName`, `Version`), `resource.MetadataRequest.ProviderTypeName`, and the value/conversion calls (`types.StringValue`, `ValueString`, `req.Plan.Get`, `resp.State.Set`) are all accurate against the current framework source.
- The `Resources()` slice references `NewPetDataSource` indirectly via `DataSources()`, but `NewPetDataSource` is referenced without being defined in any code block in the post. This is presented as an "implementation" exercise for the reader and is not strictly a technical error — but readers should be aware that following the post verbatim and trying to build will fail until they implement the data source or remove the reference.
- The HCL configuration block, the CRUD pattern explanation, and the `tofu plan` workflow are technically accurate.
