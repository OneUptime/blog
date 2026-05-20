# Validation Summary: How to Implement Self-Service Application Creation in ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications and AppProjects
- Argo CD Applications in any namespace
- Argo CD ApplicationSet Git file generator
- Argo CD RBAC
- Kubernetes custom resources and events
- Kyverno validation policies
- Kustomize image overrides

## Sources Consulted
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Cluster Bootstrapping / App of Apps: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_app_list/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kyverno validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno ValidatingPolicy: https://kyverno.io/docs/policy-types/validating-policy/

## Issues Found
- The Applications-in-any-namespace setup only showed `application.namespaces`. Added the required operational note to restart `argocd-server` and `argocd-application-controller`, and to extend Kubernetes RBAC for the `argocd-server` ServiceAccount when developers manage these Applications through the UI or CLI.
- The ApplicationSet example used legacy fasttemplate-style variables. Updated the example to enable `goTemplate`, add `goTemplateOptions: ["missingkey=error"]`, and use Go template variable syntax such as `{{.app.name}}`.
- The app-of-apps example created child `Application` resources in the `argocd` namespace, which bypasses the source namespace guardrail model for Applications in any namespace. Updated the example so child Applications live in a team namespace and added the required `argoproj.io/Application` whitelist entry for the parent app.
- The child Application example said the parent project's project value enforced the child's project. Removed that inaccurate comment; the child Application's own `.spec.project` is what Argo CD evaluates.
- The RBAC example used `team-alpha/*`, which is too broad when Applications in any namespace are enabled because Argo CD uses `<project>/<namespace>/<application>` for Application RBAC in that mode. Updated the RBAC example to use namespace-aware object patterns for team namespaces and explicit `argocd` namespace rules.
- The Kyverno example used the deprecated `ClusterPolicy` API style in current Kyverno documentation, and its wildcard pattern was not a precise fit for hyphenated team namespaces. Replaced it with a stable `policies.kyverno.io/v1` `ValidatingPolicy` using CEL expressions.

## Review Notes
The Kyverno policy is a minimal illustrative safety net. In a production cluster, consider adding team-to-namespace mapping checks so a team label cannot be paired with another team's namespace.
