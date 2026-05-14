# Validation Summary: How to Understand Flux CD Sources and Artifacts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux source-controller
- GitRepository, OCIRepository, HelmRepository, HelmChart, and Bucket custom resources
- Kubernetes custom resources and Secrets
- Helm repositories and OCI registries
- Object storage buckets
- kubectl and jq

## Sources Consulted
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux core concepts: https://fluxcd.io/flux/concepts/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described all source artifacts as tarballs. Flux uses gzip-compressed tar archives for GitRepository, OCIRepository, Bucket, and HelmChart artifacts, but HTTP/S HelmRepository artifacts are fetched `index.yaml` files, and OCI HelmRepository resources do not produce artifacts. Updated the artifact explanation and summary to avoid overgeneralizing.
- The HelmChart diagram implied a direct OCI source reference. Flux HelmChart supports HelmRepository, GitRepository, and Bucket source references; OCI charts are accessed through an OCI HelmRepository. Updated the diagram label.
- The `kubectl` command piped JSONPath output into `jq`, which is unreliable for object output because kubectl JSONPath renders results using string formatting. Changed it to `kubectl get ... -o json | jq '.status.artifact'`.
- The sample GitRepository artifact URL used `latest.tar.gz`, but GitRepository artifact URLs are commit-addressed tarballs in Flux status examples. Updated the sample URL to use the example commit hash.
- The Git commit verification example used a `provider: cosign` field under `GitRepository.spec.verify`. Flux GitRepository verification supports `mode` and `secretRef` for trusted Git author PGP keys; Cosign and Notation verification are for OCIRepository artifacts. Removed the invalid provider field and changed the secret name and surrounding explanation.

## Review Notes
The remaining examples use current `source.toolkit.fluxcd.io/v1` APIs and field names. The Bucket example is valid for AWS static credentials, assuming the referenced Secret contains the required `accesskey` and `secretkey` data keys.
