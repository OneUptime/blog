# Validation Summary: Resolve ESXi `MissingComponentError` Without Removing Required OEM Drivers

## Status
validated

## Post Type
Technical troubleshooting and upgrade guide

## Technologies Covered
- VMware ESXi 8.x
- VMware vSphere
- vSphere Lifecycle Manager (vLCM)
- VMware Update Manager (VUM)
- VMware Cloud Foundation (VCF) and SDDC Manager
- ESXCLI software and hardware inventory commands
- OEM Custom ISOs, vendor add-ons, components, and VIBs

## Sources Consulted
- [Broadcom KB 427454: VUM remediation of an ESXi host fails during SDDC Manager patching](https://knowledge.broadcom.com/external/article/427454/vum-remediation-installation-of-an-esxi.html)
- [Broadcom KB 391486: `esxcli software profile update` fails with missing reserved components](https://knowledge.broadcom.com/external/article/391486/upgrading-esxi-through-esxcli-software-p.html)
- [Broadcom KB 318690: Reserved-component and reserved-VIB metadata behavior in a different ESXi defect](https://knowledge.broadcom.com/external/article/318690/cannot-find-vibs-on-running-esxcli-softw.html)
- [Broadcom ESXCLI software command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_software.html)
- [Broadcom ESXCLI network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom ESXCLI storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [Broadcom ESXCLI hardware command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_hardware.html)
- [Broadcom KB 341609: Conditions for upgrading an ESXi host deployed with a custom image](https://knowledge.broadcom.com/external/article/341609/conditions-for-deploying-and-upgrading-a.html)
- [Broadcom KB 366685: VMware vSphere downloads, OEM Custom ISOs, patches, and add-ons](https://knowledge.broadcom.com/external/article/366685/vmware-vsphere-downloads-oem-custom-imag.html)
- [Broadcom documentation: Upgrade Hosts Interactively](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/esx-upgrade/upgrading-esxi-hosts-upgrade/upgrade-or-migrate-hosts-interactively-upgrade.html)
- [Broadcom KB 392956: Preserve a VMFS datastore during an ESXi upgrade or installation](https://knowledge.broadcom.com/external/article/392956/how-to-preserve-vmfs-datastore-while-upg.html)
- [Broadcom KB 313510: Back up and restore ESXi host configuration](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Broadcom documentation: Working with the vSphere Lifecycle Manager depot](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/managing-host-and-cluster-lifecycle-8-0/working-with-vsphere-lifecycle-manager-depots/updating-the-vlcm-depot.html)
- [Broadcom KB 392404: VIB or plug-in removal during vLCM single-image remediation](https://knowledge.broadcom.com/external/article/392404)
- [Broadcom KB 316592: Reverting to a previous ESXi version](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html)
- [Broadcom KB 376175: Rollback availability and `altbootbank`](https://knowledge.broadcom.com/external/article/376175/unable-to-rollback-esxi-version-as-bootb.html)
- [Broadcom KB 312082: Scope of the vLCM host hardware-device validation precheck](https://knowledge.broadcom.com/external/article/312082/unknown-status-for-vlcm-host-hardware-de.html)
- [Broadcom KB 397618: Firmware compatibility checks and Hardware Support Manager requirements](https://knowledge.broadcom.com/external/article/397618)
- [Broadcom KB 436400: SDDC Manager ESXi image selection and the VCF bill of materials](https://knowledge.broadcom.com/external/article/436400/imported-esxi-image-is-not-selectable-as.html)
- [Broadcom Compatibility Guide](https://compatibilityguide.broadcom.com/)

## Issues Found
- The introduction combined two separate documented conditions into one claim: KB 391486 confirms that the named VIBs can still be installed, while KB 427454 attributes another failure to missing or corrupt reserved-component metadata. The text now distinguishes those cases.
- The KB 427454 discussion implied that `MissingComponentError` was the direct VUM/SDDC Manager UI error and described the lack of a resolution as “no in-place resolution.” The text now explains that the underlying error is reported by an offline-bundle dry run and accurately states that the KB provides no direct metadata repair procedure, only an interactive ISO-upgrade workaround.
- The post asserted that reserved-component metadata must match an exact hardware-specific component set. Broadcom does not document that rationale, and reserved-component metadata is not a physical-hardware inventory. The text now limits the warning to the documented fact that KB 427454 provides no manual reconstruction or copying procedure.
- The ISO workaround was described as definitively rebuilding or repairing the image metadata. KB 427454 calls it a workaround but does not make that implementation claim. The text now says that the installer performs the upgrade and that an appropriate OEM Custom ISO supplies compatible vendor components.
- The pre- and post-upgrade command sets described inventorying and comparing storage paths but listed only the storage-adapter command. `esxcli storage core path list` was added to both command sets so the captured baseline includes the actual storage paths.
- vLCM hardware-compatibility coverage depends on the cluster and Hardware Support Manager configuration. The desired-image checklist now says to run the applicable hardware-compatibility checks rather than implying that every check is available in every cluster.

## Review Notes
All listed ESXi 8.x commands are valid and current. The vLCM workflow, OEM image/add-on guidance, VMFS preservation warning, configuration-backup advice, and single-previous-image `altbootbank` rollback limitation are consistent with Broadcom documentation. KB 427454 is specifically framed around an SDDC Manager/VUM remediation failure, so matching the complete error and workflow before using its workaround remains important. All six official-documentation links in the post resolved successfully; the vLCM depot link redirects to its current canonical path.
