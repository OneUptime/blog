# Validation Summary: How to Develop a Custom OpenTofu Provider in Go

## Status
validated

## Post Type
Tutorial / Getting-started guide

## Technologies Covered
- OpenTofu (CLI, `~/.tofurc` config, `dev_overrides`)
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
  - `provider` package (Schema, SchemaRequest/Response, Provider interface)
  - `resource` package (Schema, CreateRequest/Response)
  - `providerserver` package (Serve, ServeOpts)
  - `types` package (StringValue, String tfsdk tags)
- Go modules / `go build` / `go get`

## Sources Consulted
- providerserver.Serve signature: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver#Serve
- provider.Provider interface: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/provider#Provider
- resource.Resource interface: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource#Resource
- types.StringValue: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/types#StringValue
- HashiCorp scaffolding template (canonical Create implementation): https://github.com/hashicorp/terraform-provider-scaffolding-framework/blob/main/internal/provider/example_resource.go
- OpenTofu CLI config / dev_overrides: https://opentofu.org/docs/cli/config/config-file/#development-overrides-for-provider-developers
- OpenTofu provider registry protocol (address format): https://opentofu.org/docs/internals/provider-registry-protocol/
- Terraform plugin framework provider-servers docs: https://developer.hashicorp.com/terraform/plugin/framework/provider-servers

## Issues Found
1. **Missing markdown heading prefix on "Resource Implementation"** (line 79). Every other section uses `##`, but this one was a plain paragraph, breaking the document outline. Changed to `## Resource Implementation`.
2. **`main.go` referenced `tfprovider.Provider` without importing the package.** The factory function in `providerserver.Serve` must return a `provider.Provider` from `github.com/hashicorp/terraform-plugin-framework/provider`, but that package was not imported, and the local package in the same file is also named `provider`, so simply importing it would have caused a name collision. Added `tfprovider "github.com/hashicorp/terraform-plugin-framework/provider"` as an aliased import so the existing `tfprovider.Provider` reference resolves and does not collide with the local `provider` package.

## Review Notes
- The example provider and resource types only implement the `Schema` (and for the resource, `Create`) methods. In real code, `provider.Provider` additionally requires `Metadata`, `Configure`, `DataSources`, and `Resources`, and `resource.Resource` additionally requires `Metadata`, `Read`, `Update`, and `Delete`. The post is intentionally illustrative ("Start with a single resource, build up...") so this was left as-is, but readers should be aware they will need to add those methods before the code will compile and run.
- `providerserver.Serve` returns an `error` that the example ignores. Production code should check it (e.g., `log.Fatal` on non-nil). Left unchanged to preserve the author's minimalist style.
- The `dev_overrides` value in `~/.tofurc` must point to a directory containing the built `terraform-provider-petstore` binary, not to the binary file itself. The post's path comment `/path/to/terraform-provider-petstore` is ambiguous but plausibly refers to a directory, so it was left unchanged.
- `registry.opentofu.org/...` is a valid Address form; OpenTofu accepts both the `registry.opentofu.org` and `registry.terraform.io` hostnames as provider source addresses.
- Go 1.21 is fine as a minimum; the Plugin Framework currently supports Go 1.22+ for newer releases, but `@latest` will resolve to a compatible version, so this is not strictly wrong today.
