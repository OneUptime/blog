# Validation Summary: How to Use tofu output to Read Output Values - Tofu Read Values

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- OpenTofu CLI (`tofu output`)
- OpenTofu output values and HCL output blocks
- JSON output for automation
- Bash scripting with `jq`
- GitHub Actions job outputs

## Sources Consulted
- OpenTofu `tofu output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu JSON Output Format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu Sensitive Data in State documentation: https://opentofu.org/docs/language/state/sensitive-data/
- GitHub Actions job outputs documentation: https://docs.github.com/actions/using-jobs/defining-outputs-for-jobs
- GitHub Actions workflow syntax documentation (`jobs.<job_id>.runs-on`): https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idruns-on
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Incorrect formatting for a non-raw string output.** The post showed `tofu output vpc_id` returning `vpc-0a1b2c3d4e5f` without quotes. OpenTofu's human-readable output for a string value includes quotes unless `-raw` is used, so the example was updated to `"vpc-0a1b2c3d4e5f"`.
2. **Sensitive output examples implied plain `tofu output NAME` reveals the value.** OpenTofu redacts sensitive outputs in human-readable output; sensitive values are displayed with `-raw`, `-json`, or `-show-sensitive`. Updated the `database_endpoint` and `database_password` examples to use `tofu output -raw`.
3. **Incorrect JSON shape for a single named output.** The post showed `tofu output -json database_password` returning the all-outputs metadata object. For a named output, `-json` returns the selected value as JSON, so the example was updated to return `"superSecretP@ssw0rd"`.
4. **Incomplete GitHub Actions job example.** The `deploy-app` job had steps but no runner target. Added `runs-on: ubuntu-latest` to make the job valid.

## Review Notes
- The core explanation of output blocks, root-module outputs, child-module output re-exporting, `-json`, `-raw`, and sensitive data being present in state is accurate against official OpenTofu documentation.
- The shell script's `tr '\n' ','` command creates a trailing comma in `SUBNET_IDS`; this is acceptable for a short demonstration, but a production script may want stricter joining behavior.
- The author GitHub profile link resolves to the intended GitHub user.
