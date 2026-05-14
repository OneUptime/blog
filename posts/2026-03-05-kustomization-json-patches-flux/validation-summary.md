# Validation Summary: How to Configure Kustomization JSON Patches in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kustomize patches
- Kubernetes manifests
- JSON Patch (RFC 6902)
- JSON Pointer (RFC 6901)
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux build kustomization` command reference: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- RFC 6902, JSON Patch: https://www.rfc-editor.org/rfc/rfc6902.html
- RFC 6901, JSON Pointer: https://www.rfc-editor.org/rfc/rfc6901.html

## Issues Found
- The introduction said strategic merge patches are the default way to modify resources in Flux. Flux `spec.patches` supports either strategic merge patches or JSON6902 patches inline, so this was changed to say strategic merge patches are a common way to modify resources.
- The `add` operation examples did not mention that the parent object or array must already exist. RFC 6902 allows the final target member to be absent for `add`, but the containing object or array must exist. Added a short note after the first `add` example.
- The debugging command `flux build kustomization my-app` was incomplete for previewing local patched output. Flux's command reference shows using `--path` to point at the local manifests, so the command was changed to `flux build kustomization my-app --path ./deploy`.

## Review Notes
The JSON Patch operations, JSON Pointer escaping, Flux `spec.patches` shape, `target` usage, and Kubernetes resource paths are otherwise consistent with the official documentation. Several examples assume the target resources already contain fields such as `metadata.annotations`, `metadata.labels`, or container `env`; this is now called out for `add` operations.
