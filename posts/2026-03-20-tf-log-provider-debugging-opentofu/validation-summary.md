# Validation Summary: How to Use TF_LOG_PROVIDER for Provider Debugging in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu debugging environment variables
- Terraform/OpenTofu provider plugin logging
- Shell commands (`export`, `unset`, `grep`, `chmod`, `shred`)

## Sources Consulted
- OpenTofu Debugging documentation: https://opentofu.org/docs/internals/debugging/
- OpenTofu Environment Variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu logging implementation source: https://github.com/opentofu/opentofu/blob/main/internal/logging/logging.go
- Terraform Plugin logging output management documentation: https://developer.hashicorp.com/terraform/plugin/log/managing
- Terraform Plugin SDK HTTP transport logging documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/logging/http-transport

## Issues Found
- The post overstated that `TF_LOG_PROVIDER=TRACE` always exposes raw HTTP request/response bodies and every provider API detail. Provider log contents depend on the provider and its logging implementation, so the wording was changed to describe provider-specific API and HTTP details when those details are logged by the provider.
- The provider-only logging example did not account for a pre-existing `TF_LOG` value. OpenTofu's logging implementation checks `TF_LOG` before `TF_LOG_CORE`, so `unset TF_LOG` was added before using `TF_LOG_CORE=OFF`.
- The unexpected plan diff example used `TF_LOG_PROVIDER=DEBUG` while searching for low-level read/refresh activity. It was changed to `TRACE` to align with the most verbose provider logging level.
- The read/refresh grep example used basic grep alternation syntax. It was changed to `grep -E` for clearer extended-regex behavior, matching the other examples in the post.
- The cleanup comment implied `shred` is universally sufficient. It now notes that platform-specific secure deletion may be required.

## Review Notes
The local environment did not have the `tofu` binary installed, so CLI examples were reviewed against official OpenTofu documentation and OpenTofu source rather than executed locally.
