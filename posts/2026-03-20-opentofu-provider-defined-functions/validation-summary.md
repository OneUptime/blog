# Validation Summary: Using Provider-Defined Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu 1.7+
- Terraform (provider-defined functions, introduced in 1.8)
- HashiCorp AWS provider (>= 5.40 for `arn_parse` / `arn_build`)
- terraform-plugin-framework (Go SDK for building providers and provider-defined functions)
- HCL configuration language
- Go (custom provider function implementation)

## Sources Consulted
- [OpenTofu provider-defined functions documentation](https://opentofu.org/docs/language/functions/#provider-defined-functions)
- [hashicorp/aws `arn_parse` function (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/functions/arn_parse)
- [hashicorp/aws `arn_build` function (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/functions/arn_build)
- [terraform-provider-aws v5.40.0 release notes](https://github.com/hashicorp/terraform-provider-aws/releases/tag/v5.40.0)
- [terraform-provider-aws `arn_parse.go` source](https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/function/arn_parse.go)
- [terraform-plugin-framework function implementation guide](https://developer.hashicorp.com/terraform/plugin/framework/functions/implementation)
- [HashiCorp Terraform 1.8 provider functions blog post](https://www.hashicorp.com/en/blog/terraform-1-8-adds-provider-functions-for-aws-google-cloud-and-kubernetes)

## Issues Found
- **Missing `fmt` import in custom provider function example.** The Go snippet under "Custom Provider Functions" uses `fmt.Sprintf("%s-%s", environment, baseName)` but only imports `context` and the `function` package, so the example would not compile. Added `"fmt"` to the import block.

## Review Notes
- The `arn_parse` function returns five fields per the upstream source: `partition`, `service`, `region`, `account_id`, and `resource`. The post only references `service`, `region`, `account_id`, and `resource`, which is correct (and `partition` is simply not used in the example).
- The post pins the AWS provider to `>= 5.49` with the comment "Functions require recent version". `arn_parse` has actually been available since AWS provider `5.40.0` (released alongside Terraform 1.8 / OpenTofu 1.7), so the constraint is stricter than strictly required, but it is not technically incorrect — left as-is to preserve author voice.
- The framework usage (`function.Function` interface, `Metadata` / `Definition` / `Run`, `function.StringParameter`, `function.StringReturn`, `function.ConcatFuncErrors`, `req.Arguments.Get(ctx, ...)`, and `resp.Result.Set(ctx, ...)`) matches the current `terraform-plugin-framework` API.
- The `tofu providers schema -json` command and the `registry.opentofu.org/hashicorp/aws` registry path used in the `jq` filter are accurate for OpenTofu's default registry resolution of the `hashicorp/aws` source.
- The `provider::<provider>::<function>(...)` call syntax matches the official OpenTofu documentation.
