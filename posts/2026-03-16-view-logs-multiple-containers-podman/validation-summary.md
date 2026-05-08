# Validation Summary: How to View Logs from Multiple Containers in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman CLI
- Containers
- Pods
- Shell scripting
- Logging
- JSON Lines

## Sources Consulted
- Podman `podman logs` official documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman `podman pod logs` official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-logs.1.html
- Podman `podman ps` official documentation: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman `podman pod inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html

## Issues Found
- The labeled multi-container examples used shell loops even though current Podman supports `podman logs` with one or more containers and the `--names` option. Updated those examples to use `podman logs --names` directly.
- The chronological merge examples prefixed labels before timestamps, which would cause `sort` to group by container label before timestamp instead of sorting globally by time. Moved labels after the timestamp so the timestamp remains the first sort key.
- The pod examples used `podman pod inspect` with `{{.Name}}` inside `.Containers`, but current official examples document container IDs in `.Containers` and Podman provides `podman pod logs` for pod-level log retrieval. Replaced the pod log loops with `podman pod logs --names` and used `podman ps --filter pod=...` to list container names.
- The JSONL export built JSON with string interpolation, which can produce invalid JSON when log lines contain quotes, backslashes, or other characters needing escaping. Updated it to use `jq -R --arg` for proper JSON string encoding.
- The summary said multi-container Podman logs require shell scripting. Updated it to reflect Podman's native multi-container and pod log support while preserving the shell-based merging guidance.

## Review Notes
The updated JSONL export assumes `jq` is installed. The shell-script section still uses Bash-specific features such as arrays and `mapfile`, which is appropriate because the script declares `#!/bin/bash`.
