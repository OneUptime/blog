# Validation Summary: How to Use Kustomize for Dapr Application Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kustomize (built into kubectl)
- Dapr (Distributed Application Runtime)
- Kubernetes Deployments
- Dapr Component CRDs (pubsub.redis)
- JSON 6902 patches (RFC 6901 JSON Pointer)
- Strategic merge patches
- kubectl CLI

## Sources Consulted
- Kustomize official documentation — `patches` field syntax with `path` and `target` selectors
- RFC 6901 (JSON Pointer) — `~1` escape sequence for `/` in pointer paths
- Dapr official documentation — sidecar annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-limit`), Component CRD (`apiVersion: dapr.io/v1alpha1`), and pod annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/config`, `dapr.io/log-level`)
- Kustomize documentation — `images` transformer (`name`, `newName`, `newTag`), `kustomize edit set image` CLI syntax
- Kubernetes documentation — Deployment spec (`apps/v1`), `kubectl apply -k`, `kubectl diff -k`, `kubectl kustomize`

## Issues Found
No technical issues found.

## Review Notes
- The JSON 6902 patch at `/spec/metadata/0/value` for the Dapr Component's redis host relies on array index position. If the order of metadata items in the Component spec changes, the patch would target the wrong field. This is an inherent limitation of JSON 6902 patching on arrays, not an error in the post, but worth noting as an operational consideration.
- The strategic merge patch (`resource-patch.yaml`) is shown as a standalone example but is not included in the production overlay's `kustomization.yaml` patches list. This is a presentation choice — the patch YAML itself is syntactically correct — but readers would need to add it to their kustomization.yaml to actually use it.
- All Dapr annotations, API versions, and component types used in the post are current and correct.
