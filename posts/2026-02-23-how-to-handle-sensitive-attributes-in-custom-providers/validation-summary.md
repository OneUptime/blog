# Validation Summary: How to Handle Sensitive Attributes in Custom Providers

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (CLI behavior for sensitive values, plan output, state)
- HashiCorp Terraform Plugin Framework (`terraform-plugin-framework`) — schema, resource CRUD, import, provider configuration
- `terraform-plugin-log` / `tflog` package (structured logging, field masking)
- Go (regex sanitization helpers)

## Sources Consulted
- Terraform Plugin Framework — StringAttribute reference: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string
- Terraform Plugin Framework — SingleNestedAttribute reference: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/single-nested
- Terraform Plugin Framework — Write-Only Arguments: https://developer.hashicorp.com/terraform/plugin/framework/resources/write-only-arguments
- `tflog` package on pkg.go.dev: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-log/tflog
- `resource` package on pkg.go.dev: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource

## Issues Found
1. **Outdated guidance in "Write-Only Attributes" section.** The original section described a manual pattern (don't overwrite the value on Read) but did not mention the Plugin Framework's first-class `WriteOnly: true` attribute support (introduced for Terraform 1.11+, terraform-plugin-framework v1.14+). For a Feb 2026 post on sensitive data handling, the recommended approach is now `WriteOnly` because it keeps the value out of state entirely — the manual pattern still leaves the password in state.
   - **Fix:** Added a brief paragraph at the top of the "Write-Only Attributes" section introducing `WriteOnly: true` with a short schema example, and reframed the existing pattern as the fallback when targeting older Terraform versions. The original example code was retained unchanged.

No other technical errors were found. Verified:
- `Sensitive: true` schema attribute usage — correct.
- `tflog.SetField`, `tflog.MaskFieldValuesWithFieldKeys`, `tflog.MaskMessageRegexes` — signatures and behavior accurate.
- `resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)` — correct signature.
- `SingleNestedAttribute` with `Sensitive: true` at the parent level — supported and behaves as described.
- Sample `terraform plan` output — accurate: `(known after apply)` is shown for computed unknown values (even when sensitive), and `(sensitive value)` for known sensitive values from configuration.

## Review Notes
- The provider `Configure` example uses `os.Getenv` and `regexp` but does not show the corresponding `import` block. This is a stylistic choice (the rest of the post elides imports too) and not a technical error.
- The sanitization regex `(https?://)[^:]+:[^@]+@` for stripping userinfo from URLs is correct in basic cases but will not catch credentials passed via query strings or non-standard URL forms. Acceptable as an illustrative example.
- The post correctly notes that marking an attribute `Sensitive` does not encrypt state — this is an important and accurate caveat.
