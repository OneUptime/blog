# Validation Summary: How to Manage VM Images in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- `kubectl`
- Longhorn
- KubeVirt
- `jq`
- `curl`

## Sources Consulted
- Harvester docs: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester docs: https://docs.harvesterhci.io/v1.7/volume/export-volume/
- Harvester docs: https://docs.harvesterhci.io/v1.7/volume/create-volume/
- Harvester API reference: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-image/
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/image.go
- Harvester source: https://github.com/harvester/harvester/blob/master/deploy/charts/harvester-crd/templates/harvesterhci.io_virtualmachineimages.yaml
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/api/image/formatter.go
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/api/image/schema.go
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/server/router.go
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/image/common/operator.go
- Harvester source: https://github.com/harvester/harvester/blob/master/pkg/image/common/validator.go
- Ubuntu cloud images: https://cloud-images.ubuntu.com/releases/
- Debian cloud images: https://cloud.debian.org/images/cloud/
- CentOS Stream cloud images: https://cloud.centos.org/centos/9-stream/x86_64/images/
- Rocky Linux cloud images: https://download.rockylinux.org/pub/rocky/9/images/x86_64/

## Issues Found
- The URL-import YAML used `harvesterhci.io/imageDisplayName` as an annotation, but current Harvester requires `spec.displayName`. I moved the display name into `spec`.
- The status-check example read `.status.storageClassName` while claiming it showed readiness. I replaced it with a check against the `Imported` condition and added a `kubectl wait --for=condition=Imported=True` example.
- The import example described phases ending in `Active`, which does not match the current CRD status model exposed through `kubectl`. I replaced that with the supported condition-based readiness check.
- The local-file upload example depended on `.status.uploadURL`, which is not part of the current `VirtualMachineImage` schema. I corrected the workflow to use Harvester’s upload action on the image resource, which is how the current Harvester API implementation handles uploads.
- The Ubuntu examples used moving `.../current/...` URLs. Harvester’s official docs warn against using changing URLs for backing images because re-downloads can fail self-healing with checksum mismatches. I replaced those with stable release URLs.
- The post described images as Longhorn volumes. Current Harvester terminology and implementation use Longhorn backing images by default, so I corrected that wording.
- The delete pre-check looked for PVC `.spec.dataSource.name`, which is not how Harvester tracks image-derived volumes in current docs and implementation. I changed the example to check the `harvesterhci.io/imageId` annotation instead.
- One shell command block under the labels section was marked as YAML. I corrected the fence to `bash`.

## Review Notes
- The local-file upload API flow is supported by Harvester’s current API implementation, but the v1.7 user docs primarily document local-file uploads through the UI. The corrected example was validated against Harvester’s official source code.
- The Debian, CentOS Stream, and Rocky Linux URLs in the post were reachable on April 30, 2026, but some upstream catalogs still use moving `latest` aliases. Pinned release URLs are safer for long-lived Harvester image libraries.
