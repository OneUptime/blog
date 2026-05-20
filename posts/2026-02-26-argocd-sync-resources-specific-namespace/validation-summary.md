# Validation Summary: How to Sync Only Resources in a Specific Namespace in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Argo CD Applications
- Argo CD ApplicationSets
- Kubernetes namespaces and cluster-scoped resources
- Bash
- jq
- kubectl

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_wait/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Kubernetes `kubectl get` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post used `argocd app resources --output json`, but current Argo CD documentation only lists `tree` and `tree=detailed` output for `argocd app resources`. Updated JSON-based examples to use `argocd app get -o json` and read `.status.resources[]`.
- The selective sync examples used resource selectors in `GROUP:KIND:NAME` format even when the same resource names existed in multiple namespaces. Argo CD documents `GROUP:KIND:NAMESPACE/NAME` for disambiguating resources with the same name in different namespaces, so the examples now generate namespace-qualified selectors.
- The scripts built sync commands with string concatenation and `eval`. Updated them to use Bash arrays for `--resource` arguments so selectors are passed safely and predictably.
- The staged rollout script waited for the whole application to become healthy after a namespace sync. Updated it to pass the same `--resource` selectors to `argocd app wait`, matching the documented resource filtering support.
- The `xargs` examples could run a full application sync if the filter produced no input. Added `xargs -r` to avoid executing the sync command on empty input.

## Review Notes
The Application and ApplicationSet manifests match the documented Argo CD resource shapes. The ApplicationSet example uses the default fasttemplate-style `{{namespace}}` syntax; current docs increasingly show Go template examples, but the snippet remains technically valid unless a deployment explicitly enables `goTemplate: true`.
