# Validation Summary: How to Optimize Harvester for Production - Optimization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Longhorn
- KubeVirt
- Kubernetes
- `kubectl`
- Harvester `CloudInit` CRD
- Harvester cluster networks and VM networks

## Sources Consulted
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Update Configuration After Installation: https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester Configuration (`os.sysctls`): https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Host Management and Cloud-Native Node Configuration: https://docs.harvesterhci.io/v1.7/host/
- Harvester Settings reference: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Resource Overcommit: https://docs.harvesterhci.io/v1.7/vm/resource-overcommit/
- Harvester VM Migration Network: https://docs.harvesterhci.io/v1.7/advanced/vm-migration-network
- Harvester Cluster Network: https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester Live Migration: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- Longhorn Settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn Customizing Default Settings: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- KubeVirt Resources Requests and Limits: https://kubevirt.io/user-guide/compute/resources_requests_and_limits/

## Issues Found
- The hardware table understated Harvester's current production minimums. I updated RAM from `32GB` to `64GB`, storage from a generic `SATA SSD` recommendation to Harvester's documented local SSD/NVMe capacity and IOPS guidance, and networking from `1Gbps` to `10Gbps Ethernet`.
- The OS tuning step wrote directly to `/etc/sysctl.d`. I replaced it with a `CloudInit` resource that uses `os.sysctls`, because Harvester's OS is immutable and runtime file edits are not the supported way to make these settings persist across reboots.
- The Longhorn commands used `setting.longhorn.io`. I changed them to `settings.longhorn.io`, which matches Longhorn's documented CRD resource name for `kubectl` operations.
- The network separation section pointed readers to `Hosts > [Node] > Network Config` and used generic VLAN labels. I corrected this to Harvester's current `Cluster Networks` and `VM Networks` model and named the documented `storage-network` and `vm-migration-network` settings used for traffic isolation.
- The overcommit example patched the KubeVirt CR directly and claimed `cpuAllocationRatio: 10` meant `2x` CPU overcommit. I replaced it with Harvester's supported `overcommit-config` setting. The original claim was incorrect because KubeVirt documents `cpuAllocationRatio` `10` as requesting `1/10` CPU per vCPU.
- The live migration tuning step patched KubeVirt migration settings directly. I replaced it with Harvester's supported `vm-migration-network` setting, which Harvester documents for isolating migration traffic and explicitly recommends instead of configuring KubeVirt directly.
- The production checklist and best-practice wording included a few overbroad claims. I aligned them with current Harvester documentation by changing the blanket `25Gbps+` checklist item to `10Gbps+`, making SR-IOV/VT-d conditional, and replacing the non-documentation term `built-in drain workflow` with Harvester's `Maintenance Mode` terminology.

## Review Notes
- The recommended `25Gbps` management and storage networking guidance remains more aggressive than Harvester's documented production minimum of `10Gbps`, but it is still reasonable as production-oriented guidance.
- The `CloudInit` example makes the sysctl settings persistent, but the affected nodes still need to be rebooted for Elemental to apply the configuration at boot.
- Longhorn's `priority-class` setting only applies to system-managed components. User-deployed Longhorn components must be configured separately if you need matching priority behavior.
