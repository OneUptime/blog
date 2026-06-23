# Validation Summary: How to Implement Authorization Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Istio MeshConfig extension providers
- Envoy external authorization
- Kubernetes
- istioctl
- Go HTTP services
- JWT

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio MeshConfig / extensionProviders reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The basic ALLOW example claimed to allow GET requests from any authenticated source, but it did not match an authenticated identity. Added a `from.source.principals: ["*"]` presence match so the policy requires an mTLS peer identity.
- The prerequisites did not mention that `principals`, `namespaces`, and `serviceAccounts` matching require mTLS-derived peer identity. Added that prerequisite.
- The basic AuthorizationPolicy structure described `istio-system` as inherently mesh-wide. Updated the wording to refer to Istio's root namespace, since the root namespace is configurable.
- The IP range examples described `ipBlocks` as blocking arbitrary external client sources. Updated the wording to distinguish source/connection IP matching from original client IP matching, which should use `remoteIpBlocks` with trusted proxy configuration at ingress.
- The custom HTTP external authorization provider did not set `pathPrefix`, while the sample Go service registered `/check`. Added `pathPrefix: "/check"`.
- The Go external authorization service decoded a JSON request body, but Envoy's HTTP ext_authz provider sends an HTTP check request. Updated the service to read headers, method, and path from the incoming HTTP request.
- The Go example set response headers after `WriteHeader`, which would prevent those headers from being sent. Moved header writes before `WriteHeader`.
- The `istioctl analyze --selector app=your-app` command is not supported by the current `istioctl analyze` command. Replaced it with the documented `istioctl analyze --use-kube=false policy.yaml` manifest-analysis form.

## Review Notes
YAML snippets were parsed successfully. The Go toolchain was not installed in the review environment, so the Go snippet was reviewed statically rather than compiled locally.
