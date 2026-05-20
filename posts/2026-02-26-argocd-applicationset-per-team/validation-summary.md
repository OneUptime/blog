# Validation Summary: How to Create Per-Team Applications with ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Argo CD Applications and AppProjects
- Argo CD RBAC
- Argo CD CLI
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes NetworkPolicy
- Helm values and parameters
- GitOps repository layouts

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The namespace setup section was labeled as an App-of-Apps pattern and said to use a matrix generator, but the provided ApplicationSet used a single Git generator to create namespace setup applications. Renamed the heading and changed the text to say "Use an ApplicationSet" so the explanation matches the snippet.
- The NetworkPolicy comment said "allow same namespace traffic only", but the original policy allowed ingress from namespaces labeled with the team and allowed broad egress to all namespaces and all IPv4 addresses. Updated the ingress and egress rules to use `podSelector: {}`, which selects pods in the same namespace as the policy.
- The multiple-services matrix example used two Git generators. Argo CD documents that two Git generators in a matrix need `pathParamPrefix` on one or both generators to avoid conflicting generated `path` parameters. Added `pathParamPrefix: teamConfig` to the team configuration Git generator.

## Review Notes
- The ApplicationSet APIs and examples use current `argoproj.io/v1alpha1` fields documented by Argo CD.
- The Argo CD RBAC policy object format, SCM provider parameters, Git file generator parameter flattening, and `argocd app list` flags were verified against official Argo CD documentation.
- The internal OneUptime link points to an existing sibling post directory in the repository.
