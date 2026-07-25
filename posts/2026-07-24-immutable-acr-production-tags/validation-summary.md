# Validation Summary: Preventing Production Image Overwrites with Immutable ACR Tags

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Azure Container Registry
- Azure CLI
- Docker and Docker Buildx
- OCI image manifests and image indexes
- Kubernetes Deployments
- Azure RBAC and ABAC repository permissions
- Docker Content Trust and Notary Project

## Sources Consulted

- [Lock a container image in an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Recommendations for tagging and versioning container images](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-tag-version)
- [Azure CLI reference for `az acr repository`](https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-latest)
- [Azure CLI reference for `az acr manifest`](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Azure Container Registry permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure built-in roles for containers](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Automatically purge images from an Azure container registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge)
- [Transition from Docker Content Trust to Notary Project](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation)
- [Docker `buildx imagetools create` reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/)
- [Docker multi-platform build documentation](https://docs.docker.com/build/building/multi-platform/)
- [Docker image pull reference](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)

## Issues Found

- The manifest-digest check used `test -n "$DIGEST"` without ensuring that a failed test terminated the script. It now prints an error and exits, preventing publication of an empty digest value.
- The Kubernetes example used an abbreviated digest containing an ellipsis, which is not a valid image digest. It now uses a syntactically valid 64-hex-character SHA-256 placeholder.
- The post said that an ACR image lock ensured availability for disaster recovery. An image lock prevents update and deletion of registry data but is not a backup or disaster-recovery mechanism. The claim now limits the protection to retaining the manifest in the available registry for scale-out, rescheduling, and rollback.
- The moving-alias example used `docker pull`, `docker tag`, and `docker push`. Pulling a multi-platform image selects the runner's platform-specific child manifest, so that sequence can make the alias single-platform. It now uses registry-side `docker buildx imagetools create`; `--prefer-index=false` preserves both multi-platform indexes and single-platform manifest media types.
- The permissions discussion implied that a built-in writer role could enforce separation between publication and unlocking. `Container Registry Repository Writer` includes metadata write permission, so it can both apply and remove lock attributes. The post now states this explicitly and describes using a custom publisher role without metadata write permission plus a separate audited identity for lock changes.
- The Docker Content Trust comparison omitted current lifecycle information. The post now notes that DCT cannot be newly enabled and is scheduled for removal on March 31, 2028, with Notary Project as Microsoft's recommended transition.
- The release gate claimed that current registry state could prove a tag had never been published. A deleted tag would defeat that check, so the gate now requires both current absence in ACR and absence from an authoritative release ledger.

## Review Notes

- The `az acr manifest` command group and `acr purge` remain preview features. The post already identifies both preview caveats and recommends pinning and testing the Azure CLI version.
- The pre-push existence check is correctly described as diagnostic rather than atomic; globally unique identifiers, serialized publication, and restricted push permissions remain necessary.
- Azure CLI syntax was checked against the current Microsoft CLI reference and local `--help` output. Registry-side behavior was checked against official ACR documentation; no live production registry operations were performed.
