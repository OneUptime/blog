# Validation Summary: Secure Calico VPP Uplink Configuration

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Calico VPP dataplane (CALICOVPP_INTERFACES ConfigMap)
- VPP (vppctl, MACIP ACL plugin, L2 features)
- DPDK with vfio-pci / uio_pci_generic kernel drivers
- Linux IOMMU (VT-d, AMD-Vi), GRUB kernel parameters, sysfs
- Kubernetes RBAC and audit policy

## Sources Consulted
- Calico VPP source — `projectcalico/vpp-dataplane/config/config.go` for the JSON schema of `CALICOVPP_INTERFACES` ([GitHub](https://github.com/projectcalico/vpp-dataplane/blob/master/config/config.go))
- Calico VPP uplink configuration docs (https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration)
- FD.io VPP L2 CLI reference (https://s3-docs.fd.io/vpp/24.02/cli-reference/clis/clicmd_src_vnet_l2.html)
- FD.io VPP Security Groups wiki for MACIP ACL syntax (https://wiki.fd.io/view/VPP/SecurityGroups)
- kernel.org `Documentation/ABI/testing/sysfs-kernel-iommu_groups` for the `type` file and valid values (DMA, DMA-FQ, identity, auto)
- kernel.org `admin-guide/kernel-parameters` for `intel_iommu` / `amd_iommu` / `iommu=pt`
- DPDK Linux Drivers guide (https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html)
- Kubernetes RBAC and audit-policy API docs

## Issues Found
1. **Wrong JSON field name in CALICOVPP_INTERFACES.** The post used `"newDriverName"`, but the Calico VPP serialized JSON tag is `"newDriver"` (the Go field is `NewDriverName`, but JSON uses `newDriver`). Changed `"newDriverName"` → `"newDriver"` in the YAML example in Security Practice 2.

2. **Wrong vppctl command for MAC filtering.** The post used `vppctl set interface l2 tag-rewrite GigabitEthernet0/0/0 pop 0` and labelled it a MAC source filter. That command performs VLAN tag rewrite on L2 subinterfaces — it does not filter MACs — and `pop 0` is not a valid documented argument (documented values are `pop 1` and `pop 2`). Replaced with the correct MACIP ACL plugin commands (`vppctl macip_acl_add ipv4 permit ...` followed by `vppctl macip_acl_interface_add_del sw_if_index <N> add acl <ACL_INDEX>`), which is the standard VPP mechanism for source-MAC filtering on an interface.

3. **Wrong sysfs path / value list for verifying IOMMU DMA protection.** The post used `/sys/bus/pci/drivers/vfio-pci/0000:00:0a.0/iommu_group/type`. The canonical, documented path per kernel.org is `/sys/kernel/iommu_groups/<group_id>/type`, reachable via the `iommu_group` symlink on the device node. Replaced the command with a `readlink` step to discover the group id and a `cat /sys/kernel/iommu_groups/<group_id>/type`. Also corrected the expected/possible values to the documented set (`DMA`, `DMA-FQ`, `identity`, `auto`); the post previously implied only `DMA` was meaningful.

## Review Notes
- GRUB parameters `intel_iommu=on iommu=pt` and `amd_iommu=on iommu=pt` are correct and remain the DPDK-recommended pair.
- The RBAC Role in Security Practice 4 grants only `get/list/watch` — modify permissions are correctly omitted; the inline comment makes that intent clear.
- The audit policy snippet is structurally valid (`audit.k8s.io/v1`, `RequestResponse` level, `update`/`patch` verbs).
- The MACIP ACL approach matches on **source MAC + source IP** simultaneously; if the user truly wants MAC-only filtering, they will need L2 classify tables + input ACL (`classify table` + `set interface l2 input acl`). This nuance is not called out in the post but is mentioned in the cited FD.io wiki.
- The post leaves the security-practice-3 mermaid diagram intact; it remains accurate as a conceptual flow even after the command correction.
