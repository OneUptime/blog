# Validation Summary: How to Structure a Monorepo for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- GitOps
- Kubernetes
- Kustomize
- Kubernetes RBAC
- External Secrets Operator
- Sealed Secrets
- SOPS

## Sources Consulted
- Argo CD ApplicationSet Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Matrix Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- RFC 6902 JSON Patch: https://datatracker.ietf.org/doc/html/rfc6902

## Issues Found
- The Kustomize base example used `commonLabels`. Current Kubernetes Kustomize documentation shows the newer `labels` field for adding labels, with `includeSelectors: true` when selector behavior is desired. Changed the snippet to use `labels` with `pairs` and `includeSelectors: true`.
- The production overlay used a JSON Patch `replace` operation for `/spec/replicas`, but the base Deployment did not define `spec.replicas`. RFC 6902 requires the target location of a `replace` operation to already exist. Changed that operation to `add`, which works for adding the missing `replicas` field.

## Review Notes
- The ApplicationSet examples use the default fasttemplate-style variables such as `{{path.basename}}`, which are still documented as the default behavior, although Argo CD recommends Go Template for newer ApplicationSet usage.
- The platform RBAC example is syntactically valid, but real-world Argo CD installations should scope the controller's permissions to the minimum required access for each cluster and project.
