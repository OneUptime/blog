# Validation Summary: How to Set Up GitOps with ArgoCD on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Argo CD
- Argo CD CLI
- Argo CD Application and AppProject CRDs
- Argo CD ApplicationSet
- Helm
- Kustomize
- Argo CD sync policies, sync options, hooks, and sync waves
- Bitnami Sealed Secrets
- External Secrets Operator
- Argo CD Notifications

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD ApplicationSet Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Projects: https://argo-cd.readthedocs.io/en/latest/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD Notifications Slack service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD Notifications Subscriptions: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/subscriptions/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami/sealed-secrets

## Issues Found
- The GitOps diagram showed Argo CD reporting status back to the Git repository. Argo CD monitors Git and reports application status through Argo CD interfaces and APIs, not by writing status back to Git by default. Changed the diagram edge to report back to the developer.
- The Argo CD installation command used client-side `kubectl apply`. Current Argo CD installation docs recommend server-side apply with `--server-side --force-conflicts` for the stable manifest because some CRDs can exceed the client-side apply annotation size limit. Updated the command.
- The local `argocd login localhost:8080` command omitted `--insecure`, which is needed for the default local port-forwarded install unless the self-signed certificate is trusted. Added `--insecure`.
- The Helm example used `valueFiles` with a third-party Helm repository while describing it as a values file from a Git repo. For external charts, Git-hosted values files require Argo CD multiple sources; the shown single-source Helm example would not reliably find `values-production.yaml`. Removed the misleading `valueFiles` block and kept the valid inline values and parameters.
- The AppProject blacklist used the core API group for `NetworkPolicy`. Kubernetes `NetworkPolicy` belongs to `networking.k8s.io`, so the blacklist would not match the intended resource. Updated the group.
- Two sync option comments described the wrong behavior: `ApplyOutOfSyncOnly=true` does not control ordering, and `RespectIgnoreDifferences=true` does not respect resource hooks. Updated the comments to match Argo CD sync option behavior.

## Review Notes
- The examples are generally valid for current Argo CD and Kubernetes APIs, but production deployments should pin Argo CD install manifests and Helm chart versions intentionally rather than relying on the moving `stable` branch.
- The Helm chart version `55.0.0` is an older pinned `kube-prometheus-stack` version. Pinning is technically valid, but readers may want to choose a currently supported chart version for new installations.
