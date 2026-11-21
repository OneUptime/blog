# Reclaim Distribution Registry Space Without Racing Active Uploads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Container Registry, Storage, Maintenance

Description: Separate manifest deletion from blob reclamation, stop all registry writers, review a garbage-collection dry run, and verify retained images before reopening pushes.

Deleting an old registry tag does not necessarily release the storage occupied by its layers. Layers can be shared by other images, and removing a manifest reference is different from reclaiming the underlying content. Running cleanup while uploads continue can turn a disk-space problem into missing image data.

This guide uses **Distribution3.1.2** and a normal push/pull registry. Rehearse the procedure against a restored staging copy before applying it to production. Keep a verified recovery path and an explicit list of content that must remain available.

## Understand the two operations

The registry API removes a selected manifest reference. Garbage collection later scans stored manifests, marks the content they reference, and removes eligible unreferenced content. A shared layer remains necessary while a retained manifest references it.

```mermaid
flowchart LR
    R[Approved retention decision] --> D[Delete selected manifest references]
    D --> Q[Stop writers on every replica]
    Q --> P[Review garbage-collection dry run]
    P --> G[Run one coordinated collector]
    G --> V[Verify retained images and artifacts]
    V --> W[Resume controlled writes]
```

The [garbage-collection documentation](https://distribution.github.io/distribution/about/garbage-collection/) explains the mark-and-sweep process and the need for a stopped or read-only registry. Do not remove files directly from the blob directories to approximate the same result.

Deleting an old image that shares most layers with current releases may reclaim little space. Estimate savings from the candidate content, not from the sum of image sizes displayed by a client.

## Decide what must survive before deleting anything

Create a retained-digest inventory covering deployed releases, rollback versions, multi-platform image indexes, their platform manifests, signatures, and software bills of materials. A software bill of materials, or SBOM, records components associated with an artifact.

A digest used by a workload may have no human-friendly tag. Likewise, an image index can refer to platform manifests that do not have individual tags. Treating every untagged manifest as abandoned is not a safe default.

Separate the retention decision from the garbage collector. The collector cannot know which release your deployment team needs for rollback. Freeze concurrent publication and retention automation during the maintenance window so the candidate set does not change underneath the review.

## Resolve the intended manifest digest

For a registry using basic authentication, an authorized operator can inspect a staging candidate without printing a password in command arguments:

```bash
curl --fail --silent --show-error --head \
  --cacert /protected/registry-ca.pem \
  --user maintenance-user \
  --header 'Accept: application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json' \
  https://registry.example.internal/v2/team/widget/manifests/old-release
```

Review `Docker-Content-Digest` and `Content-Type` from the response. Preserve the representation requested and confirm whether you selected an index or a single-platform manifest. Use the registry's normal bearer-token workflow instead if it does not support basic authentication.

The [HTTP API reference](https://distribution.github.io/distribution/spec/api/#deleting-an-image) defines manifest deletion by digest. Do not treat deleting that digest as removing only one tag alias: other references to the same manifest can be affected.

With deletion enabled, the approved staging deletion has this shape:

```bash
curl --fail --silent --show-error --include \
  --cacert /protected/registry-ca.pem \
  --user maintenance-user \
  --request DELETE \
  'https://registry.example.internal/v2/team/widget/manifests/sha256:APPROVED_MANIFEST_DIGEST'
```

Replace the placeholder only with the reviewed digest, after checking all retained references and the recovery copy. An accepted deletion normally returns202. This is a destructive API operation; it is not a preview and should not be run against a guessed candidate.

## Close the write boundary across every replica

Perform approved API deletions before switching the registry into read-only mode. Merge this setting into each replica's existing configuration:

```yaml
storage:
  maintenance:
    readonly:
      enabled: true
```

Preserve the existing storage-driver settings. Roll out the change through the normal deployment mechanism, or stop every registry process accessing the store. The [3.1.2 handler initialization](https://github.com/distribution/distribution/blob/v3.1.2/registry/handlers/app.go) reads the maintenance setting when the application is constructed; editing a mounted file alone does not establish that all running processes changed mode.

Account for background importers, replication jobs, pull-through instances, and direct storage writers. Blocking pushes at one load balancer is insufficient if another endpoint or process can still write to the same store. Ensure old instances have drained and exited where required.

Use a dedicated staging upload attempt to verify that writes are rejected, while approved retained reads still work. Do not infer read-only status from a successful `/v2/` health response.

## Review the collector against the exact storage target

Use the matching Distribution3.1.2 binary and the complete reviewed maintenance configuration, with the same storage endpoint, bucket or filesystem root, and credentials as the intended registry store:

```bash
registry garbage-collect --dry-run /protected/registry-maintenance.yml
```

Run this first against the staging recovery copy. The dry run reports candidates without reclaiming them. Preserve its output privately and investigate unexpected manifest or blob digests. Check errors and process exit status; a partial scan is not an approved deletion plan.

The [tagged command definition](https://github.com/distribution/distribution/blob/v3.1.2/registry/root.go) supplies the supported flags. This procedure deliberately omits `--delete-untagged`: adding it changes manifest-retention behavior and requires a separate review of digest-pinned images, image-index references, and associated artifacts.

A dry run does not reserve the candidate set. Keep writers stopped between review and execution. Run one coordinated collector for the shared store, not one per registry replica.

## Reclaim only after the review passes

After the rehearsed dry run, retained-content review, backup verification, and confirmed write stop, the actual collection command is:

```bash
registry garbage-collect /protected/registry-maintenance.yml
```

This command deletes eligible content. Monitor completion and storage errors. If it fails, keep the maintenance boundary in place while diagnosing the failure; do not immediately reopen writers and repeat cleanup blindly.

Filesystem free space and object-storage billing can behave differently. Snapshots, versioned objects, and backend retention rules can retain bytes after registry-level removal. Measure the storage backend separately from the registry's logical candidate count.

## Verify before reopening publication

From a clean client, pull retained image digests for each required platform. Check signature and SBOM discovery with the tools used by your release process. Confirm known deleted candidates are unavailable and that retained references still resolve.

Restore normal service configuration only after those checks pass. Permit controlled test writes, push and pull a dedicated test image, then resume ordinary publishers and retention jobs. Record the deleted manifest digests, collector version, configuration revision, errors, and measured space change.

Local validation ran selected Distribution3.1.2 storage tests covering no-effect collection, dry-run behavior, shared-layer preservation, and a tagged index with untagged child manifests. These are test-store checks, not a production cleanup rehearsal. No real registry deletion or storage reclamation was performed.
