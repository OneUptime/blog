# Validation Summary: How to Configure HelmRelease Post-Renderers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease custom resources
- Helm post-renderers
- Kustomize patches and image transformations
- Kubernetes Deployments
- kubectl

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm Controller documentation: https://fluxcd.io/flux/components/helm/
- Flux Kustomization patches and images documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The basic post-renderer example claimed to add labels but used `patches: []`, which is a no-op. I changed it to an actual Kustomize patch targeting Deployments.
- The post described labels and annotations as being applied to all resources. Flux Helm post-renderers support Kustomize `patches` and `images`, not a blanket common metadata field in `spec.postRenderers[].kustomize`, so I narrowed the wording and examples to targeted Deployment patches.
- The strategic merge examples used `metadata.name: all`, which could imply a real Deployment named `all`. I changed this to `not-used`, matching Flux documentation patterns when a `target` selector identifies the resources.
- The JSON patch used `replace` operations for nested resource limit fields, which would fail if those fields did not already exist. I changed the example to add or replace the `limits` object and clarified that the parent `resources` field must already exist.

## Review Notes
The HelmRelease `apiVersion`, `spec.postRenderers` structure, ordered post-renderer behavior, Kustomize `patches` and `images` fields, and kubectl verification commands are consistent with current official documentation.
