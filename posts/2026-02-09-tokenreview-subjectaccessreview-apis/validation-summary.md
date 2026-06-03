# Validation Summary: How to Use Kubernetes TokenReview and SubjectAccessReview APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes authentication.k8s.io/v1 TokenReview API
- Kubernetes authorization.k8s.io/v1 SubjectAccessReview API
- Kubernetes SelfSubjectAccessReview and LocalSubjectAccessReview APIs
- Kubernetes RBAC authorization concepts
- Go client-go Kubernetes client

## Sources Consulted
- Kubernetes API reference: TokenReview, https://kubernetes.io/docs/reference/kubernetes-api/definitions/token-review-v1-authentication/
- Kubernetes API reference: SubjectAccessReview, https://kubernetes.io/docs/reference/kubernetes-api/definitions/subject-access-review-v1-authorization/
- Kubernetes API reference: SelfSubjectAccessReview, https://kubernetes.io/docs/reference/kubernetes-api/definitions/self-subject-access-review-v1-authorization/
- Kubernetes API reference: LocalSubjectAccessReview, https://kubernetes.io/docs/reference/kubernetes-api/definitions/local-subject-access-review-v1-authorization/
- Kubernetes authorization reference, https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes kubectl auth can-i reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- SubjectAccessReview examples omitted the `ResourceAttributes.Group` field. Kubernetes authorization includes the API group as a request attribute, and an empty group only represents the core API group. This made examples for `deployments` and custom resources inaccurate. Updated the reusable permission-checking helpers, call sites, multi-permission checks, cache keys, and LocalSubjectAccessReview example to pass and set `apiGroup`.
- The multi-permission example checked `deployments` without the `apps` API group. Updated that example to use `APIGroup: "apps"` for deployments and `APIGroup: ""` for core resources such as pods and services.
- The custom resource example checked `databases` without an API group. Updated it to pass an example custom API group, `stable.example.com`.

## Review Notes
The post uses current stable v1 Kubernetes authentication and authorization APIs. The Go snippets are presented as tutorial fragments; some later snippets rely on imports and helper functions introduced earlier in the post.
