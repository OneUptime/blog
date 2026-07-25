# Preventing Production Image Overwrites with Immutable ACR Tags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure Container Registry, Image Immutability, Release Engineering, Azure CLI, Container Security

Description: Lock deployed ACR tags and manifests, use unique release identifiers, and design a pipeline that prevents accidental production overwrites.

---

Azure Container Registry (ACR) tags are mutable by default. If a pipeline pushes a new manifest as `payments:prod`, the tag moves to the new manifest. Different nodes can then run different content under the same image name, and the previous manifest can become untagged.

ACR lets you change repository, tag, and manifest attributes. Setting `write-enabled` to `false` locks an image reference against updates and deletion. Microsoft recommends locking deployed image tags in the release pipeline.

The strongest production pattern combines three controls:

1. Every release receives a unique tag.
2. The deployed tag and manifest digest are locked.
3. Deployments reference the manifest digest.

Locking alone does not replace a sound tagging strategy, and digest pinning alone does not prevent someone from deleting the manifest.

## Separate stable and unique tags

Microsoft distinguishes two useful tag types:

- **Stable tags** are intentionally reused, such as `3.2`, `lts`, or `base-alpine`. Their content can change while their purpose remains stable.
- **Unique tags** identify one build, such as `build-18472` or `20260724.3`. They should never be reused.

Use stable tags for consumers that intentionally track updates, especially base-image build inputs. Use unique tags for deployments.

Do not assume `prod` means immutable. A tag cannot be both a moving environment alias and a permanently locked release identifier. A practical repository might contain:

```text
apps/payments:build-18472
apps/payments:release-20260724.3
apps/payments:prod
```

`release-20260724.3` identifies immutable content. `prod` is an optional controlled alias that points to the current production manifest. If your deployment uses the release digest, changing `prod` does not change running or future replicas of that deployment.

## Build and push a unique release

Set values from trusted pipeline variables:

```bash
ACR_NAME="contosoprod"
REPOSITORY="apps/payments"
RELEASE_TAG="release-20260724.3"

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv)

IMAGE="$ACR_LOGIN_SERVER/$REPOSITORY:$RELEASE_TAG"
```

Fail early if the tag already exists:

```bash
if az acr repository show \
  --name "$ACR_NAME" \
  --image "$REPOSITORY:$RELEASE_TAG" \
  >/dev/null 2>&1; then
  printf 'Refusing to reuse existing release tag: %s\n' "$RELEASE_TAG" >&2
  exit 1
fi
```

Then authenticate, build, test, and push:

```bash
az acr login --name "$ACR_NAME"

docker build --pull --tag "$IMAGE" .
docker push "$IMAGE"
```

The existence check improves diagnostics but is not an atomic create-only push. Two jobs can still race between the check and push. Generate globally unique release tags, serialize production publication, and ensure only the release pipeline can push into the production repository.

Do not grant developer workstations or pull-only workloads push permission to production repositories.

## Resolve and record the manifest digest

After the push succeeds, resolve the tag:

```bash
DIGEST=$(az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY:$RELEASE_TAG" \
  --query digest \
  --output tsv)

test -n "$DIGEST" || {
  printf 'Failed to resolve the manifest digest\n' >&2
  exit 1
}
printf 'Published %s@%s\n' "$REPOSITORY" "$DIGEST"
```

Store this digest in the release record, provenance metadata, deployment manifest, and rollback inventory. Do not recalculate it from a local image ID. The manifest digest is the registry content identifier that clients pull.

The current Azure CLI marks the `az acr manifest` command group as preview. Pin and test the CLI version used by the pipeline. You can also capture the registry-reported digest from a trusted push or build result, but the deployed value must be the ACR manifest digest.

For a multi-platform release, the tag usually points to an image-index digest. Record and deploy that index digest so runtimes can select their platform-specific child manifests.

## Lock the deployed tag

Lock the tag immediately after publication and validation:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --image "$REPOSITORY:$RELEASE_TAG" \
  --write-enabled false \
  --delete-enabled false
```

`write-enabled false` prevents updates and deletion through that image reference. Setting `delete-enabled false` as well makes the intent explicit.

ACR manages tag and manifest changeable attributes separately. Protect the digest too:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --image "$REPOSITORY@$DIGEST" \
  --write-enabled false \
  --delete-enabled false
```

Locking both closes two different paths:

- the release tag cannot be moved or removed;
- the referenced manifest cannot be deleted directly by digest.

If several tags point to one manifest, decide which aliases need their own tag lock. A locked manifest does not make every tag in the repository an immutable name.

## Verify tag and manifest attributes

Inspect the tag:

```bash
az acr repository show \
  --name "$ACR_NAME" \
  --image "$REPOSITORY:$RELEASE_TAG" \
  --query changeableAttributes \
  --output jsonc
```

Inspect the manifest separately:

```bash
az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "$REPOSITORY@$DIGEST" \
  --query changeableAttributes \
  --output jsonc
```

Both should report `writeEnabled: false` and `deleteEnabled: false`. Keep this verification in the pipeline and fail the release if either lock is missing.

In a non-production registry, test the guard with a disposable image:

```bash
docker push "$IMAGE"
```

The push should fail once the tag is locked. Also test that an approved, unlocked development tag can still be pushed. Never test overwrite behavior against the only copy of a production release.

