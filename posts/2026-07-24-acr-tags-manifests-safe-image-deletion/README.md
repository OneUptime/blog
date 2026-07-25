# ACR Tags vs. Manifests: How to Delete Images Without Breaking Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure Container Registry, OCI Images, Image Retention, Kubernetes, Azure CLI

Description: Understand ACR tags, digests, manifests, and layers, then remove stale references without stranding production deployments.

---

Deleting `payments:old` from Azure Container Registry (ACR) can mean two very different operations. You can remove only the tag, leaving its manifest available by digest, or delete the manifest that the tag points to. The second operation also removes every other tag attached to that manifest.

That distinction is the foundation of safe registry cleanup.

## Build the correct mental model

An ACR repository contains related OCI artifacts. For a container image:

- A **tag** is a readable, mutable reference such as `v1.8.4` or `prod`.
- A **manifest** describes one image and references its configuration and layers.
- A **digest** is the content-derived identifier of a manifest, such as `sha256:...`.
- A **layer** is a content blob that one or more manifests can share.
- An **image index** or manifest list can point to several platform-specific manifests.

Several tags can point to one digest:

```text
payments:1.8.4 ─┐
payments:stable ─┼─> sha256:abc... ─> config + layers
payments:prod ───┘
```

Moving or removing one tag does not inherently change the digest. Deleting the digest removes the manifest itself, so none of its tags can continue resolving to it.

This also explains why deleted-image storage is not simply the displayed image size. ACR deletes layer data only when no remaining manifest references that layer, and physical cleanup is asynchronous.

## Know the four operations

ACR exposes four materially different cleanup actions:

| Operation | Result |
| --- | --- |
| Untag an image | Removes one tag reference; manifest and layers remain |
| Delete by tag | Deletes the resolved manifest, all tags on it, and unshared layers |
| Delete by digest | Deletes that manifest, all tags on it, and unshared layers |
| Delete repository | Deletes every tag and manifest in the repository |

The command names can be misleading. This command deletes a manifest, not merely the text `old`:

```bash
az acr repository delete \
  --name myregistry \
  --image payments:old
```

Before confirmation, Azure CLI displays the digest and every associated tag that will be removed. Read that list. If `prod` and `old` point to the same manifest, deleting by `old` also removes `prod`.

By contrast, this removes only the selected tag:

```bash
az acr repository untag \
  --name myregistry \
  --image payments:old
```

Untagging frees no manifest or layer storage. It is useful when retiring an alias while preserving digest-addressable content.

## Inspect tags and digests before changing them

Set explicit values:

```bash
ACR_NAME="myregistry"
REPOSITORY="apps/payments"
TAG="old"
```

List repository manifests and their tags:

```bash
az acr manifest list-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY" \
  --orderby time_desc \
  --output table
```

Resolve the tag to a digest:

```bash
DIGEST=$(az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY:$TAG" \
  --query digest \
  --output tsv)

printf '%s\n' "$DIGEST"
```

Query the digest directly to reveal all of its tags and changeable attributes:

```bash
az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY@$DIGEST" \
  --query '{digest:digest,tags:tags,mediaType:mediaType,attributes:changeableAttributes}' \
  --output jsonc
```

The current Azure CLI marks the `az acr manifest` command group as preview. It is convenient for metadata inspection, but scripts should pin and test their Azure CLI version. The documented delete operation remains `az acr repository delete`.

Never select a manifest for deletion from age alone. Capture its digest and complete tag set, then compare those values with deployment references.

## Inventory consumers, not just tags

Search every source of desired state:

- Kubernetes Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs;
- Helm values and rendered releases;
- GitOps repositories;
- Azure Container Apps, App Service, Container Instances, and Batch definitions;
- infrastructure-as-code state and templates;
- rollback records and disaster recovery runbooks;
- image signing, SBOM, promotion, and release metadata.

For common Kubernetes controllers:

```bash
kubectl get deployments,statefulsets,daemonsets,jobs,cronjobs \
  --all-namespaces \
  --output json |
  jq -r '
    .items[] |
    .metadata.namespace as $ns |
    .kind as $kind |
    .metadata.name as $name |
    (
      .spec.template.spec //
      .spec.jobTemplate.spec.template.spec
    ) as $podspec |
    (
      ($podspec.initContainers // []) +
      ($podspec.containers // [])
    )[] |
    [$ns, $kind, $name, .name, .image] | @tsv
  '
```

CronJobs nest the pod template differently, so any inventory script must handle both shapes and be tested against your API objects. Also inspect currently running pods to see resolved image IDs:

```bash
kubectl get pods --all-namespaces --output json |
  jq -r '
    .items[] |
    .metadata.namespace as $ns |
    .metadata.name as $pod |
    (
      (.status.initContainerStatuses // []) +
      (.status.containerStatuses // [])
    )[] |
    [$ns, $pod, .name, .image, .imageID] | @tsv
  '
```

The live-pod list is evidence, not a complete retention inventory. A scaled-to-zero workload, a suspended CronJob, or a disaster recovery manifest might not have a running pod.

