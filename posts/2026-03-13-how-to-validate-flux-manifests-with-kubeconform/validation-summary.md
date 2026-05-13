# Validation Summary: How to Validate Flux Manifests with kubeconform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- kubeconform
- Kubernetes manifests and CRDs
- Flux custom resources
- Kustomize
- jq
- GitHub Actions

## Sources Consulted
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- kubeconform GitHub README and CRD support documentation: https://github.com/yannh/kubeconform
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CRD manifest references: https://github.com/fluxcd/flux2/blob/main/manifests/crds/kustomization.yaml
- CRDs-catalog repository: https://github.com/datreeio/CRDs-catalog
- Kustomize documentation: https://github.com/kubernetes-sigs/kustomize
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The post described the Flux repository path as a direct Flux CRD schema repository. Updated the wording to clarify that Flux publishes CRD manifests with OpenAPI v3 validation schemas, not pre-converted kubeconform JSON schema files at that path.
- The Flux CRD link pointed to a repository directory that currently contains a `kustomization.yaml` referencing controller CRD release assets. Updated the link to the specific `manifests/crds/kustomization.yaml` file.
- The local CRD extraction example wrote files named after CRD object names, such as `gitrepositories.source.toolkit.fluxcd.io.json`, which would not match the kubeconform schema template used elsewhere in the post. Updated the example to emit lowercase `kind_version.json` files, such as `gitrepository_v1.json`, and added the matching local `-schema-location` usage.
- The validation script loop over `overlays/*/` could treat an unmatched glob as a literal path when `overlays/` exists but has no child directories. Updated the loop to skip non-directory matches.
- The post called CRDs-catalog a Flux community schema repository. Reworded this to say CRDs-catalog includes Flux schemas compatible with kubeconform.

## Review Notes
The kubeconform flags, output formats, stdin usage, Kubernetes version flag, default plus additional schema locations, CRDs-catalog template, and GitHub Actions workflow structure were consistent with current documentation. `-ignore-missing-schemas` is useful while adopting validation, but it can hide missing CRD coverage and should be tightened over time as the post already recommends.
