# Validation Summary: How to Handle ArgoCD Applications with Shared Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- ApplicationSets
- GitOps
- Kubernetes
- kubectl

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Compare Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Declarative Setup resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes `kubectl annotate` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The post implied that Argo CD always throws an ownership error when another Application manages the same resource. Updated this to state that sync failure occurs when `FailOnSharedResource=true` is configured, while duplicate ownership can otherwise create confusing sync status and drift.
- The post said Argo CD adds both tracking labels and annotations to every managed resource. Updated this to reflect Argo CD's configured resource tracking method and the current default `annotation` mode.
- The tracking method section called `label` legacy. Updated this because `label` remains a documented tracking option, though `annotation` is the current default.
- The resource exclusion section incorrectly said `argocd.argoproj.io/compare-options` excludes resources from tracking and included an unsupported `namespaces` field under `resource.exclusions`. Updated it to explain that `IgnoreExtraneous` only affects sync status and that `resource.exclusions` applies to resource group/kind classes on clusters.
- The post recommended `argocd.argoproj.io/managed-by` as a resource ownership annotation. Replaced this with guidance not to manually assign tracking ownership annotations in multiple Applications, because Argo CD documents `argocd.argoproj.io/tracking-id` as its tracking annotation and `argocd.argoproj.io/managed-by` is not the documented mechanism for resource ownership.
- The Application and ApplicationSet examples omitted `spec.project`. Added `project: default` to make the examples complete.

## Review Notes
The local workspace does not have `kubectl` or `argocd` installed, so CLI syntax was checked against the official generated command references instead of local `--help` output.
