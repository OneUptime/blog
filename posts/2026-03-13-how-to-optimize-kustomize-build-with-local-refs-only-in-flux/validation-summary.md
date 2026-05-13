# Validation Summary: How to Optimize Kustomize Build with Local Refs Only in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux source-controller
- Flux kustomize-controller
- Kubernetes
- Kustomize
- GitOps

## Sources Consulted
- Flux Kustomize Controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux FAQ on Kustomize remote bases: https://fluxcd.io/flux/faq/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The Flux alternative example incorrectly used `dependsOn` to point at a `GitRepository`. Flux documents `spec.dependsOn` as a dependency between Flux `Kustomization` objects, not source objects. I changed the section to use `GitRepository.spec.include`, which is the documented way to map the contents of one GitRepository artifact into another artifact so Kustomize can use a local path.
- The security benefits stated that all content is verified by the source-controller. Flux Git source signature verification is optional through `spec.verify`, so I changed this to say content is fetched and packaged by the source-controller and can use commit or tag signature verification.

## Review Notes
The remaining Kustomize remote base examples, `--no-remote-bases=true` flag, Kubernetes `kubectl wait` usage, and Kustomize local path patterns are consistent with the official documentation reviewed.
