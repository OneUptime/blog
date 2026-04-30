# Validation Summary: How to Upload VM Images to Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- `kubectl`
- Virtual machine image management
- Longhorn-backed image storage
- Shell scripting with `bash` and `curl`

## Sources Consulted
- Harvester Upload Images: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester Create a Namespaced Virtual Machine Image API: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-image/
- Harvester Export a Volume to Image: https://docs.harvesterhci.io/v1.7/volume/export-volume/
- Harvester `VirtualMachineImage` type definition: https://github.com/harvester/harvester/blob/master/pkg/apis/harvesterhci.io/v1beta1/image.go
- Harvester image state transitions and conditions: https://github.com/harvester/harvester/blob/master/pkg/image/common/operator.go
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl proxy` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Ubuntu cloud image release directory: https://cloud-images.ubuntu.com/releases/jammy/release/
- Ubuntu cloud image release directory: https://cloud-images.ubuntu.com/releases/focal/release/
- Debian Bookworm cloud image directory: https://cloud.debian.org/images/cloud/bookworm/20260413-2447/
- Rocky Linux 9 image directory: https://download.rockylinux.org/pub/rocky/9/images/x86_64/

## Issues Found
- The `kubectl` YAML example used `metadata.annotations.harvesterhci.io/imageDisplayName` instead of the required `spec.displayName`. I replaced it with `spec.displayName` because Harvester validates `displayName` as a required field on `VirtualMachineImage`.
- The API section claimed local-file uploads were done through a direct Harvester API script, but the published Harvester docs document API-based image creation for URL imports, not that local-file workflow. I replaced the broken script with a documented `curl` example that creates a `VirtualMachineImage` through the Kubernetes API.
- The post used mutable Ubuntu `current/` URLs and batch examples that depended on mutable `current` or `latest` image paths. I replaced them with fixed release URLs because Harvester explicitly warns against mutable image URLs for Longhorn-backed self-healing scenarios.
- The batch script and readiness notes treated `Initialized=True` as the ready state. I changed them to `Imported=True` because Harvester marks images as initialized before the import is complete, while `Imported=True` is the completed state.
- The troubleshooting `kubectl run` example omitted `--restart=Never`, which is recommended for one-shot diagnostic pods with current `kubectl`. I added it.
- The CDI controller log check was presented as a general troubleshooting step even though Harvester's default image backend is not always CDI. I qualified that command so it is only suggested when the CDI backend is in use.

## Review Notes
- Validated against Harvester v1.7 documentation and source as of April 30, 2026.
- The Harvester CRD currently supports additional `sourceType` values such as `restore` and `clone`, but those workflows are outside the scope of this post.
