# Validation Summary: How to Connect VMware ESXi to Ceph via iSCSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VMware ESXi (6.7+)
- Ceph iSCSI gateway
- Ceph RBD (RADOS Block Device)
- VMFS6
- esxcli CLI
- vmkfstools CLI
- iSCSI (CHAP authentication, SendTargets discovery)
- VMkernel networking (vSwitch, portgroup)

## Sources Consulted
- [Adding and Deleting Virtual Switches with ESXCLI - VMware vSphere 8.0](https://docs.vmware.com/en/VMware-vSphere/8.0/esxcli-concepts-examples/GUID-60F323EA-32A7-4E1A-B252-3A44958BA04C.html)
- [Managing Port Groups with ESXCLI - Broadcom TechDocs](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/7-0/esxcli-concepts-and-examples-7-0/managing-vsphere-networking/setting-up-vsphere-networking-with-vsphere-standard-switches/managing-port-groups-with-esxcli.html)
- [Add and Configure an IPv4 VMkernel Network Interface with ESXCLI](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/7-0/esxcli-concepts-and-examples-7-0/managing-vsphere-networking/setting-up-vsphere-networking-with-vsphere-standard-switches/adding-and-modifying-vmkernel-network-interfaces/add-and-configure-an-ipv4-vmkernel-network-interface-with-esxcli.html)
- [Set Up Software iSCSI with ESXCLI - VMware vSphere 8.0](https://docs.vmware.com/en/VMware-vSphere/8.0/esxcli-concepts-examples/GUID-8E8481F7-9506-4437-94F1-2DAEEE8A6053.html)
- [Set Up Software iSCSI with ESXCLI - Broadcom TechDocs 7.0](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/7-0/esxcli-concepts-and-examples-7-0/managing-iscsi-storage/iscsi-storage-setup-with-esxcli/set-up-software-iscsi-with-esxcli.html)
- [Setting iSCSI CHAP - Broadcom TechDocs 8.0](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/8-0/esxcli-concepts-and-examples-8-0/managing-iscsi-storage/protecting-an-iscsi-san/setting-iscsi-chap.html)
- [Scanning Storage Adapters - Broadcom TechDocs](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-sdks-tools/7-0/esxcli-concepts-and-examples-7-0/managing-storage/scanning-storage-adapters.html)
- [Manually Creating a VMFS Volume Using vmkfstools -C - Broadcom KB](https://knowledge.broadcom.com/external/article/309687/manually-creating-a-vmfs-volume-using-vm.html)
- [File System Options of vSphere vmkfstools Command - TechDocs 8.0](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage-8-0/using-vmkfstools-in-vsphere/file-system-options-of-vsphere-vmkfstools-command.html)
- [iSCSI Initiator for VMware ESX - Ceph Documentation](https://docs.ceph.com/en/reef/rbd/iscsi-initiator-esx/)

## Issues Found
- **vmkfstools disk path missing partition number**: The `vmkfstools -C vmfs6` command used `/vmfs/devices/disks/naa.XXXX` as the disk path placeholder. VMware documentation requires a partition number suffix (e.g., `:1`) when creating a VMFS filesystem. Changed the placeholder to `naa.XXXX:1` and updated the comment to say "NAA identifier" for clarity.

## Review Notes
- All 13 `esxcli` commands across networking, iSCSI, and storage namespaces were verified correct against official VMware documentation for vSphere 7.0 and 8.0.
- The CHAP authentication flags (`--level`, `--authname`, `--secret`, `--direction uni`) are all accurate per VMware's iSCSI CHAP documentation.
- The post does not show adding a physical NIC uplink to vSwitch1 (`esxcli network vswitch standard uplink add`). This is acceptable since physical NIC assignment is hardware-specific and the prerequisites mention a "Dedicated storage network."
- For production environments, configuring jumbo frames (MTU 9000) on the VMkernel adapter is a best practice for iSCSI traffic but is not required for correctness.
- The post correctly recommends two gateway addresses for path redundancy.
