# Validation Summary: How to Manage Portainer with Crossplane

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Crossplane
- Kubernetes
- Helm
- GitOps
- FluxCD

## Sources Consulted
- Crossplane install docs: https://docs.crossplane.io/latest/get-started/install/
- Crossplane XRD docs: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Crossplane composition docs: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform docs: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane v2 changes: https://docs.crossplane.io/latest/whats-new/
- `provider-http` README: https://github.com/crossplane-contrib/provider-http
- `provider-http` CRD docs and examples: https://github.com/crossplane-contrib/provider-http/tree/v1.0.13
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer environment API example: https://docs.portainer.io/admin/environments/add/api
- Portainer API documentation hub: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- The post used an outdated and incorrect `provider-http` package reference (`xpkg.upbound.io/upbound/provider-http:v0.3.0`). I updated it to the current `crossplane-contrib/provider-http` package and added installation of `function-patch-and-transform`, which is required for current Crossplane pipeline compositions.
- The original `ProviderConfig` example used the wrong API group (`http.upbound.io`) and fields (`headers`) that are not part of the provider's `ProviderConfig` schema. I corrected the API group to `http.crossplane.io/v1alpha1` and changed the config to the supported `credentials.source: None` form.
- The post mixed Portainer access token guidance with an invalid provider-level header template. I corrected the token creation path to `My account > Access tokens` and moved authentication to request headers using Portainer's documented `X-API-Key` header.
- The environment XRD used an incorrect `environmentType` description (`1=Docker, 2=Swarm, 6=Kubernetes`) and exposed unsupported tag fields. I renamed the field to `endpointCreationType`, narrowed the wording to what the example actually supports, and removed unsupported tag handling from the minimal example.
- The environment composition used deprecated Crossplane `resources` composition syntax and an invalid `Request` shape (`url`, `method`, `body` directly under `forProvider`). I rewrote it as a current `mode: Pipeline` composition using `function-patch-and-transform` and the provider's supported `payload` and `mappings` fields.
- The environment composition also posted JSON to `/api/endpoints`, but Portainer documents that endpoint as form-based. I changed the create mapping to send a multipart form body matching Portainer's environment creation API.
- The original post defined a `PortainerStack` claim shape but never created a matching Composition, so the claim would not reconcile. I added the missing stack composition.
- The stack section used user-facing field names that did not match Portainer's repository deployment API. I kept the claim shape readable, but mapped it to Portainer's actual request fields such as `RepositoryURL`, `RepositoryReferenceName`, and `ComposeFile`.
- The tutorial jumped straight to creating claims without first applying the XRDs and Compositions. I added the required `kubectl apply` commands before the claim examples.
- I tightened wording so the stack example accurately states it targets Portainer's standalone Docker stack API, since Swarm and Kubernetes stacks use different endpoints.

## Review Notes
- The environment composition is intentionally minimal and currently models create, observe, and delete flows. Portainer supports richer environment options such as TLS files, agent onboarding, and tag/group assignments, but those require additional request fields and were not implemented in this example.
- The stack composition is also intentionally scoped to standalone Docker stacks created from a Git repository. Supporting Swarm or Kubernetes stacks would require different Portainer API endpoints and payloads.
