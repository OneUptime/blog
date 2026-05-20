# Validation Summary: How to Use Cluster Generators in ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- ApplicationSet cluster generator
- ApplicationSet matrix generator
- ApplicationSet merge generator
- Kubernetes Secrets
- Kubernetes labels and selectors
- kubectl
- Helm values and parameters

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Merge Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Declarative Setup cluster Secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post described the cluster registry only as cluster Secrets. Argo CD's remote and declaratively configured clusters are stored as Secrets, but the default local cluster is a special case that can be targeted without a Secret. Updated the wording to avoid implying that every targetable cluster must already have a Secret.
- The template variable table omitted `nameNormalized` and `project`, which are documented cluster generator parameters. Added both variables so the list matches current Argo CD documentation.
- The local cluster exclusion explanation said the in-cluster Secret typically lacks custom labels. The default local cluster normally has no cluster Secret at all. Updated the explanation to match Argo CD's documented behavior.
- The command for labeling the in-cluster Secret used a presumed `in-cluster-secret` name and mixed `kubectl label` with a field selector in a way that would not reliably label the intended Secret. Replaced it with the documented approach: create a Secret-backed local cluster registration with `argocd cluster add <context-name> --in-cluster`, find the Secret by its server URL, then label that specific Secret.

## Review Notes
The examples use the default ApplicationSet fasttemplate syntax, which is still supported but documented as planned for deprecation in favor of Go templates. A future update could modernize the examples with `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and dot-prefixed variables.
