# Validation Summary: How to Fix Dapr Helm Upgrade Timeout Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Helm (Kubernetes package manager)
- Kubernetes (kubectl CLI)
- Dapr CLI

## Sources Consulted
- Helm official documentation for `helm upgrade` command and default timeout (https://helm.sh/docs/helm/helm_upgrade/)
- Dapr Kubernetes upgrade documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/)
- Dapr production guidelines confirming placement service is a StatefulSet (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/)
- Dapr CLI reference for `dapr version` command (https://docs.dapr.io/reference/cli/dapr-version/)
- Dapr CLI reference for `dapr status` command (https://docs.dapr.io/reference/cli/dapr-status/)
- Dapr Helm chart README for `global.tag` parameter (https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)

## Issues Found

### 1. `dapr-placement-server` treated as a Deployment (High severity)
- **What was wrong:** The post used `kubectl rollout restart deployment dapr-placement-server` but `dapr-placement-server` is a StatefulSet, not a Deployment. This command would fail if copy-pasted.
- **What was changed:** Split the restart command into two: one for the three Deployments (`dapr-operator`, `dapr-sentry`, `dapr-sidecar-injector`) and a separate command for the StatefulSet (`dapr-placement-server`).
- **Why:** The Dapr placement service uses a StatefulSet because it requires stable network identities and ordered deployment for its Raft consensus protocol.

### 2. `dapr version -k` is not a valid command (High severity)
- **What was wrong:** The post used `dapr version -k` in two places (rollback verification and pre-upgrade checklist). The `dapr version` command does not accept the `-k`/`--kubernetes` flag.
- **What was changed:** Replaced both occurrences of `dapr version -k` with `dapr status -k`, which is the correct command for checking Dapr runtime status on Kubernetes.
- **Why:** Per the Dapr CLI reference, `dapr version` only supports `--help` and `--output` flags. The `-k` flag is supported by `dapr status`.

## Review Notes
- The `--reuse-values` flag used in the first `helm upgrade` example is valid Helm syntax but is not what the official Dapr upgrade documentation recommends. Dapr docs use explicit `--version` flags without `--reuse-values`. This is not incorrect but readers should be aware that using an explicit values file is generally considered a safer practice.
- Dapr 1.14+ introduced a `dapr-scheduler` control plane component that is not mentioned in the post. This is acceptable since the post focuses on timeout troubleshooting rather than enumerating all components.
- The error message code block uses `yaml` syntax highlighting for what is actually terminal output. This is a minor formatting choice that does not affect technical accuracy.
