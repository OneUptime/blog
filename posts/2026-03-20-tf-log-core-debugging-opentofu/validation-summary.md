# Validation Summary: How to Use TF_LOG_CORE for Core Debugging in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu debugging environment variables (`TF_LOG`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`, `TF_LOG_PATH`)
- OpenTofu dependency graph, plan generation, state locking, module loading, and variable evaluation
- Shell commands (`export`, `unset`, `grep`)

## Sources Consulted
- OpenTofu Debugging documentation: https://opentofu.org/docs/internals/debugging/
- OpenTofu Environment Variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu Resource Graph documentation: https://opentofu.org/docs/internals/graph/
- OpenTofu State Locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu logging implementation source: https://github.com/opentofu/opentofu/blob/main/internal/logging/logging.go
- OpenTofu core graph and walk implementation source: https://github.com/opentofu/opentofu/tree/main/internal/tofu

## Issues Found
- The post described `TF_LOG_CORE` as core-only without accounting for a pre-existing `TF_LOG` value. OpenTofu's logging implementation reads `TF_LOG` before `TF_LOG_CORE`, so the introduction now includes that caveat and the core-only examples unset `TF_LOG`.
- Some core-only examples did not clear a pre-existing `TF_LOG_PROVIDER` value. The examples now unset `TF_LOG_PROVIDER` or explicitly set `TF_LOG_PROVIDER=OFF` where provider logging should stay quiet.
- The sample core log output did not match current OpenTofu logger strings. It was replaced with representative messages from the current OpenTofu source, including graph build, graph transform, graph walk, and vertex visit entries.
- Several `grep` examples used basic-regex alternation syntax. They now use `grep -E` so alternation is explicit and consistent across the examples.

## Review Notes
The local environment did not have the `tofu` binary installed, so CLI behavior was reviewed against official OpenTofu documentation and the current OpenTofu source rather than executed locally. `TF_LOG_PATH` with `TF_LOG_CORE` was verified against the source: OpenTofu opens `TF_LOG_PATH` when set, and the core log level can come from `TF_LOG_CORE` when `TF_LOG` is unset.
