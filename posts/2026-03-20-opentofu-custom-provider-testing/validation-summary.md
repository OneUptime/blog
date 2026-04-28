# Validation Summary: Testing Custom OpenTofu Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform custom providers
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform Plugin Testing framework (`github.com/hashicorp/terraform-plugin-testing`)
- Terraform Plugin Go protocol types (`github.com/hashicorp/terraform-plugin-go/tfprotov6`)
- Go testing (`testing`, `net/http/httptest`)

## Sources Consulted
- HashiCorp Plugin Testing docs: https://developer.hashicorp.com/terraform/plugin/testing
- `terraform-plugin-testing` source: https://github.com/hashicorp/terraform-plugin-testing (`helper/resource/testing.go`, `terraform/state.go`)
- `terraform-plugin-framework` source: https://github.com/hashicorp/terraform-plugin-framework (`providerserver/providerserver.go`)
- `terraform-plugin-go` source: https://github.com/hashicorp/terraform-plugin-go (`tfprotov6` package)
- Go standard library docs for `net/http/httptest` and `encoding/json`

## Issues Found
1. **Missing `tfprotov6` import in `provider_test.go` example.** The factory map's value type is `func() (tfprotov6.ProviderServer, error)`, which requires `github.com/hashicorp/terraform-plugin-go/tfprotov6` to be imported. The original import block omitted it, so the example would not compile. Added the import.
2. **Missing `fmt` and `resource` imports in `testserver_test.go` example.** The same file declares `TestAccPetResource_withMock`, which calls `fmt.Sprintf(...)` and `resource.Test(...)`. Added imports for `fmt` and `github.com/hashicorp/terraform-plugin-testing/helper/resource`.

## Review Notes
- All referenced APIs (`providerserver.NewProtocol6WithError`, `resource.UnitTest`, `resource.Test`, `resource.TestCase{ProtoV6ProviderFactories, Steps}`, `resource.TestStep{Config, Check, ResourceName, ImportState, ImportStateVerify, ExpectNonEmptyPlan}`, `resource.ComposeAggregateTestCheckFunc`, `resource.TestCheckResourceAttr`, `resource.TestCheckResourceAttrSet`, `terraform.State.RootModule().Resources[...].Primary.ID`) match the current upstream source.
- `TF_ACC=1` is the correct gate environment variable for acceptance tests.
- `provider.New()` is shown without arguments. The HashiCorp scaffold convention is `func New(version string) func() provider.Provider`, in which case the call would be `provider.New("test")()`. Either form is acceptable depending on how the project defines `New`, so this was not changed — the post implicitly assumes a `func New() provider.Provider` shape, which is valid.
- The `TestAccPetResource_disappears` example uses a `Check` function that calls the API to delete the resource and pairs it with `ExpectNonEmptyPlan: true`. This is a valid pattern, though the framework also offers `plancheck.ExpectEmptyPlan`/`plancheck.ExpectNonEmptyPlan` plan checks (in `terraform-plugin-testing/plancheck`) as a more modern alternative — worth considering in a future revision.
- The mock server's `/pet/` handler uses `r.URL.Path[len("/pet/"):]` for ID extraction; this works but `strings.TrimPrefix` would be more idiomatic. Not a correctness issue.
