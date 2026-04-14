# Validation Summary: How to Use Dapr with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr CLI (self-hosted mode)
- Podman (container runtime)
- Podman Compose
- Podman Desktop
- Redis (as Dapr state store)
- Zipkin (as Dapr tracing backend)
- GitHub Actions (CI/CD example)

## Sources Consulted
- Dapr CLI reference for `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference for `dapr stop`: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr CLI reference for `dapr uninstall`: https://docs.dapr.io/reference/cli/dapr-uninstall/
- Dapr self-hosted with Podman guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-podman/
- Dapr CLI source code (github.com/dapr/cli), specifically `cmd/stop.go` and `pkg/standalone/standalone.go`

## Issues Found

### 1. Invalid `dapr stop` flags (line 83, 96)
**What was wrong:** The post used `dapr stop --all --container-runtime podman`. The `dapr stop` command does not accept `--all` or `--container-runtime` flags. It only accepts `--app-id`, `--run-file`, and `--kubernetes`.
**What was changed:** Replaced the invalid `dapr stop` command with `dapr stop --app-id myapp` (to stop a specific app) and pointed to `dapr uninstall --container-runtime podman` for removing all Dapr infrastructure. Also corrected the text on line 83 that said `--container-runtime` is needed for `dapr init` and `dapr stop` — changed to `dapr init` and `dapr uninstall`.

### 2. Invalid `--container-runtime` flag on `dapr run` (CI/CD example, line 160)
**What was wrong:** The CI/CD GitHub Actions example passed `--container-runtime podman` to `dapr run`. This flag does not exist on `dapr run` — it only applies to `dapr init` and `dapr uninstall`. This contradicted the post's own earlier (correct) statement.
**What was changed:** Removed the `--container-runtime podman` flag from the `dapr run` command in the CI/CD example.

### 3. Invalid `dapr stop --all --container-runtime podman` in CI/CD example (line 164)
**What was wrong:** The CI/CD cleanup step used the same invalid `dapr stop` command.
**What was changed:** Replaced with `dapr uninstall --container-runtime podman`, which is the correct way to clean up Dapr containers.

### 4. Missing `dapr_scheduler` container (multiple locations)
**What was wrong:** Dapr 1.14+ includes a scheduler service container (`dapr_scheduler`) in the default self-hosted init, but it was missing from the expected output, the `podman ps` output, and the architecture diagram.
**What was changed:** Added `dapr_scheduler` container to the expected init output, the `podman ps` output table, and the mermaid diagram.

### 5. CI/CD example combined `--slim` with `--container-runtime podman` then used `dapr stop`
**What was wrong:** The CI/CD example ran `dapr init --container-runtime podman --slim`. Since `--slim` skips all container creation, the `--container-runtime` flag is effectively a no-op. Additionally, the cleanup step used the invalid `dapr stop` command.
**What was changed:** Changed CI/CD init to use full `dapr init --container-runtime podman` (without `--slim`) since the example runs tests that may need the default state store. Changed cleanup to `dapr uninstall --container-runtime podman`.

## Review Notes
- The slim init section correctly describes `--slim` behavior but combining `--slim` with `--container-runtime podman` is technically redundant since slim mode doesn't pull containers. The command is still valid, just the `--container-runtime` flag has no effect in slim mode. This was left as-is since it's not incorrect, just unnecessary.
- The Podman Desktop section shows `systemctl --user` commands which only apply to Linux. On macOS, Podman Desktop connects via the Podman machine VM. This is a minor platform-specificity note, not an error.
- The `podman inspect` format string uses Go template syntax (`{{.NetworkSettings.IPAddress}}`), which is correct for Podman.
- The `dapr status` command shown in the verification section is a Kubernetes-only command and will not show useful output in self-hosted mode. However, this is a minor usability note rather than a technical error in the command itself.
