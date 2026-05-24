# Validation Summary: How to Handle Multi-Version Provider Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform Plugin SDK v2 (`github.com/hashicorp/terraform-plugin-sdk/v2`)
- Terraform Plugin Mux (`github.com/hashicorp/terraform-plugin-mux/tf6muxserver`, `tf5to6server`)
- Terraform Plugin Go (`github.com/hashicorp/terraform-plugin-go/tfprotov6/tf6server`)
- Terraform protocol versions 5 and 6
- Go (standard library: `net/http`, `strconv`, `context`, `strings`, `fmt`)
- HCL `required_version` / `required_providers` blocks
- GitHub Actions (`actions/checkout@v4`, `actions/setup-go@v5`, `hashicorp/setup-terraform@v3`)

## Sources Consulted
- Terraform Plugin Framework `providerserver` package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver
- Terraform Plugin Framework `provider` package (Metadata): https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/provider
- Terraform Plugin Mux `tf6muxserver`: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-mux/tf6muxserver
- Combining Protocol Version 6 Providers: https://developer.hashicorp.com/terraform/plugin/mux/combining-protocol-version-6-providers
- Translating Protocol Version 5 to 6: https://developer.hashicorp.com/terraform/plugin/mux/translating-protocol-version-5-to-6
- Terraform plugin protocol overview: https://developer.hashicorp.com/terraform/plugin/terraform-plugin-protocol
- Provider servers guide: https://developer.hashicorp.com/terraform/plugin/framework/provider-servers

## Issues Found

1. **Missing imports in `internal/client/version.go` example.** The snippet uses `*http.Client` (from `net/http`) in the `Client` struct and `strconv.Atoi` when parsing the version string, but neither package was imported. Added `"net/http"` and `"strconv"` to the import block.

2. **Mux server example was broken and misleading.** The original `main.go` snippet declared `frameworkServer := providerserver.NewProtocol6(provider.New(version)())` but never used it, which would fail to compile (Go errors on unused locals). It then called `providerserver.Serve(...)` without any mux involvement, despite the surrounding text saying "use the mux server." Replaced the snippet with a correct mux setup that:
   - Imports `tf6server`, `tf6muxserver`, `tf5to6server`, and `tfprotov6`.
   - Upgrades an SDK v2 provider with `tf5to6server.UpgradeServer`.
   - Builds the slice of `func() tfprotov6.ProviderServer` factories using `providerserver.NewProtocol6` for the Framework provider.
   - Constructs the mux with `tf6muxserver.NewMuxServer`.
   - Serves the mux with `tf6server.Serve(address, muxServer.ProviderServer)` (the correct serve call for a mux server — `providerserver.Serve` only accepts `func() provider.Provider` and cannot serve a `tfprotov6.ProviderServer`).
   - Added a note that single-provider setups can keep using `providerserver.Serve` directly.

3. **"Terraform Version Constraints" section claimed `Metadata` sets a minimum Terraform version.** The `provider.MetadataResponse` struct only exposes `TypeName` and `Version` (the provider's own version, which the docs note "is not connected to any framework functionality currently"). There is no Framework API for declaring a minimum Terraform CLI version. Rewrote the section to make clear that the minimum Terraform CLI version is enforced (a) implicitly by the chosen protocol — protocol 6 requires Terraform 1.0+, protocol 5 requires 0.12+ — and (b) explicitly via the consumer's `required_version` block, not via the provider code.

## Review Notes

- The `mapServerV2ToModel` function uses `context.Background()` for `types.MapValueFrom` instead of plumbing a `context.Context` parameter through. This still compiles and works for the simple conversion path here, but a stricter style would take a `ctx` parameter. Left as-is since it is not technically wrong, only a code-style preference.
- The version-parsing code (`strconv.Atoi` results discarded with `_`) silently swallows parse errors. Production code should surface those, but for an illustrative snippet this is acceptable and matches the post's "happy path" framing.
- The "Conditional Schema Based on API Version" pattern works but has a subtle UX gotcha worth noting in a future revision: schema can change between provider runs when the backend is upgraded mid-cycle, which can produce confusing diffs for users. Many real-world providers prefer to expose all attributes and validate at plan/apply time instead.
- GitHub Action versions referenced (`actions/checkout@v4`, `actions/setup-go@v5`, `hashicorp/setup-terraform@v3`) are current as of the validation date.
- Terraform versions in the test matrix (`1.5`, `1.6`, `1.7`) are slightly trailing as of 2026-05-24 (Terraform 1.10+ is generally available), but using older versions in a matrix is intentional for compatibility testing, so this is left unchanged.