## Understand the deployment failure mode

A running container normally does not contact ACR continuously. Deleting its manifest might therefore appear harmless. The risk becomes visible on a cache miss:

- a pod is rescheduled to a new node;
- a cluster scales out;
- a node image is upgraded;
- a region is recovered;
- a deployment rolls back;
- `imagePullPolicy: Always` causes another resolution.

If the desired image uses a digest and that manifest was deleted, the registry cannot serve it. If it uses a tag and the tag was deleted, the tag no longer resolves. Existing node caches are not a reliable recovery plan.

Kubernetes digests are immutable references:

```yaml
containers:
  - name: payments
    image: myregistry.azurecr.io/apps/payments@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Digest pinning protects a deployment from tag movement, but it also makes manifest retention mandatory. Cleanup jobs must preserve every deployed or rollback digest.

## Handle multi-platform images as a graph

A multi-platform tag often points to an OCI image index. The index then references one manifest per platform, such as `linux/amd64` and `linux/arm64`.

Inspect the complete object before deletion:

```bash
az acr login --name "$ACR_NAME"

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv)

docker buildx imagetools inspect \
  "$ACR_LOGIN_SERVER/$REPOSITORY:$TAG"
```

Treat the index digest and its child manifest digests as one release graph during inventory. A deployment can record the index digest while a runtime ultimately pulls a platform-specific child. Deleting any referenced object without understanding that graph can break only one architecture, which makes the incident easy to miss in a single-platform test environment.

Validate a fresh pull for every supported production platform before and after a cleanup-policy change.

## Choose untagging when retiring an alias

If the goal is to remove a misleading or obsolete name while preserving the image, untag:

```bash
az acr repository untag \
  --name "$ACR_NAME" \
  --image "$REPOSITORY:$TAG"
```

Confirm the manifest still exists by digest:

```bash
az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY@$DIGEST" \
  --output jsonc
```

This is a useful first phase for a retention workflow. Leave the untagged manifest in place for the full rollback and cache-miss validation window. Delete it only after confirming that no desired state refers to its digest.

Do not enable an aggressive untagged-manifest purge while using this staged process. A purge or retention policy can erase the safety window immediately or after its configured delay.

## Delete a manifest only after approval

When the digest is confirmed unused, delete by digest so the reviewed object is explicit:

```bash
az acr repository delete \
  --name "$ACR_NAME" \
  --image "$REPOSITORY@$DIGEST"
```

Azure CLI prompts before deletion. In automation, `--yes` skips that protection:

```bash
az acr repository delete \
  --name "$ACR_NAME" \
  --image "$REPOSITORY@$DIGEST" \
  --yes
```

Do not add `--yes` until the script produces a reviewable candidate file, excludes protected digests, and has a separate approval gate. Deletion is unrecoverable unless ACR's opt-in preview soft delete policy was enabled before deletion and the artifact remains within its retention window. Restoring a soft-deleted image index does not recursively restore its child manifests.

Deleting by digest removes all tags associated with the manifest. Shared layers remain while other manifests reference them, so a successful deletion might recover less storage than expected.

## Protect production content from cleanup

ACR image and repository attributes can block updates and deletion. Lock a deployed manifest:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --image "$REPOSITORY@$DIGEST" \
  --write-enabled false
```

This is different from an Azure Resource Manager lock on the registry resource. A resource lock protects management operations on the ACR resource; it does not prevent repository data changes.

Tag and manifest attributes are managed separately. Query both when diagnosing an allowed or blocked deletion. Do not make the cleanup identity powerful enough to unlock production images unless that is an explicit, audited responsibility.

## Use a two-phase cleanup runbook

A robust process separates reference removal from data deletion:

1. Export manifest digest, tags, last update time, and media type.
2. Compare candidates with live, declared, rollback, and disaster recovery references.
3. Exclude locked release digests and multi-platform dependency graphs.
4. Untag approved aliases.
5. Wait through the rollback window.
6. Perform cache-miss pulls for retained releases.
7. Delete only approved untagged digests.
8. Record deleted digests and task logs.
9. Verify deployments can still scale and restart.

For automatic cleanup, start with tag-only `acr purge` dry runs. The `acr purge` command is currently preview, and `--untagged` changes it from reference cleanup into manifest deletion. Microsoft specifically warns against untagged cleanup when systems pull by digest.

The safest question is not "How old is this tag?" It is "Which manifest does this reference select, what else selects that manifest, and could any runtime need to pull it again?" Once those answers are recorded, ACR cleanup becomes a controlled lifecycle operation instead of a storage gamble.

## Official Documentation

- [Delete container images in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-delete)
- [About registries, repositories, images, and artifacts](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-concepts)
- [Azure CLI reference for az acr manifest](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Lock a container image in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Automatically purge images from Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge)
- [Recover deleted artifacts with the soft delete policy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-soft-delete-policy)
- [Kubernetes image names, tags, digests, and pull policies](https://kubernetes.io/docs/concepts/containers/images/)
- [OCI Image Index specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
