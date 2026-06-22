# Validation Summary: How to Mirror Container Images for Offline Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd
- Harbor
- CNCF Distribution Registry
- Skopeo
- Helm
- image-syncer
- Docker-compatible container registries

## Sources Consulted
- Kubernetes documentation: Pull an Image from a Private Registry - https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes documentation: Images and imagePullSecrets - https://kubernetes.io/docs/concepts/containers/images/
- containerd documentation: Registry configuration - https://containerd.io/docs/2.3/cri/registry/
- containerd documentation: hosts.toml and CRI config_path - https://github.com/containerd/containerd/blob/main/docs/hosts.md
- Skopeo documentation: skopeo copy - https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- Harbor Helm chart values - https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- CNCF Distribution documentation: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- image-syncer documentation - https://github.com/AliyunContainerService/image-syncer

## Issues Found
- The Harbor values included old `chartmuseum` and `notary` configuration keys that are not present in the current Harbor Helm chart values. Removed those keys and kept the valid persistence, exposure, database, Redis, and Trivy settings.
- The simple Docker Registry Kubernetes manifest referenced a namespace and PVC that were not defined and mounted an htpasswd secret without enabling registry authentication. Added the `Namespace` and `PersistentVolumeClaim`, and removed the unused auth mount so the manifest is internally consistent.
- Docker Hub official images were mirrored as `docker.io/nginx`, `docker.io/redis`, and similar paths. Updated these to `docker.io/library/...` or `library/...` so they match normalized Docker Hub repository paths and containerd mirror lookups.
- The archive save/load scripts inferred image references from tar filenames, which did not reliably preserve the source registry path and could reload images under incorrect target repository paths. Updated the save script to include the original image reference in the `docker-archive` destination and updated the load script to read the generated manifest.
- The archive examples used `gcr.io/google-containers/pause:3.9`. Updated this to the current Kubernetes image registry path, `registry.k8s.io/pause:3.9`.
- The image-syncer example omitted tags, which image-syncer treats as a request to sync all tags for a repository. Added concrete tags matching the later image catalog examples.
- The image-syncer example used `grafana/grafana` without an explicit registry host. Updated it to `docker.io/grafana/grafana`.
- The containerd mirror example used deprecated `registry.mirrors` / `registry.configs` configuration. Replaced it with the current `config_path` pattern and `hosts.toml` examples for `docker.io`, `registry.k8s.io`, and `quay.io`.

## Review Notes
The post is technically relevant and code-heavy. The Helm image extraction examples are reasonable for rendered Kubernetes manifests, but complex charts can still hide images in hooks, CRDs, or values-driven templates that require chart-specific values to render completely.
