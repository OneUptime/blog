# Validation Summary: How to Configure Longhorn Backing Image - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Longhorn
- Kubernetes
- Longhorn `BackingImage` CRD
- Kubernetes `StorageClass` and `PersistentVolumeClaim`
- Harvester
- Ubuntu cloud images

## Sources Consulted
- Longhorn Backing Image documentation: https://longhorn.io/docs/1.11.0/advanced-resources/backing-image/backing-image/
- Longhorn StorageClass parameters reference: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn `BackingImage` API type definitions (official source): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/pkg/apis/longhorn/v1beta2/backingimage.go
- Longhorn StorageClass template (official source): https://raw.githubusercontent.com/longhorn/longhorn/master/chart/templates/storageclass.yaml
- Longhorn CRD definitions (official source): https://raw.githubusercontent.com/longhorn/longhorn/master/chart/templates/crds.yaml
- Longhorn API model and routing for backing image creation/upload (official source): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/api/model.go
- Longhorn API forwarding logic for backing image upload (official source): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/api/forwarder.go
- Harvester Upload Images documentation: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Ubuntu Jammy cloud image URL verified: https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

## Issues Found
1. **Backing image storage model was described too loosely.** Changed "stored as a set of replicas" to "stored on Longhorn disks" and clarified that the backing image becomes the initial snapshot for the volume. Longhorn models backing-image files separately from volume replicas.

2. **Checksum example format was wrong.** Changed `checksum: "sha512:abc123..."` to a plain SHA-512 hex placeholder. Longhorn expects the whole-file SHA-512 digest, not a `sha512:`-prefixed value.

3. **The `kubectl` resource name was incorrect.** Replaced `lhbackingimage` with `backingimage`. The official CRD short name is `lhbi`; `lhbackingimage` is not defined.

4. **The download monitoring command was misleading.** Replaced the watch example with `kubectl describe backingimage ...` so the post points readers to the object status that actually exposes per-disk state/progress details.

5. **The local upload section mixed UI guidance with an incomplete API example.** Removed the `curl` example because it only created the backing image object and did not perform the required second file-upload request. Updated the text to the documented UI flow and corrected the supported formats to RAW/QCOW2 rather than RAW/QCOW2/ISO.

6. **The StorageClass example used unsupported fields.** Removed `backingImageURL` and the empty checksum placeholder from the StorageClass example. For an existing backing image, the supported parameter is `backingImage`; on-demand creation uses `backingImageDataSourceType` and `backingImageDataSourceParameters`.

7. **"Replicas" terminology was inaccurate for Step 4.** Renamed the section to "Manage Backing Image Copies" because Longhorn tracks backing-image copies/files on disks, not volume replicas.

8. **Harvester UI wording was off.** Changed the Harvester instructions from `Images > Import` to the current Images-page wording used in Harvester documentation, while keeping the underlying claim that Harvester manages the backing-image creation for imported VM images.

## Review Notes
- The example Ubuntu URL resolved successfully on 2026-04-29, but it is a rolling `current` URL. A version-pinned image URL plus a real checksum would be more stable for long-lived documentation.
- Longhorn's current documentation is slightly inconsistent here: the StorageClass reference page names the field `backingImageName`, while the shipped chart template and API constants use `backingImage`. The post now uses `backingImage`, which matches the current implementation and chart template.
