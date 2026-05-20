# Validation Summary: How to Implement Dry-Run Syncs in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- GitHub Actions
- GitOps deployment workflows

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl diff` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

## Issues Found
- The introduction overstated dry-run syncs as showing exactly what Argo CD will do. Updated it to say dry-run syncs preview what Argo CD plans to do.
- The `argocd app sync --resource` examples used slash-delimited resource identifiers. Argo CD documents the format as `GROUP:KIND:NAME` or `:KIND:NAME`, so the examples were changed to `apps:Deployment:my-app` and `:Service:my-app`.
- The `kubectl diff` command was labeled as server-side dry-run output but omitted `--server-side`. Added `kubectl diff --server-side -f /tmp/desired-manifests.yaml` to match the documented server-side behavior.
- The client-side dry-run comment said no cluster was needed. Kubernetes documents this mode as not sending the object to the API server, so the wording was tightened to avoid overstating what `kubectl` may need for discovery or validation.
- The Server-Side Diff explanation said the UI and CLI show exactly what would change on sync. Current Argo CD docs state that Server-Side Diff uses server-side apply dry-run, but also note caveats for new resources and mutation webhooks. The paragraph was updated to include those caveats.
- The sync hook section described PreSync validation as running before the actual sync. Argo CD runs `PreSync` hooks as part of a sync operation before applying the rest of the manifests, so the wording was corrected.
- The GitHub Actions CLI install snippets wrote directly to `/usr/local/bin` and then ran `chmod`, which can fail on hosted runners. Updated them to download to the workspace and use `sudo install -m 0755`.
- The pull request dry-run workflow compared against `origin/main` without ensuring that ref was available. Added `fetch-depth: 0` to `actions/checkout`.
- The approval workflow ran `argocd app diff` and `argocd app sync` without installing or logging in to the Argo CD CLI in those jobs. Added install and login steps before each Argo CD command.

## Review Notes
- The PreSync validation hook is structurally valid, but in a real cluster its service account needs RBAC permissions for the `kubectl get`, `kubectl top`, and deployment inspection commands.
- Server-Side Diff became stable in Argo CD v3.1.0; the post's "ArgoCD 2.10+" version note remains accurate for availability, but future readers should be aware that status changed from beta to stable in later releases.