## Deploy by digest

Use the recorded digest in Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: contosoprod.azurecr.io/apps/payments@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
          imagePullPolicy: IfNotPresent
```

A digest is immutable by definition, so all replicas select the same manifest. The ACR lock protects the selected manifest from update or deletion so it remains available from that registry for scale-out, rescheduling, and rollback.

If operators prefer a human-readable tag in Git, record both the release tag and digest in release metadata, but make the applied workload use the digest. Kubernetes also accepts `name:tag@sha256:...`; when both are present, the digest controls what is pulled.

## Treat moving aliases as separate metadata

Some teams need `prod` for discovery or external tooling. Update it only after the immutable release is published and locked:

```bash
PROD_ALIAS="$ACR_LOGIN_SERVER/$REPOSITORY:prod"

docker buildx imagetools create \
  --prefer-index=false \
  --tag "$PROD_ALIAS" \
  "$ACR_LOGIN_SERVER/$REPOSITORY@$DIGEST"
```

This registry-side operation preserves a multi-platform image index. A pull, tag, and push sequence can instead promote only the child manifest selected for the pipeline runner's platform. `--prefer-index=false` also preserves a single-platform source manifest instead of wrapping it in a new image index.

This `prod` tag is intentionally mutable. Do not claim the repository has fully immutable tags if the process routinely unlocks and moves it. Restrict alias updates to a promotion identity and audit them.

An alternative is to omit environment aliases entirely. A deployment record that maps environment to digest is clearer and avoids presenting a mutable pointer as a release artifact.

## Avoid locking an entire active repository

This command locks every image in a repository:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --repository "$REPOSITORY" \
  --write-enabled false
```

Repository-wide locking is appropriate for an archived repository, but it also blocks the next release push. For an active application repository, lock each deployed tag and manifest instead.

Repository, tag, and manifest attributes can all affect a failed push or delete. When troubleshooting an "operation disallowed" response, inspect all three levels before changing anything.

## Separate publication from unlocking

The identity that builds and pushes does not need broad registry administration. Under the ABAC repository-permissions mode:

- `Container Registry Repository Writer` is the normal data-plane role for identities that push and manage image tags and metadata, including lock attributes;
- `Container Registry Repository Contributor` includes delete capability and should be more restricted;
- pull-only runtimes should use `Container Registry Repository Reader`.

Under registry-wide RBAC, use `AcrPush`, `AcrDelete`, and `AcrPull` as appropriate. The built-in writer roles include metadata management, so an identity that can apply a lock can also remove it. If publication and unlocking must be separate security boundaries, give the publisher a custom data-plane role without metadata write permission and route lock changes through a separate, audited release-management identity. Keep delete access and emergency unlocks behind that workflow.

An emergency unlock is explicit:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --image "$REPOSITORY:$RELEASE_TAG" \
  --write-enabled true \
  --delete-enabled true

az acr repository update \
  --name "$ACR_NAME" \
  --image "$REPOSITORY@$DIGEST" \
  --write-enabled true \
  --delete-enabled true
```

Require a ticket, approval, reason, and time-bounded privileged role before running it. Relock content after the approved operation and verify the attributes again.

## Understand what the lock does not do

An ACR image lock is not:

- an Azure Resource Manager lock on the registry resource;
- an image signature;
- a guarantee that the original build was trustworthy;
- a backup;
- an atomic "create tag only if absent" option for the first push;
- a replacement for repository-scoped permissions.

An Azure resource lock can protect the ACR resource from management deletion, but it does not prevent repository pushes, tag moves, or manifest deletion. Image attributes protect registry data.

Tag locking is also separate from the Premium-only Docker Content Trust (DCT) feature listed in the ACR SKU table. DCT can no longer be enabled on new registries or registries that had not enabled it previously, and it is scheduled for removal on March 31, 2028; Microsoft recommends transitioning image signing to Notary Project. The repository/image attribute commands are part of normal ACR programmatic operations and are not presented as requiring Premium. Registry throughput and other features still vary by SKU.

## Integrate locking into the release gate

A production release should not complete until the pipeline can prove:

1. The tag is absent from ACR and has not appeared in the authoritative release ledger.
2. Tests and required scans passed for the resolved digest.
3. The release tag resolves to the recorded digest.
4. Tag and digest attributes are locked.
5. The deployment references the recorded digest.
6. A cache-miss pull succeeds with the runtime's identity.
7. Rollback records preserve earlier locked digests.

Cleanup automation should skip locked images. The preview `acr purge` command already respects `write-enabled false`. Do not make a cleanup task unlock images to meet a storage target.

The result is straightforward: human-readable release names for operations, content-addressed deployments for consistency, and registry locks for retention. An accidental repeated `docker push` becomes a failed pipeline step instead of a silent production change.

## Official Documentation

- [Lock a container image in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-lock)
- [Recommendations for tagging and versioning container images](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-tag-version)
- [Azure CLI reference for az acr repository](https://learn.microsoft.com/en-us/cli/azure/acr/repository?view=azure-cli-latest)
- [Azure CLI reference for az acr manifest](https://learn.microsoft.com/en-us/cli/azure/acr/manifest?view=azure-cli-latest)
- [Azure Container Registry roles and permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Transition from Docker Content Trust to Notary Project](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation)
