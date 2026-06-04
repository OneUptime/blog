# Validation Summary: How to Build PR-Based Preview Environments with ArgoCD Pull Request Generator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet pull request generator
- Argo CD Applications and namespace creation
- GitHub and GitLab pull/merge requests
- Kubernetes manifests, Ingress, ResourceQuota, StatefulSet, and namespaces
- Kustomize overlays
- ExternalDNS with Cloudflare
- GitHub Actions and actions/github-script
- kube-janitor TTL cleanup
- PrometheusRule monitoring

## Sources Consulted
- Argo CD Pull Request Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD sync options and managedNamespaceMetadata: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD ApplicationSet resource deletion documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/applicationset/Application-Deletion/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- actions/github-script documentation: https://github.com/actions/github-script
- kube-janitor repository and deployment manifests: https://codeberg.org/hjacobs/kube-janitor

## Issues Found
- The ApplicationSet examples labeled generated Applications but later queried namespaces by `preview=true`. Added `managedNamespaceMetadata` labels with `CreateNamespace=true` so Argo CD applies labels to generated namespaces.
- The GitLab pull request generator example used a repository path and an unnecessary `api` value for GitLab.com. Updated it to use a GitLab project ID, matching the Argo CD documentation.
- The Kustomize example used deprecated `bases`, `commonLabels`, and `patchesStrategicMerge` fields. Updated the snippet to use `resources`, `labels`, and `patches`.
- The Ingress example implied that ApplicationSet template variables in a repository Kustomize patch would be rendered automatically. Clarified that this must be in Helm templates or an ApplicationSet `source.kustomize` patch.
- The ExternalDNS manifest was incomplete for Cloudflare because it omitted provider credentials and RBAC/chart setup. Replaced it with the official Helm chart values and install commands using a Cloudflare API token Secret.
- The GitHub Actions example used an older `actions/github-script` version and did not await the comment API call or declare write permission for issue comments. Updated it to `actions/github-script@v9`, added `await`, and added `issues: write`.
- The TTL section suggested deleting generated Applications with kube-janitor as if that were durable while a PR still matched the generator. Clarified that ApplicationSet can recreate matching Applications and reframed TTL cleanup as a safety net for orphaned preview resources. Replaced the broken kube-janitor Helm repo command with the current Codeberg Kustomize install path.

## Review Notes
- `kubectl` and `helm` were not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- The post remains a practical tutorial, but production deployments should also include provider-specific secrets management, ExternalDNS permissions review, and PR workflow handling for forked pull requests.
