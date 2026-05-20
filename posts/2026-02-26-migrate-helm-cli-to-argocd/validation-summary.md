# Validation Summary: How to Migrate from Helm CLI to ArgoCD Managed Helm Deployments

## Status
validated

## Post Type
Technical tutorial / migration guide

## Technologies Covered
- Argo CD Applications and sync options
- Argo CD Helm integration
- Helm CLI releases and release metadata
- Kubernetes resources, Secrets, and server-side apply
- GitOps deployment workflows

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD app deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Helm `helm list` command documentation: https://helm.sh/docs/helm/helm_list/
- Helm `helm get values` command documentation: https://helm.sh/docs/helm/helm_get_values/
- Helm `helm get manifest` command documentation: https://helm.sh/docs/helm/helm_get_manifest/
- Helm `helm upgrade` command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes `kubectl delete` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/

## Issues Found
- The post described existing resources as causing create conflicts and recommended `Replace` or `ServerSideApply` for adoption. Argo CD normally applies rendered manifests, and `Replace=true` uses `kubectl replace/create`, which Argo CD documents as potentially disruptive. Changed the guidance to recommend server-side apply for patching existing resources and warn against using `Replace=true` as the adoption path.
- The Helm repository values example implied that committing separate values files was enough when using a chart directly from a Helm repository. Argo CD values files must be available to the chart source unless using multi-source Applications. Updated the text and example to use `valuesObject`/`values`, with a note about multi-source Applications for separate Git values files.
- The `ignoreDifferences` example used `group: ""` with `kind: "*"`, which only targets the core API group rather than all groups. Changed it to `group: "*"` and `kind: "*"` to match Argo CD wildcard examples.
- The post claimed the initial sync guarantees no pod restarts or downtime. That is only true if the diff does not change rollout-triggering fields such as Deployment pod templates. Qualified the statement accordingly.
- The rollback command re-imported resources into Helm without accounting for Helm ownership metadata checks. Added `--take-ownership`, which is documented by current Helm `upgrade` as the flag for taking ownership of existing resources.

## Review Notes
The local environment did not have `helm` or `argocd` installed, so CLI flags were validated against official command documentation instead of local `--help` output. The cleanup command assumes Helm's default Secret storage backend; clusters using another Helm storage driver would need equivalent cleanup for that backend.
