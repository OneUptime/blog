# Validation Summary: How to Configure Plugin Discovery in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Config Management Plugins
- YAML
- Shell commands
- CUE
- SOPS
- Kustomize

## Sources Consulted
- Argo CD official Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD official Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Config Management Plugin v2 proposal: https://argo-cd.readthedocs.io/en/stable/proposals/config-management-plugin-v2/
- Doublestar glob package documentation used by Argo CD-style double-star globbing: https://pkg.go.dev/github.com/bmatcuk/doublestar/v4

## Issues Found
- Corrected the description of automatic CMP discovery to clarify that Applications need a `plugin` section with no `name` for plugin discovery, rather than implying CMP discovery runs for any Application without a plugin name.
- Corrected command-based discovery semantics. The post said the exit code does not matter, but Argo CD requires `discover.find.command` to exit with status code `0` and produce non-empty stdout to match.
- Corrected explicit plugin selection behavior. The post said discovery is skipped entirely when `plugin.name` is set, but Argo CD documentation states that the named plugin is used only if its configured discovery pattern or command matches the repository; plugins without discovery can still be invoked explicitly.
- Corrected the discovery conflict explanation to avoid claiming that plugin priority is typically determined by pod spec order. The official CMP proposal describes repo-server listing available plugin sockets and selecting the first plugin that returns a positive discovery response.
- Corrected the built-in Helm/CMP guidance to avoid the unsupported claim that built-in tools are always checked before CMP plugins. The post now advises setting a `plugin` section for CMP discovery or a specific plugin name when a custom plugin should handle the Application.

## Review Notes
The CUE, SOPS, and Kustomize binaries were not installed in the local environment, so those tool invocations were reviewed against expected CLI usage and shell behavior rather than executed locally. The shell discovery examples use `if` blocks that return status `0` with empty output when not matched, which is compatible with Argo CD discovery semantics.
