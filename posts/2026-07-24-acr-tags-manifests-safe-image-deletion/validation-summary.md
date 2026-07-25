# Validation Summary: ACR Tags vs. Manifests: How to Delete Images Without Breaking Deployments

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure Container Registry
- Azure CLI
- OCI image manifests, image indexes, digests, tags, and layers
- Kubernetes workloads, image references, and pull policies
- `kubectl` and `jq`
- Docker Buildx
- ACR purge, retention, locking, and soft delete policies
- Azure Resource Manager locks

## Sources Consulted

- [Delete container images in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-delete)
- [About registries, repositories, and artifacts](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-concepts)
- [Azure CLI reference for `az acr manifest`](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Azure CLI reference for `az acr repository`](https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-latest)
- [Lock a container image in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Automatically purge images from Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge)
- [Set a retention policy for untagged manifests](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy)
- [Recover deleted artifacts with the soft delete policy](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-soft-delete-policy)
- [Multi-architecture images in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/push-multi-architecture-images)
- [Lock Azure resources to protect infrastructure](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Kubernetes images, digests, and pull policies](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Kubernetes CronJob API reference](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Docker `buildx imagetools inspect` reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [jq 1.6 manual](https://jqlang.org/manual/v1.6/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)

## Issues Found

- The Kubernetes deployment example abbreviated its SHA-256 digest with an ellipsis, so the value was not a syntactically valid image reference. It now uses a complete 64-hex-character digest placeholder that Kubernetes can parse.
- The post described deletion as categorically unrecoverable. ACR now offers an opt-in preview soft delete policy that can restore artifacts deleted while the policy was enabled and still inside its retention window. The text now states this exception and notes that restoring an image index does not recursively restore deleted child manifests.

## Review Notes

- The `az acr manifest` command group and `acr purge` remain preview features, as the post states. ACR's untagged-manifest retention policy and soft delete policy are also currently preview features.
- The ACR retention policy applies only to supported Docker manifest media types, not OCI manifest or index media types; `acr purge` is the documented cleanup path for untagged OCI manifests.
- Azure CLI syntax was checked against the current Microsoft command references and local Azure CLI `--help` output. The two `jq` filters were executed against representative Deployment, Job, CronJob, and Pod JSON and produced the expected tab-separated inventory.
- No live ACR deletion, live registry mutation, or production Kubernetes operation was performed.
