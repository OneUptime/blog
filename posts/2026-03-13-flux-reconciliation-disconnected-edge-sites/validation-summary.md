# Validation Summary: How to Configure Flux Reconciliation for Disconnected Edge Sites

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Gitea
- Docker image transfer
- Git bundles
- Prometheus Operator / PrometheusRule
- kube-state-metrics

## Sources Consulted
- Flux `flux install` CLI documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux air-gapped installation documentation: https://v2-0.docs.fluxcd.io/flux/installation/#air-gapped-environments
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Gitea Docker installation documentation: https://docs.gitea.com/1.24/installation/install-with-docker
- Git bundle documentation: https://git-scm.com/docs/git-bundle

## Issues Found
- The Flux install example hardcoded old controller image versions and mixed controller version schemes. I changed it to derive the controller image list from `flux install --export`, which matches the Flux CLI output for the installed CLI version.
- The Docker image bundling examples appended multiple `docker save` archives with shell redirection. I changed them to pull each image and write a single archive with `docker save -o ... "${images[@]}"`.
- The air-gapped install text said `docker load` loads images into the local registry. I corrected this to say it loads images into the local Docker daemon before tagging and pushing to the registry.
- The Gitea Kubernetes snippet referenced a namespace and PVC that were not defined. I added minimal `Namespace` and `PersistentVolumeClaim` resources so the example can be applied as shown.
- The Gitea image tag was outdated. I updated the example from `gitea/gitea:1.21` to `gitea/gitea:1.24` and aligned `ROOT_URL` with the in-cluster service URL used by Flux.
- The transfer workflow used array command substitution and `xargs` in ways that could break on empty input. I changed it to `mapfile` with `xargs -r` and made the apply script tolerate bundles with no new image archive.
- The bundle apply example fetched from the bundle but then pushed the local `main` branch, which may not be the fetched bundle ref. I changed it to push `FETCH_HEAD:main`.
- The monitoring alert used `gotk_reconcile_duration_seconds_sum` with nonexistent `type` and `status` labels and treated a cumulative duration metric as a last-success timestamp. I replaced it with the documented `gotk_resource_info` readiness metric collected via kube-state-metrics.
- The introduction described Flux disconnected operation as "OCI artifact caching." I changed this to the more accurate `GitRepository` and `OCIRepository` source model.

## Review Notes
- The examples assume Bash because they use arrays and `mapfile`.
- The `gotk_resource_info` alert requires kube-state-metrics to be configured for Flux custom resources, as described in the Flux monitoring documentation.
- The content transfer image discovery command is still intentionally simple and may need hardening for Helm values, Kustomize image transformers, digest-pinned images, or multi-document manifests in a production workflow.
