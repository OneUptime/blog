# Validation Summary: How to Plan a Dapr Version Upgrade

## Status
validated

## Post Type
Guide / Checklist

## Technologies Covered
- Dapr (runtime, CLI, control plane)
- Kubernetes (kubectl, CRDs, namespaces)
- Helm (chart upgrades, rollbacks)
- Bash scripting
- jq (JSON processing)
- GitHub API (release notes)

## Sources Consulted
- `kubectl create --help` output to verify available subcommands (confirmed `event` is not a valid subcommand)
- `kubectl version --help` output to confirm `--short` flag has been removed
- Dapr control plane architecture documentation and related blog posts in this repository (`posts/2026-03-31-dapr-control-plane-components/README.md`, `posts/2026-03-31-dapr-status-command-control-plane-health/README.md`)
- Dapr Helm upgrade documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#upgrading-dapr
- GitHub REST API documentation for releases endpoint

## Issues Found

1. **`kubectl version --short` flag removed** (line 36): The `--short` flag has been fully removed from kubectl. Running `kubectl version --short` now fails with `error: unknown flag: --short`. Changed to `kubectl version`, which now outputs concise version information by default.

2. **`kubectl create event` is not a valid command** (lines 121-125): `kubectl create` does not have an `event` subcommand. The available `kubectl create` subcommands are: clusterrole, clusterrolebinding, configmap, cronjob, deployment, ingress, job, namespace, poddisruptionbudget, priorityclass, quota, role, rolebinding, secret, service, serviceaccount, token. Replaced with `kubectl annotate namespace` to record the planned upgrade as a namespace annotation, which is a working and idiomatic approach.

3. **Incomplete Dapr control plane component list** (line 83): The post listed only three control plane components (dapr-operator, dapr-sentry, placement-server), omitting `dapr-sidecar-injector` and `dapr-scheduler-server`. The Dapr control plane consists of five core components: dapr-operator, dapr-sentry, dapr-sidecar-injector, dapr-scheduler-server, and dapr-placement-server. Updated the list to include all five.

## Review Notes
- The Helm chart name `dapr/dapr` and namespace `dapr-system` are correct for standard Dapr Kubernetes installations.
- The upgrade sequence (control plane first, then sidecars) aligns with official Dapr upgrade guidance.
- The bash script for the pre-upgrade checklist is functional, though the SDK version detection via environment variables (step 6) is a heuristic that won't catch all SDK versions since not all applications expose SDK versions as environment variables.
- The GitHub API URL for fetching release notes is correct and functional.
- The YAML runbook is well-structured and syntactically valid.
