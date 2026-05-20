# Validation Summary: How to Use Digest Strategy for Image Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes container images and image pull behavior
- Kustomize image overrides
- Helm values write-back
- Docker image digests
- crane CLI

## Sources Consulted
- Argo CD Image Updater update strategies documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/latest/configuration/images/
- Argo CD Image Updater application configuration and legacy annotations documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater update methods and Git write-back target documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater annotation-based image configuration documentation: https://argocd-image-updater.readthedocs.io/en/registry-scanner-release-0.2/configuration/images/
- Kubernetes image names, digests, and imagePullPolicy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Docker CLI `docker image pull` documentation: https://docs.docker.com/reference/cli/docker/image/pull/
- Google go-containerregistry `crane` command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md

## Issues Found
- The post presented legacy Argo CD Application annotations without noting that current Argo CD Image Updater versions use `ImageUpdater` custom resources by default. Added a note that annotation examples require an `ImageUpdater` CR with `useAnnotations: true`, or equivalent CR-based configuration.
- The text said the digest tag is "not a constraint." Current Image Updater documentation describes the tag in the image list as the version constraint watched by the digest strategy, so the wording now clarifies that it is not an `allow-tags` filter.
- The Git write-back section implied Image Updater always writes digest references directly to manifests. Current documentation says the default Git write-back target writes `.argocd-source-<appName>.yaml`, while `kustomization` and `helmvalues:<file>` targets update those files. The section now distinguishes those cases.
- The Helm example did not state that the chart must render the digest value as an `image@sha256:...` reference. Added that caveat before the `image.digest` values example.
- The strategy comparison table used the old `latest` strategy name and said it used generic timestamps. Current docs call the strategy `newest-build`, with `latest` retained for backward compatibility, and define it by image creation date. Updated the table and added the rename note.
- The table said semver supports multi-arch handling in the same way as digest/latest. Current Image Updater docs state `platforms` only affects metadata-fetching strategies, currently `latest/newest-build` and `digest`; the table now says multi-arch filtering is not applicable to semver.

## Review Notes
The remaining examples use legacy annotations consistently. They are technically valid only when the Image Updater installation is configured to read legacy Application annotations, as noted in the post.
