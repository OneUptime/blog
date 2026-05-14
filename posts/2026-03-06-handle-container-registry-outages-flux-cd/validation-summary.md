# Validation Summary: How to Handle Container Registry Outages with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD notification, source, image reflector, and image automation APIs
- Kubernetes Deployments, DaemonSets, Pods, PVCs, and image pull policies
- Prometheus Operator PrometheusRule resources and Flux metrics
- containerd registry host configuration
- CNCF Distribution / Docker Registry pull-through cache
- Helm OCI chart pull and push workflows
- GitHub Actions image replication
- go-containerregistry crane CLI

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux CLI reference for reconcile/get/suspend/resume commands: https://fluxcd.io/flux/cmd/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes init container documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- containerd registry and hosts configuration documentation: https://containerd.org/docs/1.7/cri/registry/ and https://github.com/containerd/containerd/blob/main/docs/hosts.md
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- Docker registry mirror documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- akhilerm/tag-push-action v2.2.0 action metadata: https://raw.githubusercontent.com/akhilerm/tag-push-action/v2.2.0/action.yml
- go-containerregistry crane package documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane

## Issues Found
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, but the current documented Provider and Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated both manifests.
- The notification Alert watched `HelmRepository` for chart pull failures. Flux chart pull failures are represented by `HelmChart` readiness, so the event source and best-practice text now refer to `HelmChart`.
- The Prometheus examples filtered `gotk_resource_info` with a `kind` label. Flux's documented kube-state-metrics example uses `customresource_kind`, so both alert expressions were updated.
- The pull-through cache Deployment used two replicas with a single `ReadWriteOnce` PVC. Changed it to one replica so the manifest is schedulable with that volume mode.
- The containerd mirror example used deprecated `registry.mirrors` config and pointed both Docker Hub and GHCR at a single Docker Hub pull-through cache. Replaced it with `config_path` and `hosts.toml`, and clarified that each upstream registry needs its own cache.
- The containerd example used an in-cluster service DNS name from node-level runtime configuration. Replaced it with a node-resolvable placeholder and added a note to expose the cache through an address reachable by every node.
- The OCI HelmRepository backup example set `spec.suspend`, but Flux documents that `suspend` is not applicable to OCI Helm repositories. Removed the field and replaced the failover runbook's HelmRepository suspend patches with HelmRelease sourceRef patches.
- The active-outage runbook said the sample commands scaled deployments down and up, but the commands only listed affected pods. Updated the comment to describe the command accurately.
- The verification command used `flux get image all`, but the documented command is `flux get images all`. Updated the command.

## Review Notes
The YAML snippets were parsed locally with PyYAML after the edits. The examples remain illustrative and still require environment-specific registry exposure, credentials, and GitOps reconciliation practices before production use.
