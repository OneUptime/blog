# Validation Summary: How to Contribute Code to the OpenTofu Project

## Status
validated

## Post Type
Tutorial / Contribution guide

## Technologies Covered
- OpenTofu (open source Terraform fork)
- Go (toolchain, `go build`, `go test`, `go vet`, `gofmt`)
- Git / GitHub (forking, branches, PR workflow)
- Make / `golangci-lint`
- Developer Certificate of Origin (DCO)
- HCL (used inside the test fixture)

## Sources Consulted
- OpenTofu repository root: https://github.com/opentofu/opentofu
- `go.mod` (current Go directive): https://raw.githubusercontent.com/opentofu/opentofu/main/go.mod
- `CONTRIBUTING.md`: https://raw.githubusercontent.com/opentofu/opentofu/main/CONTRIBUTING.md
- `contributing/DEVELOPING.md`: https://raw.githubusercontent.com/opentofu/opentofu/main/contributing/DEVELOPING.md
- `Makefile`: https://raw.githubusercontent.com/opentofu/opentofu/main/Makefile
- `cmd/tofu` directory: https://github.com/opentofu/opentofu/tree/main/cmd/tofu
- `internal/tofu` package (core engine, where `testContext2` / `ContextOpts` / `DefaultPlanOpts` live): https://github.com/opentofu/opentofu/tree/main/internal/tofu
- `internal/lang` package (verified `eval_test.go` does not contain the symbols claimed in the post): https://github.com/opentofu/opentofu/tree/main/internal/lang
- `internal/backend/remote-state/s3` (correct location of S3 backend acceptance tests, gated by `TF_S3_TEST`): https://github.com/opentofu/opentofu/tree/main/internal/backend/remote-state/s3

## Issues Found

1. **Go version requirement was outdated.**
   - Original: "Prerequisites: Go 1.22+".
   - Fixed: changed to "Go (matching the version in go.mod, e.g. 1.26+)". The current `go.mod` declares `go 1.26.2`, and the official `DEVELOPING.md` recommends installing a Go version compatible with the directives in `go.mod`.

2. **Stewardship sentence was loose.**
   - Original: "OpenTofu is an open source Terraform fork maintained by the Linux Foundation."
   - Fixed: "...hosted by the Linux Foundation and governed by an independent Technical Steering Committee." OpenTofu is an LF project (not a CNCF project) but the day-to-day maintenance is done by the TSC and contributors, not directly by the Linux Foundation.

3. **Acceptance test paths did not exist in the OpenTofu repo.**
   - Original used `./internal/provider/...` and `./internal/provider/aws/...` with `TF_ACC=1`. There is no `internal/provider` directory in OpenTofu, and the AWS provider has never lived in the Terraform/OpenTofu core repo (it ships as a separate provider project).
   - Fixed: replaced both examples with the real backend acceptance test path `./internal/backend/remote-state/s3/...`, gated by `TF_S3_TEST=1`, which is the actual pattern used in the repo.

4. **Linter target name was wrong.**
   - Original: `make lint` (referenced twice — in the workflow and in the checklist).
   - Fixed: changed both to `make golangci-lint`. The Makefile has no `lint` target; the documented target is `golangci-lint`, which installs and runs `golangci-lint` against the OpenTofu module.

5. **CLA reference was incorrect — OpenTofu uses a DCO.**
   - Original: "Sign the Contributor License Agreement (CLA) if prompted".
   - Fixed: replaced with a note that OpenTofu uses the Developer Certificate of Origin and that each commit must be signed off using `git commit -s`. This matches the explicit instructions in `DEVELOPING.md` ("please read the DCO ... use `git commit -s` to sign off your commits").

6. **`git commit` examples were missing the required `-s` (DCO sign-off).**
   - Fixed: added `-s` to both `git commit` examples in the workflow and the review-feedback step.

7. **Test file path and package were incorrect for the symbols used.**
   - Original located the regression test at `internal/lang/eval_test.go`, but `testContext2`, `ContextOpts`, `DefaultPlanOpts`, and `ctx.Plan(config, state, opts)` are not in `internal/lang`. They live in `internal/tofu` (OpenTofu renamed the legacy `terraform` core package to `tofu` after the fork).
   - Fixed: changed the file header to `internal/tofu/context_plan_test.go` and added a one-line note that the core engine package is named `tofu`.

8. **Conventional Commits requirement was unsupported.**
   - Original checklist required "Commit message follows conventional commits format" and the example used `fix: ...` prefix.
   - Fixed: replaced the checklist item with the actual requirement (DCO sign-off via `git commit -s`) and removed the `fix:` prefix from the in-text commit example so contributors are not led to believe Conventional Commits is enforced. (The PR-title example in the "Submitting a Pull Request" section still mentions `fix:` as a stylistic choice, which is harmless since OpenTofu does not forbid such prefixes.)

## Review Notes
- The exact Go minimum will keep moving; the safest long-term phrasing remains "match the directive in `go.mod`", which the post now does.
- The bug-fix test snippet is illustrative — `testContext2` and `DefaultPlanOpts` exist in `internal/tofu`, but the exact `ctx.Plan(config, state, opts)` call signature used in real test code parses HCL via helpers like `testModuleInline` first; readers writing a real test should refer to existing `context_plan_test.go` patterns.
- The S3 backend was used as the acceptance-test example because it is one of the few backends in the OpenTofu repo that hits real cloud APIs; other backends (gcs, azurerm, oss, cos) have similar `TF_<NAME>_TEST` gates with their own credential requirements.
- OpenTofu's CONTRIBUTING / DEVELOPING docs are a moving target — re-verify the linter target name and `go.mod` Go directive periodically (both have changed since the fork).
