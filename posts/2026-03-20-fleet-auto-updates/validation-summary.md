# Validation Summary: How to Configure Fleet Auto-Updates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- GitHub webhooks
- GitLab webhooks
- `kubectl`

## Sources Consulted
- Fleet docs: Using Webhooks Instead of Polling — https://fleet.rancher.io/0.14/how-tos-for-users/webhook
- Fleet docs: GitRepo Resource — https://fleet.rancher.io/0.14/reference/ref-gitrepo
- Fleet docs: Create a GitRepo Resource — https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet source: `gitrepo_types.go` — https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source: `webhook.go` — https://raw.githubusercontent.com/rancher/fleet/main/pkg/webhook/webhook.go
- Kubernetes docs: `kubectl create secret generic` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes docs: `kubectl get` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes docs: `kubectl` quick reference — https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The GitHub and GitLab webhook callback URLs were incorrect. The post used `/webhook`, but Fleet’s `gitjob` webhook handler is exposed at `/` for the dedicated-host Ingress pattern shown in the post, so both URLs were corrected to `https://fleet-webhook.example.com/`.
- The webhook secret examples were incorrect. Fleet expects provider-specific keys such as `github` and `gitlab`, not `token`, and a per-GitRepo webhook secret must live in the same namespace as the `GitRepo`. The secret examples were updated accordingly.
- The `GitRepo` example used a non-existent field, `webhookCommitID`. This was replaced with the documented `webhookSecret` field, and the example now also uses `disablePolling: true` to match the webhook-only workflow being described.
- The “Forcing an Immediate Sync” section used unsupported mechanics: clearing `spec.revision` and annotating `fleet.cattle.io/commit` do not represent Fleet’s documented force-sync flow. This was replaced with incrementing `spec.forceSyncGeneration`.
- The monitoring and troubleshooting examples included inaccurate or misleading commands. Event sorting was updated to `.metadata.creationTimestamp`, the bundle creation timestamp example was replaced with GitRepo status fields that actually reflect polling/webhook sync state, and webhook verification now checks `.status.webhookCommit` instead of grepping controller logs.

## Review Notes
- The review was validated against Fleet 0.14 documentation and current Fleet source as available on April 30, 2026.
- `kubectl` was not installed in the local workspace, so command syntax was checked against the official Kubernetes command reference rather than local `--help` output.
- The “Pause Updates for Maintenance” example that pins `spec.revision` to the current commit is technically valid. Fleet also has a first-class `spec.paused` field, which may be a simpler future example if the post is revised again.
