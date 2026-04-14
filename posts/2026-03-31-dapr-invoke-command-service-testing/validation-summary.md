# Validation Summary: How to Use the dapr invoke Command for Service Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr CLI (`dapr invoke` command)
- Dapr service invocation building block
- Shell scripting (bash)
- jq for JSON parsing

## Sources Consulted
- Dapr CLI source code (`dapr/cli` GitHub repository) — `cmd/invoke.go`, `pkg/standalone/invoke.go`, `cmd/dapr.go`
- Dapr official documentation — `dapr invoke` CLI reference (dapr-invoke.md from `dapr/docs` repo)

## Issues Found

### 1. Misleading "Basic GET Request" example (was lines 17–27)
**What was wrong:** The section was titled "Basic GET Request" but the first example (`dapr invoke --app-id order-service --method orders`) had no `--verb GET` flag, so it would actually make a POST request (the default). The text below acknowledged the default is POST, but the section header and initial example were contradictory.
**What was changed:** Removed the first example that omitted `--verb GET` and consolidated the section to lead with the correct command using `--verb GET`.

### 2. Non-existent `--metadata` flag (was lines 63–71)
**What was wrong:** The "Specifying Content Type" section used a `--metadata` flag (`--metadata '{"Content-Type": "application/json"}'`) which does not exist on the `dapr invoke` command. The Content-Type header is hardcoded to `application/json` in the Dapr CLI implementation and cannot be overridden.
**What was changed:** Replaced the section with accurate information explaining that Content-Type is automatically set to `application/json` and cannot be changed via `dapr invoke`. Noted that `curl` against the Dapr HTTP API is the alternative for custom content types.

### 3. Non-existent `--kubernetes` and `--namespace` flags (was lines 73–82)
**What was wrong:** The "Targeting Kubernetes Apps" section used `--kubernetes` and `--namespace production` flags, neither of which exist. The `dapr invoke` command explicitly supports self-hosted environments only, as stated in both the source code and official documentation.
**What was changed:** Replaced the section with accurate information about platform support, noting the command is self-hosted only, and suggesting `kubectl port-forward` with `curl` as the Kubernetes alternative.

## Review Notes
- The `--data` and `--data-file` flags are mutually exclusive — the command will exit with an error if both are provided. The post uses them in separate examples which is correct, but does not mention this constraint.
- The `--verb DELETE` usage in the shell script section is valid — `--verb` accepts any HTTP method string.
- The jq piping example is a valid and practical pattern.
