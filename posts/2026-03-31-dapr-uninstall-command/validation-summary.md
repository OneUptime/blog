# Validation Summary: How to Use the dapr uninstall Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr CLI (`dapr uninstall`)
- Kubernetes (kubectl)
- Docker
- Bash scripting

## Sources Consulted
- Dapr CLI reference for `dapr uninstall`: https://docs.dapr.io/reference/cli/dapr-uninstall/
- Dapr self-hosted uninstall guide: https://docs.dapr.io/getting-started/uninstall-dapr-selfhosted/
- Dapr Kubernetes uninstall guide: https://docs.dapr.io/getting-started/uninstall-dapr-kubernetes/
- Dapr CLI install documentation: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr CLI source code (`pkg/standalone/uninstall.go`, `pkg/kubernetes/uninstall.go`)

## Issues Found

1. **Basic `dapr uninstall` description was misleading** (line 17): The post said "Remove Dapr and its default containers (Redis, Zipkin)" for the basic `dapr uninstall` command. In reality, the basic command only removes the placement container and Dapr binaries — Redis and Zipkin containers are only removed with the `--all` flag. Fixed the description to accurately state what the basic command removes.

2. **`--all` flag description was incomplete for self-hosted mode** (lines 29-34): The post listed only Redis, Zipkin, `~/.dapr/bin/`, and `~/.dapr/components/` as being removed. In reality, `--all` removes the entire `~/.dapr/` directory (including config.yaml, scheduler data, etc.), the Scheduler container, and the `dapr_scheduler` Docker volume. Updated the list to be accurate and complete.

3. **Incorrect claim that namespace is deleted** (line 41): The post stated that `dapr uninstall --kubernetes` "deletes the namespace itself." The Dapr CLI does not delete the namespace — it only removes the Helm releases within it. Users must manually delete the namespace with `kubectl delete namespace` if desired. Fixed to clarify the namespace is not automatically removed.

4. **Missing HTTPEndpoint CRD in `--all` warning** (line 59): The warning about `--all` on Kubernetes listed Component, Configuration, Subscription, and Resiliency resources but omitted HTTPEndpoint, which is also a Dapr CRD that gets deleted. Added HTTPEndpoint to the list.

5. **Incorrect Windows CLI binary path** (line 101): The post showed `$env:USERPROFILE\.dapr\bin\dapr.exe` as the Windows CLI location. The actual default install location is `$env:SystemDrive\dapr\dapr.exe` (typically `C:\dapr\dapr.exe`). The `~/.dapr/` directory stores runtime binaries (daprd, placement), not the CLI itself. Fixed to the correct path.

## Review Notes
- The uninstall-and-reinstall bash script (lines 65-78) is written for self-hosted mode only. If a user runs `dapr uninstall --all` without `--kubernetes`, it works correctly for the self-hosted scenario shown. However, the script could be confusing in a post that also covers Kubernetes uninstall — consider adding a comment noting it's for self-hosted mode.
- The `dapr version` command at the end of the reinstall script will show the CLI version but not runtime version until a sidecar is actually running. This is minor and not incorrect.
