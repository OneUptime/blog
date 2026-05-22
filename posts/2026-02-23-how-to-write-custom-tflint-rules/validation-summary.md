# Validation Summary: How to Write Custom TFLint Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- TFLint
- TFLint plugin SDK
- Go
- HCL
- GitHub Actions

## Sources Consulted
- TFLint developer guide: Writing Plugins: https://github.com/terraform-linters/tflint/blob/master/docs/developer-guide/plugins.md
- TFLint user guide: Configuring Plugins: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/plugins.md
- TFLint user guide: Configuring TFLint: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint ruleset template repository: https://github.com/terraform-linters/tflint-ruleset-template
- TFLint plugin SDK `tflint.Runner` API: https://pkg.go.dev/github.com/terraform-linters/tflint-plugin-sdk/tflint
- TFLint plugin SDK helper package: https://pkg.go.dev/github.com/terraform-linters/tflint-plugin-sdk/helper
- setup-tflint GitHub Action README: https://github.com/terraform-linters/setup-tflint

## Issues Found
- The project structure omitted `max_instance_size.go` and `max_instance_size_test.go` even though the post later defines and registers the max instance size rule. Added those files to the structure.
- The plugin entry point referenced `rules.NewRequiredTagsRule()`, but the post does not define that rule. Removed the undefined rule from the example so the snippet is internally consistent.
- The naming convention section said the rule enforced a naming prefix and mentioned a `name` attribute, but the code checks Terraform resource labels for snake_case. Updated the prose and comment to match the actual behavior, and removed an unused `tags` schema request.
- The banned resources rule treated `GetResourceContent` errors as if they meant the resource type did not exist. The SDK returns an empty result for nonmatching resource types; actual errors should be returned. Updated the code to return errors.
- The max instance size rule handled `runner.EvaluateExpr` as if it returned diagnostics with `HasErrors()`. Current SDK versions return `error`; updated the snippet to use the documented callback form and return any real error.
- The naming convention test imported `hcl` without using it and used `helper.AssertIssues` without expected ranges. Removed the unused import and switched to `helper.AssertIssuesWithoutRange`.
- The local development section described a "local path" configuration, but TFLint's manual plugin mode uses a manually installed binary with `source` and `version` omitted. Updated the wording.
- The distribution commands built raw binaries, but `tflint --init` expects release assets named like `tflint-ruleset-{name}_{GOOS}_{GOARCH}.zip` with a `checksums.txt` file. Updated the commands to create zip archives and checksums.
- The CI example used `terraform-linters/setup-tflint@v4`; the current documented major version is `v6`. Updated the action version and added `GITHUB_TOKEN` for plugin initialization rate-limit avoidance.

## Review Notes
The examples are now consistent with the current TFLint plugin SDK API and official plugin installation documentation. I could not run the Go examples locally because the workspace environment does not have the `go` command installed.
