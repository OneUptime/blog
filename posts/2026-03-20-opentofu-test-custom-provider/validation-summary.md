# Validation Summary: How to Test a Custom OpenTofu Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Go
- terraform-plugin-framework (`providerserver` package)
- terraform-plugin-testing (`helper/resource` package)
- terraform-plugin-go (`tfprotov6`)
- GitHub Actions (CI/CD)

## Sources Consulted
- terraform-plugin-framework `providerserver` package reference: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver
- terraform-plugin-testing `helper/resource` package reference: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-testing/helper/resource
- HashiCorp acceptance testing guide for the framework: https://developer.hashicorp.com/terraform/plugin/framework/acctests

## Issues Found

1. **Provider Factory Setup used a non-existent API.** The post showed `providerserver.NewProviderServer(providerserver.NewProviderServerConfig{...})`, but neither `NewProviderServer` nor `NewProviderServerConfig` exist in the `github.com/hashicorp/terraform-plugin-framework/providerserver` package. The actual exported helper for protocol v6 with error reporting is `NewProtocol6WithError(p provider.Provider) func() (tfprotov6.ProviderServer, error)`. I rewrote the snippet to use `providerserver.NewProtocol6WithError(&provider.PetstoreProvider{})` and added the missing import block (`providerserver`, `tfprotov6`, and the local provider package), matching the canonical pattern documented in HashiCorp's framework acceptance-testing guide.

2. **Missing `fmt` import in the acceptance test.** The `testAccPetConfig` helper called `fmt.Sprintf`, but the file's import block only listed `testing`, `os`, and `helper/resource`. Added `"fmt"` to the imports (and reordered them alphabetically per `goimports` convention) so the example compiles as written.

3. **Misleading `-run TestUnit` flag in "Running Tests".** The example unit test is named `TestPetNameValidation`, which would not match the regex `TestUnit`, so the documented command would silently match nothing. Changed the unit-test command to `go test ./internal/provider/ -v` and added a comment noting that `TF_ACC` being unset causes `resource.Test` to skip acceptance tests automatically — which is the actual idiomatic split between unit and acceptance runs.

## Review Notes
- `resource.Test`, `resource.TestCase`, `resource.TestStep`, `resource.ComposeTestCheckFunc`, `resource.TestCheckResourceAttr`, and `resource.TestCheckResourceAttrSet` are all current, non-deprecated APIs in `terraform-plugin-testing/helper/resource`.
- The `TF_ACC=1` gate, `ImportState`/`ImportStateVerify` flow, and the automatic `CheckDestroy` behavior described in "Testing Destroy" are all accurate descriptions of the framework's behavior.
- The acceptance-tests CI job omits `with: go-version:` on `actions/setup-go@v5`. This is not a hard error (the action will use a default), but pinning the Go version explicitly (as the unit-tests job does) would be a good follow-up for reproducibility. Left as-is to avoid scope creep.
- The post does not show an explicit `CheckDestroy` function. The framework does run an implicit destroy step at the end of the test, but a real provider will usually want a custom `CheckDestroy` that polls the API to confirm the resource is gone. This is a reasonable improvement for a future revision but not technically incorrect as written.
