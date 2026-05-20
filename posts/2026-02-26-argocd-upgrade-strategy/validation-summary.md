# Validation Summary: How to Plan an ArgoCD Upgrade Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Application and ApplicationSet custom resources
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD upgrade overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/overview/
- Argo CD v2.11 to v2.12 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.11-2.12/
- Argo CD tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/tested-kubernetes-versions/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo Helm chart index: https://argoproj.github.io/argo-helm/index.yaml
- Argo CD v2.12.0 official manifests: https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/install.yaml
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- `kubectl version --short` is no longer listed in current kubectl reference documentation. Changed it to `kubectl version -o yaml`, which uses a documented output option.
- The post used Helm chart version `7.3.0` as the new Argo CD v2.12 example, but the official Argo Helm chart metadata shows `7.3.0` has `appVersion: v2.11.3`. Updated the new-version examples to chart `7.4.3`, which maps to `appVersion: v2.12.0`.
- The blue-green `Application` example omitted fields needed for a usable Argo CD Application, including `project`, `source.repoURL`, `source.targetRevision`, and destination cluster information. Added minimal placeholder values matching the Application spec.
- The post referred to setting a "maintenance window annotation", but Argo CD sync windows are configured on projects. Changed this to "configure a sync window in the AppProject."
- The command to scale the application controller used `deployment`, but official Argo CD manifests and the Helm chart define `argocd-application-controller` as a StatefulSet. Changed the command to scale the StatefulSet and clarified that this should not be done before a self-managed GitOps upgrade.
- The ApplicationSet example omitted `project` and `destination`, so generated Applications would be incomplete. Added `project: default` and a destination using the generated cluster name and `argocd` namespace.

## Review Notes
The post is now technically valid for its Argo CD v2.12.0 examples. Future updates should refresh the specific chart versions and Kubernetes compatibility table if the article is revised for newer Argo CD releases.
