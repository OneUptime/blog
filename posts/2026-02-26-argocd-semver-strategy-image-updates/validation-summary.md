# Validation Summary: How to Use Semver Strategy for Image Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Application annotations
- Kubernetes manifests
- Semantic Versioning
- Docker/OCI image tags
- Kustomize
- Helm
- kubectl logs

## Sources Consulted
- Argo CD Image Updater update strategies documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater annotation-based image configuration documentation: https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/
- Argo CD Image Updater annotation-based write-back documentation: https://argocd-image-updater.readthedocs.io/en/release-0.15/basics/update-methods/
- Masterminds semver constraint documentation: https://github.com/Masterminds/semver#checking-version-constraints
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/
- Docker/distribution reference tag regexp: https://github.com/distribution/reference/blob/main/regexp.go

## Issues Found
- The post used a non-documented `argocd-image-updater.argoproj.io/<alias>.semver-constraint` annotation. Argo CD Image Updater's annotation-based configuration puts the version constraint in the `image-list` image specification, so I moved each semver constraint into the relevant `image-list` value.
- The range examples used comma-separated semver constraints in separate annotations. Because `image-list` itself is comma-separated, I changed the AND ranges to space-separated Masterminds semver syntax while keeping `||` for OR ranges.
- The post said `^0.0.3` matches only `0.0.3`. Masterminds semver treats it as `>=0.0.3 <0.0.4`, so I corrected the explanation.
- The post stated that SemVer build metadata such as `1.2.3+build.456` is supported as an image tag. Standard Docker image tags do not allow `+`, so I clarified that build metadata usually cannot be used directly in container image tags.
- The `ignore-tags` example used `regexp:` syntax. Argo CD Image Updater supports regex for `allow-tags`, but `ignore-tags` uses comma-separated glob-like patterns, so I replaced the example with glob patterns.

## Review Notes
The annotation examples are valid for Argo CD Image Updater's annotation-based configuration documented in release 0.15. The latest documentation also describes an `ImageUpdater` custom resource configuration model, so this post may need a future refresh if the blog wants to target only the newer CRD-style configuration.
