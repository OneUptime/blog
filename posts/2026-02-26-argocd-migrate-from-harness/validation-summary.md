# Validation Summary: How to Migrate from Harness to ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes
- GitOps
- Harness CD
- External Secrets Operator
- Helm
- Kustomize

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo Rollouts Installation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts Canary Strategy: https://argoproj.github.io/argo-rollouts/features/canary/
- External Secrets Operator API Specification: https://external-secrets.io/main/api/spec/
- Harness Kubernetes Deployments Overview: https://developer.harness.io/docs/continuous-delivery/deploy-srv-diff-platforms/kubernetes/kubernetes-deployments-overview/
- Harness Delegate Overview: https://developer.harness.io/docs/platform/delegates/delegate-concepts/delegate-overview/

## Issues Found
- The Argo CD install command used plain `kubectl apply`. Current Argo CD documentation recommends server-side apply with `--server-side --force-conflicts` for the stable install manifests because some CRDs can exceed client-side apply annotation limits. Updated the command accordingly.
- The Argo CD login example used `localhost:8080` without first exposing the API server. Added the documented `kubectl port-forward svc/argocd-server -n argocd 8080:443` step and added `--insecure` for the default self-signed certificate setup.
- The Argo Rollouts section said Argo CD "delegates" canary and blue-green strategies to Argo Rollouts. Clarified that Argo CD syncs Rollout resources and the Argo Rollouts controller manages those deployment strategies.
- The secrets section implied Argo CD does not manage secrets directly. Clarified that Argo CD can deploy Kubernetes Secret resources, but does not provide a built-in external secret manager.
- The ExternalSecret snippet was labeled as an install example for External Secrets Operator. Changed the comment to identify it as an ExternalSecret example that assumes the operator is already installed.
- The approvals section implied Argo CD sync windows and manual sync are direct approval-step replacements. Clarified that they approximate approval behavior and that disabling automated sync requires a manual sync trigger, not a native approval workflow.

## Review Notes
- The Argo CD Application, Helm source, sync wave, hook, AppProject sync window, Argo Rollouts canary, and ExternalSecret examples use current documented API fields.
- The Rollout example uses basic canary behavior without traffic management. This is valid, but Argo Rollouts documents that percentage weights are approximate without a traffic router when replica counts do not divide cleanly.
- For production Argo CD and Argo Rollouts installs, pinning a released manifest version instead of using `stable` or `latest` is usually preferable for reproducibility.
