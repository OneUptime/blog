# Validation Summary: How to Label and Annotate Clusters in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet cluster generators
- Kubernetes Secrets, labels, annotations, and selectors
- kubectl
- jq

## Sources Consulted
- Argo CD Declarative Setup, cluster Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Template fields and templating caveat: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Kubernetes `kubectl label` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/

## Issues Found
- The introduction implied that labels and annotations both determine which clusters ApplicationSets target. Updated it to state that labels drive cluster targeting, while annotations provide metadata for humans, templates, and automation.
- The sample Argo CD cluster Secret used `{ ... }` as the `config` value, which is not valid JSON. Replaced it with a minimal valid JSON `tlsClientConfig` object.
- The `argocd cluster set` example used a server URL as the positional argument, while the current command reference documents `argocd cluster set NAME [flags]`. Updated the set/get examples to use the cluster name `production-east`.
- A Matrix generator comment said cluster label values were available through the `values` field. Updated the comment to clarify that `values` contains additional generator values; labels are available separately through `metadata.labels.<key>`.
- The annotations section said annotations do not affect ApplicationSet generators. Updated it to clarify that annotations are not used for label selection, but cluster generators expose them as `metadata.annotations.<key>` template parameters.
- The `kubectl get secrets -o custom-columns='CLUSTER:.data.name'` example would print the base64-encoded Secret data value. Replaced it with a JSON and `jq @base64d` example that prints the decoded cluster name.

## Review Notes
The ApplicationSet examples use the default fasttemplate-style substitutions such as `{{name}}`. This is still supported, but the current Argo CD documentation notes that ApplicationSet fasttemplate usage will be deprecated in favor of Go Template. A future update could migrate these examples to `goTemplate: true` and Go template syntax.
