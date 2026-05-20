# Validation Summary: How to Nest Generators with Matrix Generator in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- Matrix generator
- Cluster generator
- Git directory generator
- List generator
- Go template syntax
- Kubernetes kubectl commands

## Sources Consulted
- Argo CD Matrix Generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Git Generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Git/
- Argo CD Post Selector documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Post-Selector/
- kubectl top command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The tiered Git generator example used `{{.path}}` while `goTemplate: true` was enabled. In Go template mode, Git generator path data is an object, so the full path must be referenced as `{{.path.path}}`. Updated the example accordingly.
- The parameter merging section said the later inner generator takes precedence on duplicate keys. Argo CD's matrix generator precedence follows child generator order, and duplicate generated keys can also cause failures in cases such as two Git generators emitting the same path parameters. Reworded the explanation to avoid the incorrect "inner wins" rule.
- The three-level example described "three fully nested levels," which was misleading because Argo CD supports only one nested combination generator, such as a matrix inside a matrix. Reworded it as three dimensions using one nested matrix.
- The command for counting applications used a non-guaranteed `app.kubernetes.io/managed-by=applicationset-controller` label. Replaced it with a generic `kubectl get applications.argoproj.io -n argocd --no-headers | wc -l` command.
- The post selector example placed `selector` under the matrix generator body and used a dynamic `{{env}}` label-selector value. Argo CD post selectors are generator-level Kubernetes label selectors over generated values, so the example was changed to a correctly indented static selector.

## Review Notes
The article's main claim is valid: Argo CD matrix generators combine two child generators, and one nested matrix can be used to model three dimensions. Further nesting beyond a matrix inside a matrix is not supported.
