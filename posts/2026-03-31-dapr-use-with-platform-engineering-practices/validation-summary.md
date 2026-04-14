# Validation Summary: How to Use Dapr with Platform Engineering Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar annotations, components, resiliency policies)
- Kubernetes (deployments, pod annotations, kubectl)
- GitHub Actions (CI workflow YAML)
- yq (Mike Farah's Go version, v4+)
- jq (JSON processing)
- Renovate (automated dependency updates)
- Backstage (catalog-info.yaml for service registration)
- GitOps workflows

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Mike Farah's yq documentation: https://mikefarah.gitbook.io/yq/
- Renovate configuration options: https://docs.renovatebot.com/configuration-options/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
1. **yq null check bug (line 83)**: The CI validation script used `if [ -z "$APP_ID" ]` to check whether the `dapr.io/app-id` annotation was present. Mike Farah's yq (Go, v4+) returns the string `null` when a YAML path does not exist, not an empty string. Since `-z` only tests for empty strings, the check would pass even when the annotation was missing. Fixed by adding `|| [ "$APP_ID" = "null" ]` to the conditional.

## Review Notes
- The `platform new-service` command is a hypothetical CLI provided by a platform team, not an official tool. This is clearly implied by the context but never explicitly stated.
- The `grep -r "value:.*password"` secret detection is intentionally simplistic for illustration purposes. A production implementation would use more robust secret scanning.
- The Renovate config targeting `daprio/daprd` assumes the Dapr runtime image version is pinned somewhere Renovate can discover it (e.g., Helm chart values). In practice, the Dapr sidecar injector manages the daprd image version, so the Renovate target might be the Dapr Helm chart release instead.
- The jq query for measuring golden path adoption is syntactically correct but assumes all pods have Dapr annotations accessible via `kubectl get pods`. This works because Dapr annotations set on the pod template spec are propagated to the pod metadata.
