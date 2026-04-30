# Validation Summary: How to Live Migrate VMs in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes
- Virtual machine live migration
- Longhorn-backed VM storage
- Multus-backed VM migration networking
- `kubectl`
- `virtctl`

## Sources Consulted
- Harvester live migration documentation: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- Harvester VM migration network documentation: https://docs.harvesterhci.io/v1.7/advanced/vm-migration-network/
- Harvester settings reference (`vm-migration-network`): https://docs.harvesterhci.io/v1.7/advanced/index/
- KubeVirt live migration user guide: https://kubevirt.io/user-guide/compute/live_migration/
- KubeVirt `virtctl` client documentation: https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/
- KubeVirt VM access and `virtctl console` documentation: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt CRD definition (`KubeVirt` kind and resource names): https://raw.githubusercontent.com/kubevirt/kubevirt/main/manifests/generated/kv-resource.yaml
- KubeVirt `virtctl` command registration (`migrate` and `migrate-cancel`): https://raw.githubusercontent.com/kubevirt/kubevirt/main/pkg/virtctl/root.go

## Issues Found
- The migratability check used `jsonpath` output piped to `jq`, which is not reliable for object output. I changed it to `-o json | jq ...` and corrected the explanation to use the condition's `.status`, `.reason`, and `.message`.
- The non-migratable VM criteria were incomplete. I updated the bullets to match current Harvester behavior, including `CD-ROM`, `Container Disk`, single-replica `ReadWriteOnce` volumes, node scheduling constraints, and CPU pinning caveats.
- The UI migration flow was inaccurate. Harvester currently requires selecting a target node and clicking **Apply**; it does not simply auto-select a destination and start immediately.
- The `virtctl migration-info` command is not part of the current documented `virtctl` command set. I replaced it with supported `kubectl`-based migration state inspection.
- The monitoring command used the wrong resource name (`vmsimigration`). I corrected it to the supported `vmim` resource alias.
- The dedicated migration network section was using a direct KubeVirt `ConfigMap`/manual `NetworkAttachmentDefinition` workflow that Harvester explicitly advises against. I replaced it with Harvester's supported `vm-migration-network` setting workflow.
- The cancellation and post-migration validation text included misleading claims. I changed the abort check to verify the actual current node after the abort request, and I corrected the `virtctl console` note so it reflects serial-console access rather than "checking logs" or validating memory corruption.
- The performance and monitoring snippets also used `jsonpath` object output with `jq`. I converted those to valid `-o json | jq ...` commands and made the KubeVirt patch examples use the explicit `kubevirts.kubevirt.io` resource name.

## Review Notes
Validated against Harvester v1.7, which is the latest stable Harvester documentation version available on April 30, 2026. In KubeVirt environments with restricted RBAC, creating `VirtualMachineInstanceMigration` objects may require explicit permissions for namespace administrators; that is a deployment-specific caveat rather than a correctness issue in the revised post.
