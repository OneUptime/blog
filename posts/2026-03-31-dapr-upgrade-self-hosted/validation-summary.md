# Validation Summary: How to Upgrade Dapr in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI
- Docker (container management)
- Redis (state store component)
- Zipkin (tracing component)

## Sources Consulted
- Dapr self-hosted upgrade guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-upgrade/
- Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr CLI reference — `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference — `dapr uninstall`: https://docs.dapr.io/reference/cli/dapr-uninstall/
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference — `dapr stop`: https://docs.dapr.io/reference/cli/dapr-stop/

## Issues Found

### Issue 1: `dapr uninstall` missing `--all` flag (High severity)
- **What was wrong:** The post used bare `dapr uninstall` without the `--all` flag. The official Dapr upgrade documentation recommends `dapr uninstall --all` for a clean upgrade. Without `--all`, Redis, Zipkin, Scheduler, and Placement containers are NOT removed.
- **What was changed:** Updated the command to `dapr uninstall --all`.
- **Why:** Plain `dapr uninstall` only removes the Dapr sidecar binaries and does not clean up dependency containers, which can cause conflicts when reinitializing.

### Issue 2: Incorrect description of `dapr uninstall` behavior (High severity)
- **What was wrong:** The post claimed that `dapr uninstall` "stops and removes the Redis and Zipkin containers but does NOT remove your component configuration files." This is incorrect — plain `dapr uninstall` does neither of those things (it does NOT remove Redis/Zipkin, and it does preserve component files). The `--all` flag does remove the containers AND the entire `~/.dapr/` directory including component files.
- **What was changed:** Corrected the description to accurately reflect `dapr uninstall --all` behavior: it removes Redis, Zipkin, Scheduler, and Placement containers, plus the entire `~/.dapr/` directory.
- **Why:** Users following the original instructions would have stale containers left running and might be confused when `docker ps -a | grep dapr` still showed results.

### Issue 3: No backup step for component files (High severity)
- **What was wrong:** Since `dapr uninstall --all` removes the `~/.dapr/` directory (including component configuration files), users would lose their custom component configurations.
- **What was changed:** Added a backup step (`cp -r ~/.dapr/components ~/.dapr/components-backup`) before the uninstall, and a restore step after `dapr init`.
- **Why:** Users with customized component files would lose their configurations without this step.

### Issue 4: Summary paragraph inaccuracy
- **What was wrong:** The summary stated "Your component configuration files are preserved across upgrades" which is not true when using `dapr uninstall --all`.
- **What was changed:** Updated the summary to mention the `--all` flag and the need to back up `~/.dapr/components/`.
- **Why:** Consistency with the corrected upgrade procedure.

## Review Notes
- The blog post upgrades the CLI before uninstalling the runtime, while the official Dapr docs recommend uninstalling first, then upgrading the CLI. Both approaches work in practice, so this was not changed, but readers should be aware of the official ordering.
- The CLI install commands (wget for Linux, PowerShell for Windows) match the official documentation exactly.
- The `--runtime-version` flag for `dapr init`, `dapr run` syntax, `dapr stop --app-id` syntax, and `dapr list` command are all correct.
- The YAML component example is illustrative rather than showing a real version-specific change. The `enableTLS` field is a valid Redis component metadata field, so the example is reasonable.
- The GitHub API command for fetching release notes is syntactically correct and functional.
