# Validation Summary: How to Configure iSCSI Port Binding and Round-Robin Multipathing on ESXi

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered

- VMware ESXi 7.x and 8.x
- VMware vSphere Client 8
- Software iSCSI initiator and target discovery
- VMkernel networking and standard vSwitches
- Software-iSCSI network port binding
- VMware Native Multipathing Plug-in (NMP)
- Storage Array Type Plug-ins (SATP) and Path Selection Plug-ins (PSP)
- `VMW_PSP_RR` Round Robin multipathing
- ALUA and active/passive storage arrays
- ESXCLI and `vmkping`

## Sources Consulted

- [VMware vSphere 8.0 product documentation (PDF), including vSphere Storage](https://techdocs.broadcom.com/content/dam/broadcom/techdocs/us/en/pdf/vmware/vsphere/vsphere/vmware-vsphere-8-0.pdf)
- [Configuring iSCSI port binding with multiple NICs in one vSwitch for VMware ESXi](https://knowledge.broadcom.com/external/article/323116)
- [Considerations for using software iSCSI port binding in ESXi](https://knowledge.broadcom.com/external/article/317719)
- [Following upgrade from ESXi 7.0.x to 8.0.x, iSCSI datastores are not mounted](https://knowledge.broadcom.com/external/article/376716)
- [ESXi Hosts intermittently disconnecting from vCenter when using iSCSI port binding](https://knowledge.broadcom.com/external/article/421153)
- [Step-by-Step to Configure iSCSI Datastores on ESXi](https://knowledge.broadcom.com/external/article/410819)
- [Testing VMkernel network connectivity with the vmkping command](https://knowledge.broadcom.com/external/article/344313)
- [ESXCLI Command Reference: `esxcli network` commands](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [ESXCLI Command Reference: `esxcli iscsi` commands](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_iscsi.html)
- [ESXCLI Command Reference: `esxcli storage` commands](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [VMware Multipathing policies in ESXi/ESX](https://knowledge.broadcom.com/external/article/339621)
- [Modifying path information for ESXi hosts](https://knowledge.broadcom.com/external/article/323133)
- [Adjusting Round Robin IOPS limit from default 1000 to 1](https://knowledge.broadcom.com/external/article/323117)
- [Unbalanced storage controller traffic and Round Robin multipathing configuration for ESXi hosts](https://knowledge.broadcom.com/external/article/452961)
- [Storage Configuration Should Be Consistent Throughout Cluster](https://knowledge.broadcom.com/external/article/317694)
- [Permanent Device Loss (PDL) and All-Paths-Down (APD) on host](https://knowledge.broadcom.com/external/article/318712)
- [End of General Support for vSphere 7.0](https://knowledge.broadcom.com/external/article/415405)

## Issues Found

- The introduction described Round Robin as the NMP policy applied to every discovered device. Changed it to identify `VMW_PSP_RR` as one NMP path selection policy configured per NMP-controlled device; HPP- and third-party-controlled devices do not use NMP PSP commands.
- The topology section stated too broadly that port binding must not be used when target portals are in another subnet. The vSphere Storage guide documents supported routed port-binding designs in vSphere 6.5 and later. Reworded the restriction so it still excludes bound VMkernel adapters that span subnets or broadcast domains, while acknowledging routed target-portal designs as a separate, out-of-scope configuration.
- The topology did not state the all-to-all reachability requirement. Added that every configured target portal must be reachable from every bound VMkernel adapter, and clarified that every source interface must be tested against every target portal. Without this property, ESXi 8.x can fail to create sessions or mount the datastore.
- The prerequisites did not explicitly exclude the Management traffic service from the dedicated, same-subnet VMkernel adapters used for iSCSI binding. Added that restriction because Broadcom documents the combined configuration as unsupported and associates it with intermittent vCenter disconnections.
- The version statement called the vSphere 8 client "current" and did not mention that ESXi 7.x was already outside General Support on the post date. Removed the ambiguous "current" wording and added the October 2, 2025 End of General Support date.
- The vSphere Client multipathing step compressed the UI path into `Properties > Edit Multipathing`. Updated it to the documented sequence: open the Properties tab, scroll to Multipathing Policies, and click Edit Multipathing.
- The `IOPS=1` warning described the setting only as vendor-required. Broadcom also documents vendor-recommended use, so the wording now covers environments where the storage vendor recommends or requires the adjustment.
- The failure-test guidance could be read as permitting array-side LUN removal. Added an explicit warning not to unmap, delete, or power off the LUN as a failover test because doing so can cause APD or PDL rather than a controlled single-path failure.

## Review Notes

- All shown ESXCLI commands, namespaces, device filters, and flags are valid in the current command reference and appropriate for ESXi 7.x/8.x NMP-controlled devices.
- The one-VMkernel-per-uplink design, one unique Active uplink with all others Unused, same-vSwitch requirement, separate-vSwitch guidance for multiple iSCSI VLANs, and prohibition on LACP/link aggregation are correct for this same-subnet port-binding procedure.
- The Round Robin explanation is correct: it rotates among eligible paths; ALUA uses active-optimized paths by default; and an active/passive array can legitimately expose only active-controller paths as working paths.
- The basic `vmkping -I` examples validate source-interface reachability, as the post states. A future enhancement could show `-d` and an explicit payload size for direct jumbo-frame MTU validation.
- All five Broadcom documentation links already included in the post returned HTTP 200 and matched their stated subjects.
- ESXi 9.x is intentionally outside the stated 7.x/8.x scope. ESXi 7.x remains technically covered by the procedure, but its End of General Support status is now explicit.
