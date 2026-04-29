# Validation Summary: How to Configure Longhorn V2 Data Engine - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Longhorn V2 Data Engine
- SPDK
- NVMe/TCP
- Kubernetes
- Kubernetes StorageClass and PersistentVolumeClaim APIs
- HugePages

## Sources Consulted
- Longhorn V2 Data Engine prerequisites: https://longhorn.io/docs/1.11.1/v2-data-engine/prerequisites/
- Longhorn V2 Data Engine quick start: https://longhorn.io/docs/1.11.1/v2-data-engine/quick-start/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn setting updates via `kubectl`: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn storage class parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Official Longhorn V2 StorageClass example: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/examples/v2/storageclass.yaml
- Official Longhorn V2 PVC/Pod example: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/examples/v2/pod_with_pvc.yaml
- Longhorn important notes: https://longhorn.io/docs/latest/important-notes/
- Longhorn release history: https://github.com/longhorn/longhorn/wiki/Release-History
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The introduction and prerequisites mixed historical and current guidance. I updated the intro to note that V2 was introduced experimentally in Longhorn v1.5, corrected the kernel baseline from `5.15+` to `5.19+` with `6.7+` recommended, corrected the hugepage requirement to 2 GiB of 2 MiB pages, and listed the current required kernel modules from the official prerequisites.
- The prerequisites omitted a critical requirement that V2 replicas run on Longhorn `block-type` disks. I added that requirement and reflected it in the node configuration step.
- The node preparation commands were inaccurate for current Longhorn guidance. The post loaded `uio` instead of `vfio_pci`, omitted `vfio_pci`, and used incomplete persistence commands. I replaced them with the SPDK-related modules documented by Longhorn and added a persistent module-load example.
- The hugepages setup used only a sysctl path and an invalid Kubernetes node annotation. Longhorn’s current docs recommend persistent hugepage allocation via kernel boot parameters and verification through the Kubernetes `hugepages-2Mi` resource. I replaced the annotation and systemd-unit approach with the documented verification flow and kept the current-boot allocation step in Step 1.
- The node configuration section did not correctly show how V2 disks are added to Longhorn. I replaced it with a `node.longhorn.io` edit example using `diskType: block` and added the `wipefs` step required when a block device already contains a filesystem or partition table.
- The Longhorn setting commands used `setting.longhorn.io`. I updated them to `settings.longhorn.io`, which is the explicit resource form Longhorn recommends for CLI use.
- The StorageClass example contained an unsupported `backendStoreDriver` field and treated `diskSelector: "nvme"` as if it were part of enabling V2. I replaced the snippet with supported Longhorn V2 StorageClass fields based on the official example and current StorageClass parameter reference.
- The PVC example used the `database` namespace without creating it, while the later benchmark pod did not use the same namespace. I removed the undeclared namespace so the example works as written.
- The verification step used `kubectl get lhvolume`, which is not the documented resource form used in current Longhorn docs. I changed it to `kubectl get volume <volume-name> -n longhorn-system`.
- The benchmark example was not runnable because the `kubectl run ... fio` command never mounted the PVC, so `/data/test` would not be backed by the Longhorn volume. I replaced it with a pod manifest that mounts the claim and runs a simple write-throughput check against `/data`.
- The best-practices section understated the current release caveat. I updated it to reflect that V2 remains a Technical Preview feature and that production use should be gated by release-specific validation.

## Review Notes
- Longhorn’s current documentation still classifies V2 Data Engine as a Technical Preview feature, even though it is substantially more mature than when it first appeared in v1.5. Readers should verify supported functionality for their exact Longhorn version before using it in production.
- The current prerequisites also document IOMMU and VFIO constraints for some NVMe devices. The post does not cover that hardware-specific edge case, but the core setup steps are now aligned with the official quick-start and prerequisites.
- The performance-verification step now performs a simple PVC-backed throughput smoke test instead of a full fio-based IOPS benchmark. This change was necessary because the original fio command did not actually exercise the PVC it had just created.
