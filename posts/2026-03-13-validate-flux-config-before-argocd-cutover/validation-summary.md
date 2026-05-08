# Validation Summary: How to Validate Flux Configuration Before Cutting Over from ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes
- GitOps
- Bash
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `diff kustomization` command reference: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux getting started guide for `flux get kustomizations --watch`: https://fluxcd.io/flux/get-started/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD application deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/

## Issues Found
- The source validation assumed every Flux Kustomization used a same-namespace `GitRepository`. Updated the script to read `.spec.sourceRef.kind` and optional `.spec.sourceRef.namespace`, because Flux Kustomizations can reference GitRepository, OCIRepository, Bucket, or ExternalArtifact sources, and cross-namespace references are supported.
- The source revision check was labeled as a recent commit check. Updated it to check for an artifact revision, because non-Git source types may not represent revisions as Git commits.
- The Kustomization path check required `.spec.path` to be non-empty. Updated it to allow the documented default source root path when `.spec.path` is blank.
- The `flux diff kustomization` dry-run used `||` and treated exit status 1 as an error. Updated it to inspect the exit code, because the Flux command reference documents exit status 1 as "differences were found" and values greater than 1 as command errors.
- The dry-run script printed `.status.lastAppliedRevision` under an "Images in Flux source" heading. Updated the heading because that field is the last applied revision, not a list of container images.
- The health check display piped JSONPath output into `python3 -m json.tool`, but kubectl JSONPath output for arrays is not JSON. Replaced it with a JSONPath format that prints health check references directly.
- The health check parsing used unquoted shell variables and did not handle an omitted namespace. Quoted the parsed line and defaulted the namespace to `myapp` in the example.
- The best-practice snapshot command used `kubectl get all` while saying it captured all resources. Updated the wording to "common workload resources" because `kubectl get all` does not include every Kubernetes resource type.

## Review Notes
The Argo CD `argocd app set --sync-policy none`, `argocd app resources`, and `argocd app delete --cascade=false` commands align with the official Argo CD documentation. The post remains a practical guide, but production migrations should still account for ApplicationSet-managed Argo CD applications and any suspended Flux HelmReleases separately.
