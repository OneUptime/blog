# Validation Summary: How to Convince Your Team to Adopt GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitOps
- Argo CD
- Argo Rollouts
- Kubernetes
- Helm
- AWS EKS
- CI/CD deployment pipelines
- Mermaid diagrams

## Sources Consulted
- OpenGitOps principles: https://opengitops.dev/
- Argo CD overview and quick start: https://argo-cd.readthedocs.io/en/stable/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_hooks/
- Argo CD app create command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- AWS CLI EKS update-kubeconfig command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The Argo CD Application manifest omitted `spec.project` and `spec.destination`, which are part of a complete Application definition. Added `project: default` and an in-cluster production destination so the example is structurally complete.
- The database migration hook used a fixed `metadata.name`. Argo CD documentation notes named hooks are only created once unless `BeforeHookCreation` is used; changed it to `generateName: db-migration-` so the hook can be recreated for repeated syncs.
- The Argo Rollouts example omitted the required workload shape for a usable Rollout. Added `replicas`, `selector`, and `template` fields while keeping the canary steps unchanged.
- The Argo CD quick-start install command omitted current `--server-side --force-conflicts` flags. Added them to match current Argo CD quick-start guidance for CRD size limitations.
- The proof-of-concept command used `--sync-policy automated` but the text demonstrates automatic drift reversion. Added `--self-heal` so live-cluster drift is reconciled automatically.

## Review Notes
The post remains a practical adoption guide rather than a full production hardening guide. Future improvements could mention pruning behavior, Argo CD login/API access setup, and the need to tune rollback and migration practices per application, but those are not correctness issues in the current scope.
