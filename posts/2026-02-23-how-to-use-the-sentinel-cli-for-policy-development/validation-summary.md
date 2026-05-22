# Validation Summary: How to Use the Sentinel CLI for Policy Development

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- HashiCorp Sentinel CLI
- Sentinel policy language
- Terraform / HCP Terraform Sentinel policy sets
- HCL configuration
- Policy-as-code testing and formatting workflows

## Sources Consulted
- HashiCorp Sentinel CLI commands overview: https://developer.hashicorp.com/sentinel/docs/commands
- HashiCorp Sentinel `test` command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel `apply` command reference: https://developer.hashicorp.com/sentinel/docs/commands/apply
- HashiCorp Sentinel `fmt` command reference: https://developer.hashicorp.com/sentinel/docs/commands/fmt
- HashiCorp Sentinel CLI configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Sentinel tracing documentation: https://developer.hashicorp.com/sentinel/docs/writing/tracing
- HashiCorp Sentinel releases: https://releases.hashicorp.com/sentinel/
- HCP Terraform Sentinel policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs

## Issues Found
- The install commands pinned Sentinel `0.24.0`, while HashiCorp's current documented and released CLI version is `0.40.0`. Updated the Linux and macOS download URLs to `0.40.0`.
- `sentinel test -config sentinel.hcl` was incorrect. The current `test` command has no `-config` flag, and test cases provide their own configuration under `test/<policy>/*.[hcl|json]`. Replaced it with a valid directory-based `sentinel test` example.
- The sample normal test output omitted test case lines and used an assertion message that did not match the current CLI format. Updated the output to show per-case results and `got: true`.
- The `sentinel apply -trace` sample used an outdated trace shape. Updated it to match the current CLI trace format.
- `sentinel fmt -diff` was incorrect. The current `fmt` command supports `-write=false` for previewing formatted output, not `-diff`. Replaced the command and description.
- The formatted Sentinel example used spaces where the CLI canonical formatter emits tabs. Updated the "After formatting" snippet.
- The `restrict-regions.sentinel` example assigned local variables inside an `all` expression block, which does not parse in Sentinel. Replaced the inner rule with an equivalent inline expression that parses and passes against the shown mock data.
- `SENTINEL_VAR_environment=production sentinel test` was not a supported Sentinel CLI parameter mechanism. Replaced it with the documented `sentinel apply -param environment=production` form.
- `sentinel test -dir ./security-policies/` was incorrect. The current `test` command accepts directories as positional paths, so it was changed to `sentinel test ./security-policies/`.
- `sentinel test -config ./security-policies/sentinel.hcl` was incorrect for the same reason as above. Changed the example to `sentinel apply -config ./security-policies/sentinel.hcl`.

## Review Notes
- The corrected `restrict-regions.sentinel` policy and mock test case were checked with Sentinel CLI `v0.40.0`.
- The article remains accurate as a CLI-focused local development guide. Future updates could add checksum verification for downloaded binaries, but that is a security hardening improvement rather than a correctness issue.
