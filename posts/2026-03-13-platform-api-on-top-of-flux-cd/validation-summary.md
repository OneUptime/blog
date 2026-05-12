# Validation Summary: How to Build a Platform API on Top of Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 (Kustomize and Helm controllers)
- Kubernetes (RBAC, ServiceAccount, ClusterRole, Deployment)
- Kubernetes Python client (`kubernetes` package, `CustomObjectsApi`)
- Server-side apply
- Flux Source / Kustomize / Helm toolkit APIs
- REST API design

## Sources Consulted
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source Controller docs: https://fluxcd.io/flux/components/source/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux reconcile annotation reference: https://fluxcd.io/flux/components/kustomize/kustomizations/#triggering-a-reconciliation
- Kubernetes Python client `CustomObjectsApi` reference: https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/CustomObjectsApi.md
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Python `datetime` docs: https://docs.python.org/3/library/datetime.html

## Issues Found
1. **Server-side apply call missing required content type.** The deploy endpoint comment claimed "server-side apply" but the `patch_namespaced_custom_object` call only passed `field_manager`. SSA in the Kubernetes Python client requires `_content_type="application/apply-patch+yaml"`; without it, the call performs a strategic/merge patch instead. Added `_content_type="application/apply-patch+yaml"` to the call so the code matches the stated intent.
2. **Deprecated `datetime.datetime.utcnow()`.** `utcnow()` is deprecated as of Python 3.12 and produces naive datetimes. Replaced with `datetime.datetime.now(datetime.timezone.utc).isoformat()`, which produces a timezone-aware ISO 8601 string with the `+00:00` offset (no need to append `Z` manually).

## Review Notes
- All Flux API groups/versions referenced (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io`, `helm.toolkit.fluxcd.io`) are correct and current GA.
- The `reconcile.fluxcd.io/requestedAt` annotation is the documented mechanism for forcing reconciliation; Flux only re-reconciles when the value changes from the previous one, so always using the current timestamp (as the post does) is the right approach.
- All Kustomization spec fields used (`interval`, `prune`, `sourceRef`, `path`, `targetNamespace`, `postBuild.substitute`) are valid.
- RBAC rules are appropriately scoped; including `patch` on source objects is reasonable if reconciliation triggering is desired for sources too.
- The Python code is explicitly labeled "pseudocode for illustration"; readers building real implementations should add input validation, error handling, and authentication as the Best Practices section already notes.
