# Validation Summary: How to Profile Terraform Execution Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform logging environment variables
- Terraform state commands
- Bash shell scripting
- Go pprof

## Sources Consulted
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform debugging/logging documentation: https://developer.hashicorp.com/terraform/internals/debugging
- HashiCorp Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- HashiCorp Terraform CLI configuration and plugin cache documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Go net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof

## Issues Found
- The timing scripts used `date +%s%N`, which works with GNU date but not with the default BSD date on macOS. Replaced those calls with a small Perl `Time::HiRes` helper so the examples work on common Linux and macOS systems.
- The Terraform trace log AWK example parsed `$2` as the timestamp fragment, but Terraform log timestamps are in the first field. Updated the parser to read the time from `$1` and only print gaps larger than five seconds, matching the text above the command.
- The URL extraction command used `grep -P`, which is not available in default macOS grep. Replaced it with `grep -Eo`.
- The provider-only logging example combined `TF_LOG_PROVIDER` with `TF_LOG_PATH`; HashiCorp documents `TF_LOG_PATH` as requiring logging to be enabled and is clearest with `TF_LOG`. Changed the provider-only example to redirect provider logs from stderr to the file.
- The resource type breakdown counted resource addresses rather than resource types. Updated the pipeline to extract resource type names from `terraform state list` output before counting.
- The profiling script described 300 resources as an official recommended limit. Terraform does not document a universal resource-count limit, so the recommendation was reworded as a heuristic.
- The pprof section implied a generic "pprof-enabled" Terraform build without explaining that this requires custom Go instrumentation. Updated the comment to refer to `net/http/pprof` or `runtime/pprof` instrumentation.
- The final interpretation claimed that consistent slowdown across all phases means the state file is too large. Broadened this to include backend latency or the execution environment, which are also plausible causes.

## Review Notes
Terraform was not installed in the local workspace, so CLI flags and behavior were validated against current official HashiCorp documentation rather than local `terraform --help` output.
