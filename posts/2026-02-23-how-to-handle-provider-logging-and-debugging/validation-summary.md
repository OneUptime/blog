# Validation Summary: How to Handle Provider Logging and Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- `terraform-plugin-log` / `tflog` package
- Terraform CLI environment variables (`TF_LOG`, `TF_LOG_PROVIDER`, `TF_LOG_PATH`, `TF_REATTACH_PROVIDERS`)
- Delve (Go debugger)
- Go (`flag` package, `net/http` transports)

## Sources Consulted
- terraform-plugin-log package docs: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-log/tflog
- terraform-plugin-log source code: https://github.com/hashicorp/terraform-plugin-log
- HashiCorp "Managing log output" docs: https://developer.hashicorp.com/terraform/plugin/log/managing
- HashiCorp "Debugging Terraform Providers" docs: https://developer.hashicorp.com/terraform/plugin/debugging
- terraform-plugin-go env-var constants (`internal/logging/environment_variables.go`)
- terraform-plugin-framework `providerserver` package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/providerserver
- Terraform internal debugging reference: https://developer.hashicorp.com/terraform/internals/debugging

## Issues Found
1. **Subsystem env var example was incorrect / misleading.** The original post claimed the following would just work to control a subsystem's level:
   ```
   TF_LOG_PROVIDER_EXAMPLE=DEBUG TF_LOG_PROVIDER_EXAMPLE_api_client=TRACE terraform plan
   ```
   Two problems:
   - `tflog.NewSubsystem(ctx, "api_client")` with no options does NOT auto-register any per-subsystem environment variable; the subsystem just inherits the root provider logger's level. To get an env-var-controlled subsystem level, the developer must explicitly pass `tflog.WithLevelFromEnv(...)` to `NewSubsystem`. (Source: `tflog.ExampleNewSubsystem_withLevel` and `tflog/options.go` in terraform-plugin-log.)
   - The subsystem suffix in the env var name must be uppercase. `WithLevelFromEnv` constructs the env var as `strings.ToUpper(name + "_" + strings.Join(subsystems, "_"))`, so `api_client` becomes `API_CLIENT`. The lowercase `_api_client` suffix in the original post would not match.

   **Fix applied:** Added `tflog.WithLevelFromEnv("TF_LOG_PROVIDER_EXAMPLE", "api_client")` (and the same for `state_migration`) to the `NewSubsystem` calls, and corrected the shell command to use `TF_LOG_PROVIDER_EXAMPLE_API_CLIENT=TRACE` with a note explaining the uppercasing rule.

## Review Notes
- `TF_LOG_PROVIDER_<NAME>` (where `<NAME>` is the uppercased final path segment of the provider address — e.g., `example` from `registry.terraform.io/example/example` → `TF_LOG_PROVIDER_EXAMPLE`) is correctly described and is auto-registered by `tf6server`/`tf5server`.
- `tflog` function signatures verified: `NewSubsystem`, `SubsystemDebug`, `MaskFieldValuesWithFieldKeys`, `MaskMessageRegexes`, `SetField` all match the current API.
- `providerserver.ServeOpts.Address` (string) and `Debug` (bool) verified.
- The `go build -gcflags="all=-N -l"` flag combination for disabling optimizations/inlining for debugging is correct.
- `flag.BoolVar` with `--debug` works because Go's `flag` package accepts both `-debug` and `--debug` for the same flag name.
- The `TF_REATTACH_PROVIDERS` JSON shape and the overall debug-attach workflow match the HashiCorp debugging docs.
- The `fmt.Sprintf("%+v", server)` line uses `fmt` without an explicit import in the snippet; this is acceptable for an illustrative snippet but readers porting it will need to add the import.
- Log levels (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`) are the documented set accepted by `TF_LOG`; `JSON` and `OFF` are also valid but not relevant to this post.
