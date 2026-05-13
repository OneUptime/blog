# Validation Summary: How to Fix Flux Reconciliation Not Detecting Git Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- GitRepository
- source-controller
- notification-controller Receiver webhooks
- Kubernetes NetworkPolicy

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Git `ls-remote` documentation: https://git-scm.com/docs/git-ls-remote

## Issues Found
- The command for verifying the remote repository used `git log --oneline origin/main -5`, which only checks the local remote-tracking ref unless the local repository has fetched recently. It was changed to `git ls-remote origin refs/heads/main` so it checks the remote branch directly.
- The post claimed Git server rate limiting causes source-controller to silently skip fetches. Flux reports reconciliation failures through status, events, and logs, so the wording was changed to describe throttling or transient failures as reported errors.
- The credential check used a label selector that is not the reliable way to find the GitRepository's configured Secret. It now reads `.spec.secretRef.name` and checks the referenced Secret name.
- The Receiver example omitted the optional but clearer `apiVersion` in the referenced GitRepository resource. It now matches the official Flux Receiver examples more closely.
- The webhook endpoint section only showed the Service. It now also shows how to read the generated Receiver `.status.webhookPath`, which is required to build the provider webhook URL.
- The NetworkPolicy example used `to: []`. In Kubernetes NetworkPolicy, omitting `to` is the correct way to allow egress to all destinations for the listed ports; the example was updated accordingly.

## Review Notes
The post is technically valid after the corrections. The example names such as `my-repo-auth`, `org/repo`, and `my-repo` remain placeholders and must match the user's actual Flux resources.
