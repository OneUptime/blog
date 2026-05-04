# Validation Summary: How to Set Up Contract Tests for OpenTofu Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu test` framework, `.tftest.hcl` files)
- HCL (mock_provider, mock_resource, run blocks, assertions)
- AWS provider resources (aws_vpc, aws_subnet, aws_internet_gateway, aws_nat_gateway, aws_route_table, aws_eip, aws_vpc_ipv4_cidr_block_association)
- GitHub Actions (CI workflow)

## Sources Consulted
- OpenTofu test command and language reference: https://opentofu.org/docs/cli/commands/test/
- opentofu/setup-opentofu GitHub Action releases: https://github.com/opentofu/setup-opentofu/releases
- OpenTofu mock_provider / mock_resource block reference (consolidated under the test command page)

## Issues Found
1. **Outdated GitHub Action version**: The CI snippet referenced `opentofu/setup-opentofu@v1`. Version `v2.0.0` was released on 2026-03-16 (Node.js 24 runtime upgrade) and is the current recommended major. Updated to `@v2`.
2. **Incorrect `tofu test` invocation in CI loop**: The script ran `tofu test -test-directory="$module/tests" -verbose` from the repository root. The `-test-directory` flag only changes where test files are loaded from; the configuration under test is always the current working directory's root module. As written, every iteration would test the repo-root configuration (not the per-module configuration) using each module's tests. Fixed by switching to `tofu -chdir="$module" test -verbose`, which sets the working directory to the module under test and uses the default `tests/` directory for test discovery.

## Review Notes
- `mock_provider` / `mock_resource "<type>" { defaults = { ... } }` syntax is correct per official docs.
- `command = plan` (bare identifier, no quotes) and `output.<name>` references in `assert.condition` are correct.
- Direct resource references like `aws_vpc.main.tags["Environment"]` work because the test file lives in the module that defines the resource.
- The CI job will only succeed if each module's `tests/` directory is self-sufficient (the test file calls `mock_provider` and the module's `aws_vpc.main` etc. exist). The author already structures the post that way; nothing to change.
- Optional future improvement: a `tofu init -backend=false` step before `tofu test` is sometimes needed even with mock providers (to materialize provider schemas). Not added here to keep edits scoped to outright errors.
