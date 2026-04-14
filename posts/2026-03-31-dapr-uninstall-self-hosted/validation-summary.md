# Validation Summary: How to Uninstall Dapr from Self-Hosted Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Docker
- Dapr CLI
- PowerShell (Windows cleanup)

## Sources Consulted
- Dapr CLI uninstall command reference: https://docs.dapr.io/reference/cli/dapr-uninstall/
- Uninstall Dapr in a self-hosted environment: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-uninstall/
- Dapr CLI init command reference: https://docs.dapr.io/reference/cli/dapr-init/
- Initialize Dapr in your local environment: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Install the Dapr CLI: https://docs.dapr.io/getting-started/install-dapr-cli/
- Run Dapr in self-hosted mode without Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/

## Issues Found

1. **Missing Scheduler service container**: The post omitted the `dapr_scheduler` container, which is created by `dapr init` in current Dapr versions. Added it to the init description, manual cleanup commands, and all container lists.

2. **Incorrect `dapr uninstall` behavior**: The post claimed `dapr uninstall` removes all Docker containers and showed sample output listing removal of dapr_zipkin, dapr_redis, and dapr_placement. In reality, the basic `dapr uninstall` only removes the placement container and binaries — Redis, Zipkin, and Scheduler containers are preserved. Fixed the description and removed the inaccurate sample output.

3. **Non-existent `--slim` flag on uninstall**: The post recommended `dapr uninstall --slim` for slim-mode installations. The `--slim` flag does not exist on the `dapr uninstall` command (it only exists on `dapr init`). Fixed to use the standard `dapr uninstall` command with an explanation that no containers need removal in slim mode.

4. **Incomplete `--all` flag description**: The post described `--all` as only removing the `~/.dapr` directory. In reality, `--all` also removes the Redis, Zipkin, and Scheduler containers that the basic uninstall preserves. Updated the description to reflect the full scope of `--all`.

5. **Updated summary**: The closing summary incorrectly referenced `--slim` flag and misstated what the basic uninstall removes. Corrected to match the actual CLI behavior.

## Review Notes
- The directory structure claims (~/.dapr/bin/, ~/.dapr/components/, ~/.dapr/config.yaml) are correct.
- The CLI binary location (/usr/local/bin/dapr on macOS/Linux) is correct.
- The Windows path ($env:USERPROFILE\.dapr) is correct.
- The verification commands (docker ps -a | grep dapr, which dapr) are correct and useful.
