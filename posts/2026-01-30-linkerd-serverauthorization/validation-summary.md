# Validation Summary: How to Create Linkerd ServerAuthorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd authorization policy
- Linkerd Server and ServerAuthorization resources
- Kubernetes namespaces, pods, deployments, and ServiceAccounts
- kubectl and Linkerd CLI commands
- mTLS-based service identity

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd Authorization Policy feature guide: https://linkerd.io/2-edge/features/server-policy/
- Linkerd Restricting Access To Services task guide: https://linkerd.io/2-edge/tasks/restricting-access/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction described ServerAuthorization as the core authorization resource and characterized Linkerd authorization as Layer 7. Updated the wording to reflect current Linkerd guidance: ServerAuthorization is an earlier Server-level policy resource, while AuthorizationPolicy is preferred for newer designs and can target routes.
- The "Full Specification" YAML used duplicate `meshTLS` keys under one `client` object. Split the alternatives into separate examples because Linkerd requires `client` to contain exactly one of `meshTLS` or `unauthenticated`, and `meshTLS` to contain exactly one selector type.
- The identity pattern example used `frontend-*`, implying arbitrary glob matching within service account names. Replaced it with namespace-level wildcard prefix examples, which match Linkerd's documented identity wildcard behavior.
- The authorization flow diagram implied that the server proxy calls the policy controller for each request. Updated it to show policy updates being provided to the proxy and request-time evaluation happening in the server proxy.
- The test pod example used the removed/deprecated `kubectl run --serviceaccount` flag. Replaced it with `--overrides` to set `spec.serviceAccountName`.
- Clarified that denied HTTP traffic returns 403, while Linkerd documentation distinguishes HTTP policy denials from TCP-level refusals.
- Clarified that namespace default policy annotations affect newly created pods and existing pods should be restarted after adding the annotation.

## Review Notes
- The post remains focused on ServerAuthorization, but Linkerd documentation now prefers AuthorizationPolicy for new policy designs because it can target Servers, HTTPRoutes, and GRPCRoutes.
- Audit mode is a useful rollout practice, but availability depends on the Linkerd version in use.
